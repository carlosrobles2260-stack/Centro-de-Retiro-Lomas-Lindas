import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha, Badge } from '../lib/format.jsx';
import Paginacion from '../components/Paginacion.jsx';

const PERIODICIDAD = [
  { valor: 'semanal', label: 'Semanal' },
  { valor: 'quincenal', label: 'Quincenal' },
  { valor: 'mensual', label: 'Mensual' },
];
const etiquetaPer = (v) => PERIODICIDAD.find((p) => p.valor === v)?.label || v;

export default function Prestamos() {
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(false);
  const [descuento, setDescuento] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFilas(await api.get('/prestamos-empleado'));
    setResumen(await api.get('/prestamos-empleado/resumen').catch(() => null));
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(p) {
    if (!confirm('¿Eliminar este préstamo?')) return;
    try { await api.del(`/prestamos-empleado/${p.id}`); cargar(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Préstamos a empleados</h2>
          <p className="descripcion">Adelantos y préstamos al personal, con descuento automático en la nómina según la periodicidad.</p>
        </div>
        <button onClick={() => setNuevo(true)}>+ Nuevo préstamo</button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Prestado (activos)" valor={dinero(resumen?.total_prestado)} />
        <Stat etiqueta="Saldo pendiente" valor={dinero(resumen?.saldo_pendiente)} clase="rojo" />
        <Stat etiqueta="Préstamos activos" valor={resumen?.activos ?? '…'} />
      </div>

      <div className="tabla-wrap">
        {cargando ? <div className="cargando">Cargando...</div>
          : filas.length === 0 ? <div className="vacio">No hay préstamos registrados.</div>
          : (
            <table>
              <thead>
                <tr><th>Empleado</th><th>Monto</th><th>Cuota</th><th>Periodicidad</th><th>Pagado</th><th>Saldo</th><th>Restan</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.empleado_nombre}</strong></td>
                    <td>{dinero(p.monto)}</td>
                    <td>{dinero(p.cuota)}</td>
                    <td>{etiquetaPer(p.periodicidad)}</td>
                    <td>{dinero(p.pagado)}</td>
                    <td style={{ fontWeight: 600 }}>{dinero(p.saldo)}</td>
                    <td>{p.estado === 'activo' && p.periodos_restantes != null ? `${p.periodos_restantes} cuota(s)` : '—'}</td>
                    <td><Badge estado={p.estado === 'pagado' ? 'pagada' : p.estado === 'activo' ? 'pendiente' : 'gris'} /></td>
                    <td>
                      <div className="acciones">
                        {p.estado === 'activo' && <button onClick={() => setDescuento(p)}>Descontar</button>}
                        <button className="secundario" onClick={() => setHistorial(p)}>Historial</button>
                        <button className="peligro" onClick={() => eliminar(p)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {!cargando && <Paginacion pagina={paginaActual} paginas={paginas} total={filas.length} etiqueta="préstamo" onCambio={setPagina} />}

      {nuevo && <ModalNuevo onCerrar={() => setNuevo(false)} onGuardado={() => { setNuevo(false); cargar(); }} />}
      {descuento && <ModalDescuento prestamo={descuento} onCerrar={() => setDescuento(null)} onGuardado={() => { setDescuento(null); cargar(); }} />}
      {historial && <ModalHistorial prestamo={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}

function Stat({ etiqueta, valor, clase }) {
  return <div className="card stat"><div className="etiqueta">{etiqueta}</div><div className={`valor ${clase || ''}`}>{valor}</div></div>;
}

function ModalNuevo({ onCerrar, onGuardado }) {
  const [empleados, setEmpleados] = useState([]);
  const [datos, setDatos] = useState({ empleado_id: '', monto: '', cuota: '', periodicidad: 'quincenal', fecha: new Date().toISOString().slice(0, 10), motivo: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  useEffect(() => { api.get('/empleados').then((l) => setEmpleados(l.filter((e) => e.activo))).catch(() => {}); }, []);

  async function enviar(e) {
    e.preventDefault(); setGuardando(true); setError(null);
    try {
      await api.post('/prestamos-empleado', { ...datos, monto: Number(datos.monto), cuota: Number(datos.cuota) });
      onGuardado();
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Nuevo préstamo</h3>
        <div className="campo">
          <label>Empleado *</label>
          <select value={datos.empleado_id} required onChange={(e) => set('empleado_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.puesto ? ` · ${e.puesto}` : ''}</option>)}
          </select>
        </div>
        <div className="fila">
          <div className="campo"><label>Monto del préstamo *</label><input type="number" step="any" min="0" value={datos.monto} required onChange={(e) => set('monto', e.target.value)} /></div>
          <div className="campo"><label>Cuota por período *</label><input type="number" step="any" min="0" value={datos.cuota} required onChange={(e) => set('cuota', e.target.value)} /></div>
        </div>
        <div className="fila">
          <div className="campo"><label>Periodicidad del descuento</label>
            <select value={datos.periodicidad} onChange={(e) => set('periodicidad', e.target.value)}>
              {PERIODICIDAD.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
            </select>
          </div>
          <div className="campo"><label>Fecha</label><input type="date" value={datos.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
        </div>
        <div className="campo"><label>Motivo</label><input value={datos.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Motivo del préstamo" /></div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar préstamo'}</button>
        </div>
      </form>
    </div>
  );
}

function ModalDescuento({ prestamo, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({ monto: Math.min(Number(prestamo.cuota), Number(prestamo.saldo)).toFixed(2), periodo: '', nota: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function enviar(e) {
    e.preventDefault(); setGuardando(true); setError(null);
    try {
      await api.post(`/prestamos-empleado/${prestamo.id}/descuento`, { ...datos, monto: Number(datos.monto) });
      onGuardado();
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Descontar en nómina</h3>
        <p className="descripcion">{prestamo.empleado_nombre} · Saldo: <strong>{dinero(prestamo.saldo)}</strong></p>
        <div className="fila">
          <div className="campo"><label>Monto del descuento *</label><input type="number" step="any" min="0" max={prestamo.saldo} value={datos.monto} required onChange={(e) => set('monto', e.target.value)} /></div>
          <div className="campo"><label>Período de nómina</label><input value={datos.periodo} onChange={(e) => set('periodo', e.target.value)} placeholder="Ej: Octubre 2a quincena" /></div>
        </div>
        <div className="campo"><label>Nota</label><input value={datos.nota} onChange={(e) => set('nota', e.target.value)} /></div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar descuento'}</button>
        </div>
      </form>
    </div>
  );
}

function ModalHistorial({ prestamo, onCerrar }) {
  const [datos, setDatos] = useState(null);
  useEffect(() => { api.get(`/prestamos-empleado/${prestamo.id}`).then(setDatos).catch(() => {}); }, [prestamo.id]);
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Historial de descuentos</h3>
        <p className="descripcion">{prestamo.empleado_nombre} · Préstamo {dinero(prestamo.monto)} · Saldo {dinero(prestamo.saldo)}</p>
        {!datos ? <div className="cargando">Cargando...</div>
          : datos.descuentos.length === 0 ? <div className="vacio">Aún no hay descuentos aplicados.</div>
          : (
            <div className="tabla-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Período</th><th>Monto</th><th>Registró</th></tr></thead>
                <tbody>
                  {datos.descuentos.map((d) => (
                    <tr key={d.id}><td>{fecha(d.fecha)}</td><td>{d.periodo || '—'}</td><td>{dinero(d.monto)}</td><td>{d.registrado_por_nombre || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div className="pie-modal"><button className="secundario" onClick={onCerrar}>Cerrar</button></div>
      </div>
    </div>
  );
}
