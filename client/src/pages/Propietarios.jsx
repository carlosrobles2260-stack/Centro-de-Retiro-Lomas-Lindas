import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Badge } from '../lib/format.jsx';
import { archivoAImagenBase64 } from '../lib/imagen.js';

const TIPOS = [
  { valor: 'solar', label: 'Solar' },
  { valor: 'edificado', label: 'Edificado' },
];
const etiquetaTipo = (v) => TIPOS.find((t) => t.valor === v)?.label || v;

const POR_PAGINA = 20;

export default function Propietarios() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | {} nuevo | fila editar
  const [acceso, setAcceso] = useState(null); // resultado de crear/restablecer acceso
  const [q, setQ] = useState('');          // texto de búsqueda (lo que se escribe)
  const [busqueda, setBusqueda] = useState(''); // búsqueda aplicada (con retardo)
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(POR_PAGINA) });
    if (busqueda) params.set('q', busqueda);
    const r = await api.get(`/propietarios?${params.toString()}`);
    setFilas(r.datos || []);
    setPaginas(r.paginas || 1);
    setTotal(r.total || 0);
    setCargando(false);
    // Si quedamos en una página que ya no existe (p. ej. al eliminar), retrocede.
    if (pagina > (r.paginas || 1)) setPagina(r.paginas || 1);
  }, [pagina, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  // Aplica la búsqueda con un pequeño retardo y vuelve a la primera página.
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(q.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function eliminar(f) {
    if (!confirm('¿Eliminar este propietario? Esta acción no se puede deshacer.')) return;
    await api.del(`/propietarios/${f.id}`);
    cargar();
  }

  function verCuenta(p) {
    window.open(`/cuenta/${p.token_cuenta}`, '_blank');
  }

  async function copiarEnlace(p) {
    const url = `${window.location.origin}/cuenta/${p.token_cuenta}`;
    try { await navigator.clipboard.writeText(url); alert('Enlace copiado:\n' + url); }
    catch { prompt('Copia el enlace del estado de cuenta:', url); }
  }

  async function crearAcceso(p) {
    const verbo = p.acceso_email ? 'restablecer la contraseña del' : 'crear el';
    if (!confirm(`¿Deseas ${verbo} acceso con contraseña para ${p.nombre}?`)) return;
    try {
      const r = await api.post(`/propietarios/${p.id}/acceso`, {});
      setAcceso({ nombre: p.nombre, ...r });
      cargar();
    } catch (e) { alert('Error: ' + e.message); }
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Propietarios</h2>
          <p className="descripcion">Registro de propietarios, su número de carnet y el solar o edificado asociado con fotos del frente.</p>
        </div>
        <button onClick={() => setModal({})}>+ Nuevo propietario</button>
      </div>

      <div className="barra-busqueda">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, propiedad, carnet, documento o correo…"
          aria-label="Buscar propietario"
        />
        {!cargando && (
          <span className="busqueda-conteo">
            {total} propietario{total === 1 ? '' : 's'}{busqueda ? ' encontrados' : ''}
          </span>
        )}
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">{busqueda ? `No se encontraron propietarios para "${busqueda}".` : 'No hay propietarios registrados.'}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Carnet</th><th>Propiedad</th><th>Teléfono</th><th>Fotos</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.nombre}
                    {p.acceso_email && <div style={{ fontSize: 14, color: 'var(--verde)' }}>🔑 {p.acceso_email}</div>}
                  </td>
                  <td>{p.carnet || '—'}</td>
                  <td>
                    {p.propiedad || '—'}
                    {p.tipo_propiedad && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{etiquetaTipo(p.tipo_propiedad)}</div>}
                  </td>
                  <td>{p.telefono || '—'}</td>
                  <td>
                    {p.fotos?.length ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.fotos.slice(0, 3).map((f, i) => (
                          <a key={i} href={f} target="_blank" rel="noreferrer">
                            <img src={f} alt="propiedad" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                          </a>
                        ))}
                        {p.fotos.length > 3 && <span style={{ fontSize: 14, color: 'var(--texto-suave)', alignSelf: 'center' }}>+{p.fotos.length - 3}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td><Badge estado={p.activo ? 'normal' : 'gris'} /></td>
                  <td>
                    <div className="acciones">
                      <button className="secundario" onClick={() => verCuenta(p)} title="Abrir el estado de cuenta">Cuenta</button>
                      <button className="secundario" onClick={() => copiarEnlace(p)} title="Copiar el enlace privado">Enlace</button>
                      <button className="secundario acc-acceso" onClick={() => crearAcceso(p)} title="Crear o restablecer el acceso con contraseña">{p.acceso_email ? 'Restablecer' : 'Acceso'}</button>
                      <button className="secundario" onClick={() => setModal(p)}>Editar</button>
                      <button className="peligro" onClick={() => eliminar(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && paginas > 1 && (
        <div className="paginacion">
          <button className="secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
            ‹ Anterior
          </button>
          <span className="paginacion-info">Página {pagina} de {paginas}</span>
          <button className="secundario" disabled={pagina >= paginas} onClick={() => setPagina((p) => Math.min(paginas, p + 1))}>
            Siguiente ›
          </button>
        </div>
      )}

      {modal && (
        <ModalPropietario
          propietario={modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}

      {acceso && (
        <div className="modal-fondo" onClick={() => setAcceso(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Acceso del propietario</h3>
            <p className="descripcion">Entrega estos datos a <strong>{acceso.nombre}</strong>. Podrá iniciar sesión en el sistema y ver solo su estado de cuenta.</p>
            <div className="campo"><label>Correo (usuario)</label><input readOnly value={acceso.email} /></div>
            <div className="campo"><label>Contraseña temporal</label><input readOnly value={acceso.password} /></div>
            <p className="descripcion">Se recomienda que el propietario cambie la contraseña. Puedes restablecerla en cualquier momento.</p>
            <div className="pie-modal">
              <button onClick={() => setAcceso(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalPropietario({ propietario, onCerrar, onGuardado }) {
  const esNuevo = !propietario.id;
  const [datos, setDatos] = useState({
    nombre: propietario.nombre || '',
    carnet: propietario.carnet || '',
    tipo_propiedad: propietario.tipo_propiedad || '',
    propiedad: propietario.propiedad || '',
    tipo_documento: propietario.tipo_documento || 'cedula',
    documento: propietario.documento || '',
    fecha_nacimiento: propietario.fecha_nacimiento || '',
    nacionalidad: propietario.nacionalidad || '',
    telefono: propietario.telefono || '',
    movil: propietario.movil || '',
    email: propietario.email || '',
    direccion: propietario.direccion || '',
    vive_fuera: propietario.vive_fuera ?? 0,
    pais_residencia: propietario.pais_residencia || '',
    representante: propietario.representante || '',
    representante_telefono: propietario.representante_telefono || '',
    representante_documento: propietario.representante_documento || '',
    activo: propietario.activo ?? 1,
  });
  const [fotos, setFotos] = useState(propietario.fotos || []); // URLs ya guardadas
  const [nuevas, setNuevas] = useState([]); // base64 por subir
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function agregarFotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    try {
      for (const file of files) {
        const b64 = await archivoAImagenBase64(file);
        setNuevas((n) => [...n, b64]);
      }
    } catch (err) { setError(err.message); }
  }

  async function enviar(ev) {
    ev.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = { ...datos, activo: Number(datos.activo) ? 1 : 0, fotos, fotos_base64: nuevas };
      if (esNuevo) await api.post('/propietarios', payload);
      else await api.put(`/propietarios/${propietario.id}`, payload);
      onGuardado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{esNuevo ? 'Nuevo propietario' : 'Editar propietario'}</h3>

        <div className="campo">
          <label>Nombre completo *</label>
          <input value={datos.nombre} required onChange={(e) => set('nombre', e.target.value)} />
        </div>

        <div className="fila">
          <div className="campo">
            <label>Número de carnet</label>
            <input value={datos.carnet} onChange={(e) => set('carnet', e.target.value)} placeholder="N.º de carnet del propietario" />
          </div>
          <div className="campo">
            <label>Fecha de nacimiento</label>
            <input type="date" value={datos.fecha_nacimiento} onChange={(e) => set('fecha_nacimiento', e.target.value)} />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Tipo de documento</label>
            <select value={datos.tipo_documento} onChange={(e) => set('tipo_documento', e.target.value)}>
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </div>
          <div className="campo">
            <label>N.º de {datos.tipo_documento === 'pasaporte' ? 'pasaporte' : 'cédula'}</label>
            <input value={datos.documento} onChange={(e) => set('documento', e.target.value)} placeholder={datos.tipo_documento === 'pasaporte' ? 'N.º de pasaporte' : '000-0000000-0'} />
          </div>
        </div>

        <div className="campo">
          <label>Nacionalidad</label>
          <input value={datos.nacionalidad} onChange={(e) => set('nacionalidad', e.target.value)} placeholder="Ej: Dominicana" />
        </div>

        <div className="fila">
          <div className="campo">
            <label>Tipo de propiedad *</label>
            <select value={datos.tipo_propiedad} required onChange={(e) => set('tipo_propiedad', e.target.value)}>
              <option value="" disabled>Selecciona: solar o edificado</option>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Solar / edificado (lote, casa o unidad)</label>
            <input value={datos.propiedad} onChange={(e) => set('propiedad', e.target.value)} placeholder="Ej: Solar 12, Residencia B-4" />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Teléfono (fijo)</label>
            <input value={datos.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </div>
          <div className="campo">
            <label>Móvil (celular)</label>
            <input value={datos.movil} onChange={(e) => set('movil', e.target.value)} placeholder="Para WhatsApp" />
          </div>
        </div>

        <div className="campo">
          <label>Correo electrónico</label>
          <input type="email" value={datos.email} onChange={(e) => set('email', e.target.value)} />
        </div>

        <div className="campo">
          <label>Dirección de residencia (dónde vive)</label>
          <input value={datos.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle, número, sector, ciudad" />
        </div>

        <div className="campo">
          <label className="sync-check">
            <input type="checkbox" checked={!!Number(datos.vive_fuera)} onChange={(e) => set('vive_fuera', e.target.checked ? 1 : 0)} />
            Reside fuera del país
          </label>
        </div>

        {!!Number(datos.vive_fuera) && (
          <div className="campo">
            <label>País de residencia</label>
            <input value={datos.pais_residencia} onChange={(e) => set('pais_residencia', e.target.value)} placeholder="Ej: Estados Unidos" />
          </div>
        )}

        <div className="fila">
          <div className="campo">
            <label>Representante autorizado{!!Number(datos.vive_fuera) && ' *'}</label>
            <input value={datos.representante} onChange={(e) => set('representante', e.target.value)} placeholder="Nombre de quien lo representa" />
          </div>
          <div className="campo">
            <label>Teléfono del representante</label>
            <input value={datos.representante_telefono} onChange={(e) => set('representante_telefono', e.target.value)} />
          </div>
        </div>

        <div className="campo">
          <label>Documento del representante</label>
          <input value={datos.representante_documento} onChange={(e) => set('representante_documento', e.target.value)} placeholder="Cédula / pasaporte del representante" />
        </div>

        <div className="campo">
          <label>Fotos del frente de la propiedad</label>
          <input type="file" accept="image/*" capture="environment" multiple onChange={agregarFotos} />
          {(fotos.length > 0 || nuevas.length > 0) && (
            <div className="galeria-fotos">
              {fotos.map((f, i) => (
                <div key={`u${i}`} className="foto-item">
                  <img src={f} alt="propiedad" />
                  <button type="button" onClick={() => setFotos((a) => a.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {nuevas.map((f, i) => (
                <div key={`n${i}`} className="foto-item">
                  <img src={f} alt="nueva" />
                  <button type="button" onClick={() => setNuevas((a) => a.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="campo">
          <label className="sync-check">
            <input type="checkbox" checked={!!Number(datos.activo)} onChange={(e) => set('activo', e.target.checked ? 1 : 0)} />
            Propietario activo
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
