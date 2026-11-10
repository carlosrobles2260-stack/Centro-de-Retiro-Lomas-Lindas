import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { dinero, fecha, Badge } from '../lib/format.jsx';

const PUESTO = { domestica: 'Empleada doméstica', jardinero: 'Jardinero', cuidador: 'Cuidador', motorista: 'Motorista', otro: 'Otro' };
const CATEGORIA_DOC = {
  estatutos: 'Estatutos',
  reglamento_interno: 'Reglamento interno',
  convivencia: 'Normas de convivencia',
  medio_ambiente: 'Medio ambiente',
  resoluciones: 'Resoluciones de la Directiva',
  resoluciones_asamblea_ordinaria: 'Resoluciones de Asamblea Ordinaria',
  resoluciones_asamblea_extraordinaria: 'Resoluciones de Asamblea Extraordinaria',
  elecciones: 'Elecciones',
  otra: 'Otras normas',
};
const ORDEN_CAT = Object.keys(CATEGORIA_DOC);

// Agrupa los documentos por categoría, respetando el orden de CATEGORIA_DOC.
function agruparDocumentos(docs) {
  const mapa = new Map();
  for (const d of docs) {
    const k = d.categoria || 'otra';
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(d);
  }
  const pos = (k) => { const i = ORDEN_CAT.indexOf(k); return i < 0 ? 99 : i; };
  return [...mapa.entries()].sort((a, b) => pos(a[0]) - pos(b[0]));
}

// Enlace al documento de Estatutos publicado (archivo o enlace), si existe.
function estatutoHref(docs) {
  const d = docs.find((x) => x.categoria === 'estatutos' && (x.archivo || x.enlace));
  return d ? (d.archivo || d.enlace) : null;
}

