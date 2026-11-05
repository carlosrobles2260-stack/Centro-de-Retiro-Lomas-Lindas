import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { fechaHora, Badge } from '../lib/format.jsx';
import EscanerQR from '../components/EscanerQR.jsx';
import Paginacion from '../components/Paginacion.jsx';

const ESTADOS = [
  { valor: 'pendiente', label: 'Pendiente' },
  { valor: 'autorizada', label: 'Autorizada' },
  { valor: 'dentro', label: 'Dentro' },
  { valor: 'finalizada', label: 'Finalizada' },
  { valor: 'rechazada', label: 'Rechazada' },
];

// Aviso del resultado de la barrera del portón. Solo molesta al usuario si pasó
// algo que deba saber; si no hay relé configurado no muestra nada.
function avisarBarrera(barrera) {
  if (!barrera || barrera === 'no_configurada' || barrera === 'omitida') return;
  if (barrera === 'abierta') return; // éxito silencioso (lo normal)
  alert('⚠️ No se pudo abrir el brazo del portón automáticamente. Ábrelo de forma manual y revisa la configuración del relé en "Control de acceso (QR)".');
}

// Acciones disponibles según el estado actual de la visita.
const ACCIONES = {
  pendiente: [
    { estado: 'autorizada', texto: 'Autorizar' },
    { estado: 'rechazada', texto: 'Rechazar', clase: 'peligro' },
  ],
  autorizada: [
    { estado: 'dentro', texto: 'Registrar entrada' },
    { estado: 'rechazada', texto: 'Rechazar', clase: 'peligro' },
  ],
  dentro: [{ estado: 'finalizada', texto: 'Registrar salida' }],
  finalizada: [],
  rechazada: [],
};

export default function Visitas() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [visitantePre, setVisitantePre] = useState(null); // visitante preseleccionado por QR
  const [empleadoAcceso, setEmpleadoAcceso] = useState(null); // empleado del propietario escaneado
  const [escaneando, setEscaneando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = new URLSearchParams();
    if (filtroEstado) qs.set('estado', filtroEstado);
    if (buscar) qs.set('buscar', buscar);
    qs.set('pagina', String(pagina));
    qs.set('limite', '20');
    const r = await api.get('/visitas?' + qs.toString());
    const lista = Array.isArray(r) ? r : (r.datos || []);
    setFilas(lista);
    setPaginas(Array.isArray(r) ? 1 : (r.paginas || 1));
    setTotal(Array.isArray(r) ? lista.length : (r.total || 0));
    setCargando(false);
  }, [filtroEstado, buscar, pagina]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [filtroEstado, buscar]);

  async function alEscanear(codigo) {
    setEscaneando(false);
    // 1) ¿Es un visitante?
    try {
      const visitante = await api.get(`/visitantes/codigo/${encodeURIComponent(codigo)}`);
      setVisitantePre(visitante);
      setModal(true);
      return;
    } catch { /* intentar con empleado del propietario */ }
    // 2) ¿Es un empleado del propietario?
    try {
      const empleado = await api.get(`/empleados-propietario/codigo/${encodeURIComponent(codigo)}`);
      setEmpleadoAcceso(empleado);
      return;
    } catch { /* no encontrado */ }
    alert(`No se encontró ninguna credencial con el código "${codigo}".`);
  }

  async function cambiarEstado(visita, estado) {
    let autorizado_por = visita.autorizado_por;
    if (estado === 'autorizada' && !autorizado_por) {
      autorizado_por = prompt('¿Quién autoriza la visita? (propietario)') || '';
    }
    const r = await api.patch(`/visitas/${visita.id}/estado`, { estado, autorizado_por });
    avisarBarrera(r?.barrera);
    cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Registro de visitas</h2>
          <p className="descripcion">Control de acceso de visitantes, familiares e invitados de los propietarios.</p>
        </div>
        <div className="filtros">
          <button className="secundario" onClick={() => setEscaneando(true)}>📷 Escanear QR</button>
          <button onClick={() => { setVisitantePre(null); setModal(true); }}>+ Registrar visita</button>
        </div>
      </div>

      <div className="barra">
        <div className="filtros">
          <input placeholder="Buscar visitante o propietario..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Estado: todos</option>
            {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.label}</option>)}
          </select>
        </div>
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay visitas registradas.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Visitante</th>
                <th>Tipo</th>
                <th>Propietario</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.visitante_nombre}</strong>
                    {v.placa_vehiculo && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>🚗 {v.placa_vehiculo}</div>}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{v.visitante_tipo}</td>
                  <td>{v.propietario_nombre || '—'}{v.propiedad && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{v.propiedad}</div>}</td>
                  <td>{fechaHora(v.fecha_entrada)}</td>
                  <td>{fechaHora(v.fecha_salida)}</td>
                  <td><Badge estado={v.estado} /></td>
                  <td>
                    <div className="acciones">
                      {(ACCIONES[v.estado] || []).map((a) => (
                        <button key={a.estado} className={a.clase || 'secundario'} onClick={() => cambiarEstado(v, a.estado)}>
                          {a.texto}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && <Paginacion pagina={pagina} paginas={paginas} total={total} etiqueta="visita" onCambio={setPagina} />}

      {escaneando && <EscanerQR onDetectado={alEscanear} onCerrar={() => setEscaneando(false)} />}
      {empleadoAcceso && (
        <ModalAccesoEmpleado
          empleado={empleadoAcceso}
          onCerrar={() => setEmpleadoAcceso(null)}
        />
      )}
      {modal && (
        <ModalVisita
          visitantePre={visitantePre}
          onCerrar={() => { setModal(false); setVisitantePre(null); }}
          onGuardado={() => { setModal(false); setVisitantePre(null); cargar(); }}
        />
      )}
    </div>
  );
}

const PUESTO = { domestica: 'Empleada doméstica', jardinero: 'Jardinero', cuidador: 'Cuidador', motorista: 'Motorista', otro: 'Otro' };

// Registro de entrada/salida de un empleado del propietario escaneado.
function ModalAccesoEmpleado({ empleado, onCerrar }) {
  const [guardando, setGuardando] = useState(null); // 'entrada' | 'salida'
  const [resultado, setResultado] = useState(null);
  const [barrera, setBarrera] = useState(null);
  const [error, setError] = useState(null);

  async function registrar(tipo) {
    setGuardando(tipo);
    setError(null);
    try {
      const r = await api.post('/empleados-propietario/acceso', { codigo: empleado.codigo, tipo });
      setResultado(r.tipo);
      setBarrera(r.barrera);
      avisarBarrera(r.barrera);
    } catch (e) {
      setError(e.message);
      setGuardando(null);
    }
  }

  const sugerido = empleado.sugerido || 'entrada';

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Acceso de empleado</h3>
        <div className="card" style={{ background: 'var(--verde-muy-claro)', borderColor: 'var(--verde-claro)', marginBottom: 14, padding: 12 }}>
          👷 <strong>{empleado.nombre}</strong> · {PUESTO[empleado.puesto] || empleado.puesto || 'Empleado'}
          <div style={{ fontSize: 15, color: 'var(--texto-suave)', marginTop: 4 }}>
            {empleado.propietario_nombre ? `Propietario: ${empleado.propietario_nombre}` : ''}
            {empleado.propiedad ? ` · ${empleado.propiedad}` : ''}
            {empleado.carnet ? ` · Carné ${empleado.carnet}` : ''}
          </div>
        </div>

        {resultado ? (
          <>
            <p className="ok-msg">✓ {resultado === 'entrada' ? 'Entrada' : 'Salida'} registrada para {empleado.nombre}.</p>
            {barrera === 'abierta' && <p className="ok-msg">🚧 Brazo del portón abierto.</p>}
            <div className="pie-modal"><button onClick={onCerrar}>Cerrar</button></div>
          </>
        ) : (
          <>
            <p className="descripcion">¿Qué movimiento registras?</p>
            {error && <p className="error">{error}</p>}
            <div className="acciones" style={{ gap: 10 }}>
              <button onClick={() => registrar('entrada')} disabled={!!guardando}>
                {guardando === 'entrada' ? 'Registrando...' : `⬇️ Entrada${sugerido === 'entrada' ? ' (sugerido)' : ''}`}
              </button>
              <button className="secundario" onClick={() => registrar('salida')} disabled={!!guardando}>
                {guardando === 'salida' ? 'Registrando...' : `⬆️ Salida${sugerido === 'salida' ? ' (sugerido)' : ''}`}
              </button>
              <button className="secundario" onClick={onCerrar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModalVisita({ visitantePre, onCerrar, onGuardado }) {
  const [visitantes, setVisitantes] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [datos, setDatos] = useState({
    visitante_id: visitantePre?.id || '',
    propietario_id: visitantePre?.propietario_id || '',
    motivo: '',
    autorizado_por: visitantePre?.propietario_nombre || '',
    estado: 'pendiente',
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/visitantes').then(setVisitantes).catch(() => {});
    api.get('/propietarios').then(setPropietarios).catch(() => {});
  }, []);

  // Al elegir visitante, precarga su propietario asociado.
  function elegirVisitante(id) {
    const v = visitantes.find((x) => String(x.id) === String(id));
    setDatos((d) => ({ ...d, visitante_id: id, propietario_id: v?.propietario_id || d.propietario_id }));
  }

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const r = await api.post('/visitas', {
        ...datos,
        propietario_id: datos.propietario_id || null,
      });
      avisarBarrera(r?.barrera);
      onGuardado();
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Registrar visita</h3>
        {visitantePre && (
          <div className="card" style={{ background: 'var(--verde-muy-claro)', borderColor: 'var(--verde-claro)', marginBottom: 14, padding: 12 }}>
            ✅ Credencial escaneada: <strong>{visitantePre.nombre}</strong> ({visitantePre.codigo})
          </div>
        )}
        <div className="campo">
          <label>Visitante *</label>
          <select value={datos.visitante_id} required onChange={(e) => elegirVisitante(e.target.value)}>
            <option value="">Seleccionar visitante...</option>
            {visitantes.map((v) => <option key={v.id} value={v.id}>{v.nombre} {v.documento ? `(${v.documento})` : ''}</option>)}
          </select>
          <p style={{ fontSize: 14, color: 'var(--texto-suave)', margin: '6px 0 0' }}>
            ¿No está en la lista? Regístralo primero en la sección Visitantes.
          </p>
        </div>
        <div className="campo">
          <label>Propietario que recibe</label>
          <select value={datos.propietario_id} onChange={(e) => setDatos((d) => ({ ...d, propietario_id: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {propietarios.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.propiedad ? `· ${p.propiedad}` : ''}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Motivo de la visita</label>
          <input value={datos.motivo} onChange={(e) => setDatos((d) => ({ ...d, motivo: e.target.value }))} />
        </div>
        <div className="campo">
          <label>Autorizado por</label>
          <input value={datos.autorizado_por} placeholder="Nombre de quien autoriza" onChange={(e) => setDatos((d) => ({ ...d, autorizado_por: e.target.value }))} />
        </div>
        <div className="campo">
          <label>Estado inicial</label>
          <select value={datos.estado} onChange={(e) => setDatos((d) => ({ ...d, estado: e.target.value }))}>
            {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.label}</option>)}
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</button>
        </div>
      </form>
    </div>
  );
}