// Una categoría plegable: al presionar lista sus documentos, con filtro por
// año e indexados por la fecha del acta (más reciente primero).
function GrupoCategoria({ categoria, docs, fundamento, estatutoHref }) {
  const [abierto, setAbierto] = useState(false);
  const [anio, setAnio] = useState('');
  const anios = [...new Set(docs.map((d) => (d.fecha || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const lista = docs
    .filter((d) => !anio || (d.fecha || '').slice(0, 4) === anio)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  return (
    <div className="mc-cat card">
      <button type="button" className="mc-cat-cab" onClick={() => setAbierto((v) => !v)}>
        <span className="mc-cat-nom">{CATEGORIA_DOC[categoria] || 'Normas'}</span>
        <span className="mc-cat-meta">{docs.length} documento{docs.length === 1 ? '' : 's'} <span className="mc-cat-flecha">{abierto ? '▲' : '▼'}</span></span>
      </button>
      {abierto && (
        <div className="mc-cat-cuerpo">
          {categoria !== 'estatutos' && fundamento && (
            <div className="mc-fundamento">
              <strong>Fundamento:</strong> {fundamento}
              {estatutoHref && <> · <a href={estatutoHref} target="_blank" rel="noreferrer">Ver estatutos</a></>}
            </div>
          )}
          {anios.length > 1 && (
            <div className="mc-cat-filtro">
              <label>Año:</label>
              <select value={anio} onChange={(e) => setAnio(e.target.value)}>
                <option value="">Todos</option>
                {anios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          {lista.map((d) => {
            const destino = d.archivo || d.enlace;
            return (
              <div key={d.id} className="mc-doc-item">
                <div className="mc-doc-tit">{d.titulo}</div>
                {d.fecha && <div className="mc-doc-fecha">{fecha(d.fecha)}</div>}
                {d.descripcion && <div className="mc-doc-desc">{d.descripcion}</div>}
                <div className="mc-doc-acc">
                  {destino && <a className="mc-doc-link" href={destino} target="_blank" rel="noreferrer">Ver documento</a>}
                  {d.contenido && (
                    <details>
                      <summary>Leer</summary>
                      <div className="mc-doc-texto">{d.contenido}</div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Pase de acceso del propietario: QR dinámico que se renueva solo (una captura
// de pantalla caduca). Se presenta en el portón para levantar la barrera.
function PaseAcceso() {
  const [pase, setPase] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () => api.get('/acceso/mi-qr')
      .then((p) => { if (vivo) { setPase(p); setError(null); } })
      .catch((e) => { if (vivo) setError(e.message); });
    cargar();
    // Renueva el pase antes de que caduque (ttl ~45 s).
    const id = setInterval(cargar, 25000);
    const onVis = () => { if (!document.hidden) cargar(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  if (error) return <div className="card"><p className="descripcion">No se pudo generar tu pase. {error}</p></div>;
  if (!pase) return <div className="card"><div className="cargando">Generando pase...</div></div>;

  return (
    <div className="card mc-pase">
      <div className="mc-pase-qr">
        <img src={pase.qr} alt="Pase de acceso (QR dinámico)" />
        <span className="mc-pase-vivo"><i></i>en vivo</span>
      </div>
      <div className="mc-pase-info">
        <strong>{pase.titular}</strong>
        <p className="descripcion">Presenta este código en el portón para entrar. Se <strong>renueva solo</strong> cada pocos segundos, así que una captura de pantalla no sirve. No lo compartas: tu acceso queda registrado y no permite reingresar sin haber salido.</p>
      </div>
    </div>
  );
}

// Votación de la Directiva: el propietario vota desde la app, sin necesidad de
// asistir a la asamblea. El voto es secreto (la boleta no se liga a su nombre),
// una sola vez, y solo si está al día (cuando la elección lo exige).
function VotacionDirectiva() {
  const [datos, setDatos] = useState(undefined); // undefined = cargando
  const [sel, setSel] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmar, setConfirmar] = useState(false);

  const cargar = () => api.get('/elecciones/abierta')
    .then(setDatos).catch((e) => { setDatos(null); setError(e.message); });
  useEffect(() => { cargar(); }, []);

  if (datos === undefined) return null;          // aún cargando: no ocupa espacio
  if (!datos || !datos.eleccion) return null;    // no hay elección abierta

  const e = datos.eleccion;
  const votar = () => {
    setEnviando(true); setError(null);
    api.post(`/elecciones/${e.id}/votar`, { plancha_id: sel })
      .then(() => { setConfirmar(false); return cargar(); })
      .catch((err) => setError(err.message))
      .finally(() => setEnviando(false));
  };

  return (
    <>
      <h2>Elección de la Directiva</h2>
      <div className="card mc-voto">
        <div className="mc-voto-cab">
          <div>
            <strong>{e.titulo}</strong>
            {e.periodo && <span className="mc-voto-periodo">Período {e.periodo}</span>}
          </div>
          <span className="mc-voto-sello">Voto secreto</span>
        </div>
        {e.descripcion && <p className="descripcion">{e.descripcion}</p>}

        {datos.yaVoto ? (
          <div className="mc-voto-hecho">
            <span className="mc-voto-check">✓</span>
            <div>
              <strong>Tu voto quedó registrado.</strong>
              <p className="descripcion">Gracias por participar. El voto es secreto y no puede vincularse a tu nombre. Los resultados se publican al cerrar la elección.</p>
            </div>
          </div>
        ) : !datos.elegible ? (
          <div className="mc-voto-bloqueo">
            <p>{datos.motivo || 'En este momento no puedes votar en esta elección.'}</p>
            {e.solo_solventes && datos.saldo > 0 && (
              <p className="descripcion">Saldo pendiente: {dinero(datos.saldo)}. Ponte al día con la administración para habilitar tu voto mientras la elección siga abierta.</p>
            )}
          </div>
        ) : (
          <>
            <p className="descripcion">Elige una sola plancha. Puedes votar desde aquí aunque no hayas asistido a la asamblea; tu voto es secreto y vale una sola vez.</p>
            <div className="mc-planchas">
              {datos.planchas.map((p) => (
                <label key={p.id} className={`mc-plancha ${sel === p.id ? 'sel' : ''}`}>
                  <input type="radio" name="plancha" value={p.id} checked={sel === p.id} onChange={() => setSel(p.id)} />
                  <div className="mc-plancha-cuerpo">
                    <div className="mc-plancha-tit">
                      {p.numero != null && <span className="mc-plancha-num">{p.numero}</span>}
                      <strong>{p.nombre}</strong>
                    </div>
                    {p.lema && <div className="mc-plancha-lema">{p.lema}</div>}
                    {p.integrantes && <div className="mc-plancha-int">{p.integrantes}</div>}
                  </div>
                </label>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            {!confirmar ? (
              <button className="primario" disabled={!sel} onClick={() => setConfirmar(true)}>Votar</button>
            ) : (
              <div className="mc-voto-confirma">
                <p>Vas a emitir tu voto por <strong>{datos.planchas.find((p) => p.id === sel)?.nombre}</strong>. El voto es definitivo y no se puede cambiar.</p>
                <div className="mc-voto-acc">
                  <button className="secundario" disabled={enviando} onClick={() => setConfirmar(false)}>Cancelar</button>
                  <button className="primario" disabled={enviando} onClick={votar}>{enviando ? 'Enviando...' : 'Confirmar mi voto'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// Autorizar invitados: el propietario genera la credencial QR de su invitado
// y la comparte (p. ej. por WhatsApp). El invitado la presenta en el portón.
function AutorizarInvitado() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ nombre: '', documento: '', telefono: '', placa_vehiculo: '' });
  const [nuevo, setNuevo] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = () => api.get('/mi-cuenta/invitados').then(setLista).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const credUrl = (codigo) => `${window.location.origin}/credencial/${codigo}`;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function crear(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Escribe el nombre del invitado.'); return; }
    setEnviando(true); setError(null);
    try {
      const r = await api.post('/mi-cuenta/invitados', form);
      setNuevo({ nombre: form.nombre.trim(), codigo: r.codigo });
      setForm({ nombre: '', documento: '', telefono: '', placa_vehiculo: '' });
      cargar();
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar esta autorización? El invitado ya no podrá entrar con esa credencial.')) return;
    try { await api.del(`/mi-cuenta/invitados/${id}`); cargar(); } catch (e) { setError(e.message); }
  }
  function compartir(nombre, codigo) {
    const texto = `Hola ${nombre}, aquí está tu credencial de acceso al Centro de Retiro Lomas Lindas. Preséntala en la entrada: ${credUrl(codigo)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }
  function copiar(codigo) {
    try { navigator.clipboard.writeText(credUrl(codigo)); } catch (_) { /* ignore */ }
  }

  return (
    <div className="card mc-inv">
      <p className="descripcion">Autoriza a tus invitados: crea su credencial y compártela. La presentan en el portón para entrar.</p>
      <form className="mc-inv-form" onSubmit={crear}>
        <div className="fila">
          <div className="campo"><label>Nombre del invitado *</label><input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre y apellido" required /></div>
          <div className="campo"><label>Documento (opcional)</label><input value={form.documento} onChange={(e) => set('documento', e.target.value)} placeholder="Cédula / ID" /></div>
        </div>
        <div className="fila">
          <div className="campo"><label>Teléfono (opcional)</label><input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Teléfono" /></div>
          <div className="campo"><label>Placa del vehículo (opcional)</label><input value={form.placa_vehiculo} onChange={(e) => set('placa_vehiculo', e.target.value)} placeholder="Placa" /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Generando...' : 'Generar credencial'}</button>
      </form>

      {nuevo && (
        <div className="mc-inv-ok">
          <strong>✓ Credencial lista para {nuevo.nombre}</strong>
          <p className="descripcion">Compártela con tu invitado. La presenta en la entrada.</p>
          <div className="mc-inv-acc">
            <button className="wa" onClick={() => compartir(nuevo.nombre, nuevo.codigo)}>Compartir por WhatsApp</button>
            <button className="secundario" onClick={() => copiar(nuevo.codigo)}>Copiar enlace</button>
            <a className="secundario-link" href={credUrl(nuevo.codigo)} target="_blank" rel="noreferrer">Ver credencial</a>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <div className="mc-inv-lista">
          <h3>Invitados autorizados</h3>
          {lista.map((v) => (
            <div key={v.id} className="mc-inv-item">
              <div>
                <strong>{v.nombre}</strong>
                <span className="mc-inv-sub">{v.documento ? `${v.documento} · ` : ''}{v.codigo}</span>
              </div>
              <div className="mc-inv-item-acc">
                <button className="wa chico" onClick={() => compartir(v.nombre, v.codigo)}>WhatsApp</button>
                <a className="secundario-link chico" href={credUrl(v.codigo)} target="_blank" rel="noreferrer">Ver</a>
                <button className="peligro chico" onClick={() => eliminar(v.id)}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Núcleo familiar: cónyuge e hijos del residente, cada uno con su credencial
// de acceso (QR) para entrar al proyecto.
const PARENTESCOS = [
  { v: 'conyuge', t: 'Cónyuge' }, { v: 'hijo', t: 'Hijo' }, { v: 'hija', t: 'Hija' },
  { v: 'padre', t: 'Padre' }, { v: 'madre', t: 'Madre' }, { v: 'otro', t: 'Otro familiar' },
];
const etiquetaParentesco = (v) => PARENTESCOS.find((p) => p.v === v)?.t || v || '';

function NucleoFamiliar() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ nombre: '', parentesco: 'conyuge', documento: '', telefono: '' });
  const [nuevo, setNuevo] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = () => api.get('/mi-cuenta/familia').then(setLista).catch(() => {});
  useEffect(() => { cargar(); }, []);
  const credUrl = (codigo) => `${window.location.origin}/credencial/${codigo}`;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function crear(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Escribe el nombre del familiar.'); return; }
    setEnviando(true); setError(null);
    try {
      const r = await api.post('/mi-cuenta/familia', form);
      setNuevo({ nombre: form.nombre.trim(), codigo: r.codigo });
      setForm({ nombre: '', parentesco: 'conyuge', documento: '', telefono: '' });
      cargar();
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }
  async function eliminar(id) {
    if (!confirm('¿Quitar este familiar? Perderá su credencial de acceso.')) return;
    try { await api.del(`/mi-cuenta/familia/${id}`); cargar(); } catch (e) { setError(e.message); }
  }
  function compartir(nombre, codigo) {
    const texto = `Hola ${nombre}, aquí está tu credencial de acceso al Centro de Retiro Lomas Lindas. Preséntala en la entrada: ${credUrl(codigo)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  return (
    <div className="card mc-inv">
      <p className="descripcion">Registra a tu cónyuge, hijos u otros familiares que viven contigo. Cada uno recibe su credencial de acceso al proyecto.</p>
      <form className="mc-inv-form" onSubmit={crear}>
        <div className="fila">
          <div className="campo"><label>Nombre del familiar *</label><input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre y apellido" required /></div>
          <div className="campo"><label>Parentesco</label>
            <select value={form.parentesco} onChange={(e) => set('parentesco', e.target.value)}>
              {PARENTESCOS.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}
            </select>
          </div>
        </div>
        <div className="fila">
          <div className="campo"><label>Documento (opcional)</label><input value={form.documento} onChange={(e) => set('documento', e.target.value)} placeholder="Cédula / ID" /></div>
          <div className="campo"><label>Teléfono (opcional)</label><input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Teléfono" /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Guardando...' : 'Agregar familiar'}</button>
      </form>

      {nuevo && (
        <div className="mc-inv-ok">
          <strong>✓ Credencial lista para {nuevo.nombre}</strong>
          <p className="descripcion">Compártela para que entre al proyecto.</p>
          <div className="mc-inv-acc">
            <button className="wa" onClick={() => compartir(nuevo.nombre, nuevo.codigo)}>Compartir por WhatsApp</button>
            <a className="secundario-link" href={credUrl(nuevo.codigo)} target="_blank" rel="noreferrer">Ver credencial</a>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <div className="mc-inv-lista">
          <h3>Mi familia</h3>
          {lista.map((f) => (
            <div key={f.id} className="mc-inv-item">
              <div>
                <strong>{f.nombre}</strong>
                <span className="mc-inv-sub">{etiquetaParentesco(f.parentesco)}{f.documento ? ` · ${f.documento}` : ''}</span>
              </div>
              <div className="mc-inv-item-acc">
                <button className="wa chico" onClick={() => compartir(f.nombre, f.codigo)}>WhatsApp</button>
                <a className="secundario-link chico" href={credUrl(f.codigo)} target="_blank" rel="noreferrer">Ver</a>
                <button className="peligro chico" onClick={() => eliminar(f.id)}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mensaje de sección vacía.
function Vacio({ texto }) {
  return <div className="card"><p className="descripcion" style={{ margin: 0 }}>{texto}</p></div>;
}

// Tarjeta de saldo de cuotas de mantenimiento.
function TarjetaSaldo({ datos }) {
  return (
    <div className="mc-saldo card">
      <div className="etiqueta">Saldo pendiente de cuotas de mantenimiento</div>
      <div className={`mc-monto ${datos.saldo > 0 ? 'rojo' : 'verde'}`}>{dinero(datos.saldo)}</div>
      <div className="mc-nota">
        {datos.saldo > 0 ? `Tienes ${datos.pendientes} cuota(s) por pagar.` : 'Estás al día. ¡Gracias!'}
        {' · '}Total pagado: {dinero(datos.pagado)}
      </div>
    </div>
  );
}

// Inicio: resumen y accesos rápidos.
function InicioResumen({ datos, ir, esInq }) {
  const accesos = [
    { c: 'perfil', t: 'Mi perfil', i: '👤' },
    { c: 'pase', t: 'Mi pase de acceso', i: '🎫' },
    { c: 'familia', t: 'Núcleo familiar', i: '👪' },
    { c: 'invitados', t: 'Invitados', i: '✉️' },
    !esInq && { c: 'cuenta', t: 'Estado de cuenta', i: '🧾' },
    { c: 'normativas', t: 'Normativas', i: '📜' },
  ].filter(Boolean);
  return (
    <>
      {!esInq && <TarjetaSaldo datos={datos} />}
      <div className="mc-accesos">
        {accesos.map((a) => (
          <button key={a.c} className="mc-acceso card" onClick={() => ir(a.c)}>
            <span className="mc-acceso-ic" aria-hidden="true">{a.i}</span>
            <span>{a.t}</span>
          </button>
        ))}
      </div>
      <div className="card mc-capacitacion">
        <div>
          <strong>Aprende a usar tu portal</strong>
          <p className="descripcion">Curso corto y autodidacta: autorizar invitados, tu pase de acceso y tus cuotas.</p>
        </div>
        <a className="primario-link" href="/capacitacion-propietarios.html" target="_blank" rel="noreferrer">Abrir capacitación</a>
      </div>
    </>
  );
}

// Mi perfil: datos personales, foto del carnet/frente y datos de acceso.
function MiPerfil({ datos, usuario }) {
  const p = datos.propietario || {};
  const TIPOS = { solar: 'Solar', edificado: 'Edificado' };
  const foto = p.fotos?.[0];
  const fila = (etq, val) => val ? <div className="mc-perfil-fila"><span>{etq}</span><strong>{val}</strong></div> : null;
  return (
    <div className="mc-perfil">
      <div className="card mc-perfil-cab">
        {foto
          ? <img className="mc-perfil-foto" src={foto} alt="Foto de la propiedad/carnet" />
          : <div className="mc-perfil-foto mc-perfil-foto-vacia">{(p.nombre || '?').slice(0, 1)}</div>}
        <div>
          <h3 style={{ margin: '0 0 2px' }}>{p.nombre}</h3>
          {p.carnet && <div className="mc-perfil-carnet">Carnet N.º {p.carnet}</div>}
        </div>
      </div>
      <div className="card">
        <h4 className="mc-perfil-tit">Datos personales</h4>
        {fila('Cédula', p.documento)}
        {fila('Propiedad', p.propiedad)}
        {fila('Tipo', TIPOS[p.tipo_propiedad] || p.tipo_propiedad)}
        {fila('Teléfono', p.telefono)}
        {fila('Móvil', p.movil)}
        {fila('Correo', p.email)}
        {fila('Dirección', p.direccion)}
        {!p.documento && !p.telefono && !p.email && <p className="descripcion">Tu administración puede completar tus datos. Si algo está incorrecto, comunícate con la oficina.</p>}
      </div>
      <div className="card">
        <h4 className="mc-perfil-tit">Datos de acceso</h4>
        {fila('Usuario', usuario.email)}
        <p className="descripcion">Tu pase de acceso (QR) está en la sección «Mi pase de acceso». Se renueva solo; no lo compartas.</p>
      </div>
    </div>
  );
}

// Cómo pagar la cuota: cuentas bancarias + instrucciones (configurables por el admin).
function ComoPagar({ pago }) {
  if (!pago) return null;
  const { cuentas = [], titular, instrucciones, whatsapp, correo } = pago;
  if (cuentas.length === 0 && !instrucciones) return null;
  const TIPO = { ahorros: 'Ahorros', corriente: 'Corriente' };
  const waLink = whatsapp ? `https://wa.me/${String(whatsapp).replace(/[^\d]/g, '')}` : null;
  const copiar = (t) => { try { navigator.clipboard.writeText(t); } catch { /* */ } };
  return (
    <div className="card mc-pagar">
      <h4 className="mc-perfil-tit">Cómo pagar tu cuota</h4>
      {cuentas.length > 0 && (
        <div className="mc-cuentas">
          {cuentas.map((c, i) => (
            <div key={i} className="mc-cuenta">
              <div className="mc-cuenta-banco">{c.nombre}{c.tipo_cuenta ? ` · ${TIPO[c.tipo_cuenta] || c.tipo_cuenta}` : ''}</div>
              <div className="mc-cuenta-num">
                <strong>{c.numero || '—'}</strong>
                {c.numero && <button type="button" className="secundario chico" onClick={() => copiar(c.numero)}>Copiar</button>}
              </div>
              {(c.titular || titular) && <div className="mc-cuenta-titular">A nombre de: {c.titular || titular}</div>}
            </div>
          ))}
        </div>
      )}
      {instrucciones && <p className="descripcion mc-pagar-inst">{instrucciones}</p>}
      {(waLink || correo) && (
        <div className="mc-pagar-contacto">
          {waLink && <a className="wa" href={waLink} target="_blank" rel="noreferrer">Enviar comprobante por WhatsApp</a>}
          {correo && <a className="secundario-link" href={`mailto:${correo}?subject=${encodeURIComponent('Comprobante de pago de cuota')}`}>Enviar por correo</a>}
        </div>
      )}
    </div>
  );
}

// Estado de cuenta: saldo + cómo pagar + detalle de cuotas (pendientes y pagados).
function EstadoCuenta({ datos }) {
  const pendientes = (datos.facturas || []).filter((f) => f.estado === 'pendiente' || f.estado === 'vencida');
  return (
    <div className="mc-estado">
      <TarjetaSaldo datos={datos} />
      <ComoPagar pago={datos.pago} />
      {pendientes.length > 0 && (
        <div className="card mc-pend">
          <h4 className="mc-perfil-tit">Meses / cuotas pendientes</h4>
          <ul className="mc-pend-lista">
            {pendientes.map((f) => (
              <li key={f.id}>
                <span>{f.concepto}{f.fecha_vencimiento ? ` · vence ${fecha(f.fecha_vencimiento)}` : ''}</span>
                <strong>{dinero(f.monto)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h4 className="mc-perfil-tit">Historial de cuotas</h4>
      <div className="tabla-wrap">
        {(!datos.facturas || datos.facturas.length === 0) ? (
          <div className="vacio">Aún no hay cuotas registradas.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Concepto</th><th>Emisión</th><th>Vence</th><th>Monto</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {datos.facturas.map((f) => (
                <tr key={f.id}>
                  <td>{f.concepto}</td>
                  <td>{fecha(f.fecha_emision)}</td>
                  <td>{fecha(f.fecha_vencimiento)}</td>
                  <td style={{ fontWeight: 600 }}>{dinero(f.monto)}</td>
                  <td><Badge estado={f.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mc-pie">Para registrar un pago o aclarar un cargo, comunícate con la administración del centro.</p>
    </div>
  );
}

// Lista de empleados del propietario.
function EmpleadosLista({ empleados }) {
  return (
    <div className="tabla-wrap">
      <table>
        <thead>
          <tr><th>Nombre</th><th>Carné</th><th>Puesto</th><th>Teléfono</th><th>Credencial</th></tr>
        </thead>
        <tbody>
          {empleados.map((e) => (
            <tr key={e.id}>
              <td>{e.nombre}</td>
              <td>{e.carnet || '—'}</td>
              <td>{PUESTO[e.puesto] || e.puesto || '—'}</td>
              <td>{e.telefono || '—'}</td>
              <td>{e.codigo ? <a href={`/credencial/${e.codigo}`} target="_blank" rel="noreferrer">Ver credencial</a> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Normativas: documentos agrupados por categoría (estatutos, convivencia, etc.).
function NormativasVista({ docs, fundamentos }) {
  return (
    <>
      <p className="descripcion">Estatutos, reglamentos, normas de convivencia y de medio ambiente, y resoluciones de la Directiva y de las asambleas. Presiona una categoría para ver sus documentos.</p>
      <div className="mc-cats">
        {agruparDocumentos(docs).map(([cat, lista]) => (
          <GrupoCategoria key={cat} categoria={cat} docs={lista} fundamento={fundamentos?.[cat]} estatutoHref={estatutoHref(docs)} />
        ))}
      </div>
    </>
  );
}

// Contenido editorial (Historia / Actividades / Contactos) basado en documentos
// de una categoría. El administrador los publica desde «Normas y reglamentos».
function ContenidoCategoria({ docs, vacioTexto }) {
  if (!docs || docs.length === 0) return <Vacio texto={vacioTexto} />;
  const lista = [...docs].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (Number(a.orden) - Number(b.orden)));
  return (
    <div className="mc-contenido">
      {lista.map((d) => {
        const destino = d.archivo || d.enlace;
        return (
          <article key={d.id} className="card mc-articulo">
            {d.titulo && <h3 style={{ marginTop: 0 }}>{d.titulo}</h3>}
            {d.fecha && <div className="mc-doc-fecha">{fecha(d.fecha)}</div>}
            {d.descripcion && <p className="descripcion">{d.descripcion}</p>}
            {d.contenido && <div className="mc-doc-texto">{d.contenido}</div>}
            {destino && <a className="mc-doc-link" href={destino} target="_blank" rel="noreferrer">Ver documento</a>}
          </article>
        );
      })}
    </div>
  );
}

// Categorías que son contenido editorial (van en su propia sección, no en Normativas).
const CATS_CONTENIDO = ['historia', 'actividades', 'contactos'];

// Portal del propietario: navegación con menú hamburguesa y vistas.
export default function MiCuenta() {
  const { usuario, logout } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState('inicio');
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    api.get('/mi-cuenta').then(setDatos).catch((e) => setError(e.message));
  }, []);

  const docs = datos?.documentos || [];
  const docsNormativas = docs.filter((d) => !CATS_CONTENIDO.includes(d.categoria));
  const docsCat = (c) => docs.filter((d) => d.categoria === c);
  const esInq = datos?.es_inquilino;

  const menu = [
    { clave: 'inicio', t: 'Inicio', i: '🏠' },
    { clave: 'perfil', t: 'Mi perfil', i: '👤' },
    { clave: 'pase', t: 'Mi pase de acceso', i: '🎫' },
    !esInq && { clave: 'cuenta', t: 'Estado de cuenta', i: '🧾' },
    { clave: 'familia', t: 'Núcleo familiar', i: '👪' },
    { clave: 'invitados', t: 'Invitados', i: '✉️' },
    (datos?.empleados?.length > 0) && { clave: 'empleados', t: 'Mis empleados', i: '🧰' },
    { clave: 'normativas', t: 'Normativas', i: '📜' },
    { clave: 'historia', t: 'Nuestra historia', i: '📖' },
    { clave: 'actividades', t: 'Actividades', i: '📅' },
    { clave: 'contactos', t: 'Contactos de interés', i: '📞' },
  ].filter(Boolean);

  const ir = (clave) => { setVista(clave); setMenuAbierto(false); try { window.scrollTo(0, 0); } catch { /* */ } };
  const tituloVista = menu.find((m) => m.clave === vista)?.t || '';

  return (
    <div className="micuenta portal">
      <header className="mc-top">
        <div className="mc-top-izq">
          <button className="mc-ham" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú">☰</button>
          <div className="mc-marca">
            <img src="/emblema.png" alt="Lomas Lindas" />
            <div>
              <strong>Lomas Lindas</strong>
              <span>Portal del propietario</span>
            </div>
          </div>
        </div>
        <div className="mc-top-centro">Directiva 2026–2028</div>
        <div className="mc-user">
          <span className="mc-user-nom">{usuario.nombre}</span>
          <button className="secundario" onClick={logout}>Salir</button>
        </div>
      </header>

      {menuAbierto && <div className="mc-overlay" onClick={() => setMenuAbierto(false)} />}
      <aside className={`mc-drawer ${menuAbierto ? 'abierto' : ''}`}>
        <nav>
          {menu.map((m) => (
            <button key={m.clave} className={vista === m.clave ? 'activo' : ''} onClick={() => ir(m.clave)}>
              <span className="mc-drawer-ic" aria-hidden="true">{m.i}</span>
              <span>{m.t}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="mc-main">
        {error && <p className="error">{error}</p>}
        {!datos ? (
          <div className="cargando">Cargando...</div>
        ) : (
          <>
            {vista !== 'inicio' && <h2 className="mc-vista-tit">{tituloVista}</h2>}
            {vista === 'inicio' && <InicioResumen datos={datos} ir={ir} esInq={esInq} />}
            {vista === 'perfil' && <MiPerfil datos={datos} usuario={usuario} />}
            {vista === 'pase' && <PaseAcceso />}
            {vista === 'cuenta' && !esInq && <EstadoCuenta datos={datos} />}
            {vista === 'familia' && <NucleoFamiliar />}
            {vista === 'invitados' && <AutorizarInvitado />}
            {vista === 'empleados' && <EmpleadosLista empleados={datos.empleados} />}
            {vista === 'normativas' && (docsNormativas.length
              ? <NormativasVista docs={docsNormativas} fundamentos={datos.fundamentos} />
              : <Vacio texto="Aún no hay normativas publicadas." />)}
            {vista === 'historia' && <ContenidoCategoria docs={docsCat('historia')} vacioTexto="El administrador aún no ha publicado la historia y evolución del proyecto." />}
            {vista === 'actividades' && <ContenidoCategoria docs={docsCat('actividades')} vacioTexto="Aún no hay actividades publicadas." />}
            {vista === 'contactos' && <ContenidoCategoria docs={docsCat('contactos')} vacioTexto="Aún no hay contactos de interés publicados." />}
          </>
        )}
      </main>
    </div>
  );
}
