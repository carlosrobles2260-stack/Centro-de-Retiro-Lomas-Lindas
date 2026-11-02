import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha } from '../lib/format.jsx';
import { exportarExcel, exportarPDF } from '../lib/exportar.js';

const efectivo = (f) => Number(f.monto);

const BUCKETS = [
  { key: 'vigente', label: 'Por vencer', color: 'var(--verde)' },
  { key: 'd1_30', label: '1 – 30 días', color: 'var(--amarillo)' },
  { key: 'd31_60', label: '31 – 60 días', color: '#e67e22' },
  { key: 'd61', label: 'Más de 60 días', color: 'var(--rojo)' },
];

const COLUMNAS_EXP = [
  { key: 'nombre', label: 'Propietario', ancho: 26 },
  { key: 'propiedad', label: 'Propiedad', ancho: 16 },
  { key: 'cuotas', label: 'Cuotas' },
  { key: 'cuotas_vencidas', label: 'Vencidas' },
  { key: 'saldo', label: 'Saldo (USD)', fmt: (v) => Number(v).toFixed(2) },
  { key: 'saldo_vencido', label: 'Vencido (USD)', fmt: (v) => Number(v).toFixed(2) },
  { key: 'dias_max', label: 'Atraso (días)' },
];

export default function CuentasPorCobrar() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [emitir, setEmitir] = useState(false);
  const [montos, setMontos] = useState(false); // editor de montos de cuota
  const [pago, setPago] = useState(null); // propietario para registrar pago

  const cargar = useCallback(async () => {
    try { setDatos(await api.get('/cuentas-por-cobrar')); setError(null); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function marcarVencidas() {
    setOcupado(true); setMensaje(null);
    try {
      const r = await api.post('/cuentas-por-cobrar/marcar-vencidas');
      setMensaje(`Se marcaron ${r.actualizadas} cuota(s) como vencidas.`);
      cargar();
    } catch (e) { setMensaje('Error: ' + e.message); }
    finally { setOcupado(false); }
  }

  async function recordar(p) {
    if (!confirm(`¿Enviar recordatorio de cuotas a ${p.nombre} (${dinero(p.saldo)})?`)) return;
    try {
      const r = await api.post('/cuentas-por-cobrar/recordatorio', { propietario_id: p.propietario_id });
      setMensaje(r.estado === 'enviada'
        ? `Recordatorio enviado a ${p.nombre}.`
        : `Recordatorio registrado para ${p.nombre} (correo ${r.estado}${!p.email ? ', sin correo registrado' : ''}).`);
    } catch (e) { setMensaje('Error: ' + e.message); }
  }

  function exportar(tipo) {
    if (!datos) return;
    const subtitulo = `Total por cobrar ${dinero(datos.resumen.total)} · Vencido ${dinero(datos.resumen.vencido)} · Por vencer ${dinero(datos.resumen.por_vencer)}`;
    if (tipo === 'excel') {
      exportarExcel({ nombre: 'cuentas-por-cobrar', hoja: 'Cuentas por cobrar', columnas: COLUMNAS_EXP, filas: datos.propietarios });
    } else {
      exportarPDF({ titulo: 'Cuentas por cobrar', subtitulo, nombre: 'cuentas-por-cobrar', columnas: COLUMNAS_EXP, filas: datos.propietarios });
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <div className="cargando">Cargando...</div>;

  const { resumen, propietarios } = datos;
  const totalBarra = resumen.total || 1;

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Cuentas por cobrar</h2>
          <p className="descripcion">Saldo pendiente de cuotas de mantenimiento por propietario y su antigüedad.</p>
        </div>
        <div className="filtros">
          <button onClick={() => setEmitir(true)}>Emitir cuotas del mes</button>
          <button className="secundario" onClick={() => setMontos(true)}>Montos de cuota</button>
          <button className="secundario" onClick={marcarVencidas} disabled={ocupado}>{ocupado ? 'Actualizando...' : 'Marcar vencidas'}</button>
          <button className="secundario" onClick={() => exportar('excel')} disabled={!propietarios.length}>Excel</button>
          <button className="secundario" onClick={() => exportar('pdf')} disabled={!propietarios.length}>PDF</button>
        </div>
      </div>

      {mensaje && <p className="ok-msg" style={{ marginBottom: 12 }}>{mensaje}</p>}

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Total por cobrar" valor={dinero(resumen.total)} />
        <Stat etiqueta="Vencido" valor={dinero(resumen.vencido)} clase="rojo" />
        <Stat etiqueta="Por vencer" valor={dinero(resumen.por_vencer)} clase="verde" />
        <Stat etiqueta="Propietarios con saldo" valor={resumen.propietarios_con_saldo} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Antigüedad del saldo</h3>
        <div className="aging-barra">
          {BUCKETS.map((b) => {
            const val = resumen.antiguedad[b.key] || 0;
            const pct = (val / totalBarra) * 100;
            return pct > 0 ? <div key={b.key} style={{ width: `${pct}%`, background: b.color }} title={`${b.label}: ${dinero(val)}`} /> : null;
          })}
        </div>
        <div className="aging-leyenda">
          {BUCKETS.map((b) => (
            <div key={b.key} className="aging-item">
              <span className="aging-punto" style={{ background: b.color }} />
              <span>{b.label}</span>
              <strong>{dinero(resumen.antiguedad[b.key] || 0)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="tabla-wrap">
        {propietarios.length === 0 ? (
          <div className="vacio">No hay saldos pendientes. ¡Todos al día!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Propietario</th><th>Cuotas</th><th>Saldo</th><th>Vencido</th><th>Atraso</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propietarios.map((p) => (
                <tr key={p.propietario_id}>
                  <td>
                    <strong>{p.nombre}</strong>
                    {p.propiedad && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{p.propiedad}</div>}
                  </td>
                  <td>{p.cuotas}{p.cuotas_vencidas > 0 && <span style={{ color: 'var(--rojo)', fontSize: 14 }}> · {p.cuotas_vencidas} vencida(s)</span>}</td>
                  <td style={{ fontWeight: 600 }}>{dinero(p.saldo)}</td>
                  <td style={{ color: p.saldo_vencido > 0 ? 'var(--rojo)' : 'inherit' }}>{dinero(p.saldo_vencido)}</td>
                  <td>{p.dias_max > 0 ? `${p.dias_max} días` : '—'}</td>
                  <td>
                    <div className="acciones">
                      <button onClick={() => setPago(p)}>Registrar pago</button>
                      <button className="secundario" onClick={() => recordar(p)}>Recordatorio</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {emitir && <ModalEmitir onCerrar={() => setEmitir(false)} onHecho={(msg) => { setEmitir(false); setMensaje(msg); cargar(); }} />}
      {montos && <ModalMontos onCerrar={() => setMontos(false)} onGuardado={(msg) => { setMontos(false); setMensaje(msg); }} />}
      {pago && <ModalPago propietario={pago} onCerrar={() => setPago(null)} onPagado={() => { cargar(); }} />}
    </div>
  );
}

function Stat({ etiqueta, valor, clase }) {
  return (
    <div className="card stat">
      <div className="etiqueta">{etiqueta}</div>
      <div className={`valor ${clase || ''}`}>{valor}</div>
    </div>
  );
}

// Emisión masiva de la cuota del mes. El monto se toma según el tipo de
// propiedad de cada propietario (solar o edificado), definido en «Montos de cuota».
function ModalEmitir({ onCerrar, onHecho }) {
  const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const [datos, setDatos] = useState({ concepto: `Cuota de mantenimiento ${mes}`, fecha_vencimiento: '' });
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  useEffect(() => { api.get('/configuracion').then(setCfg).catch(() => setCfg({})); }, []);

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true); setError(null);
    try {
      const r = await api.post('/facturas/generar-mensuales', {
        concepto: datos.concepto, fecha_vencimiento: datos.fecha_vencimiento || null,
      });
      onHecho(`Se generaron ${r.creadas} cuota(s)${r.omitidas ? `; ${r.omitidas} ya existían este mes` : ''}.`);
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Emitir cuotas del mes</h3>
        <p className="descripcion">Se crea una cuota para cada propietario activo, con el monto según su tipo de propiedad. No se duplica si ya existe una con el mismo concepto este mes.</p>
        {cfg && (
          <div className="card" style={{ background: 'var(--verde-muy-claro)', borderColor: 'var(--verde-claro)', padding: 12, marginBottom: 12 }}>
            Solar: <strong>{dinero(cfg.cuota_solar)}</strong> · Edificado: <strong>{dinero(cfg.cuota_edificado)}</strong>
            <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Se puede cambiar en «Montos de cuota».</div>
          </div>
        )}
        <div className="campo"><label>Concepto *</label><input value={datos.concepto} required onChange={(e) => set('concepto', e.target.value)} /></div>
        <div className="campo"><label>Fecha de vencimiento</label><input type="date" value={datos.fecha_vencimiento} onChange={(e) => set('fecha_vencimiento', e.target.value)} /></div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Generando...' : 'Emitir cuotas'}</button>
        </div>
      </form>
    </div>
  );
}

// Editor de los montos de cuota por tipo de propiedad (se actualizan con la inflación/costos).
function ModalMontos({ onCerrar, onGuardado }) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { api.get('/configuracion').then((c) => setCfg({ cuota_solar: c.cuota_solar || '0', cuota_edificado: c.cuota_edificado || '0' })).catch(() => setCfg({ cuota_solar: '0', cuota_edificado: '0' })); }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setError(null);
    try {
      await api.put('/configuracion', { cuota_solar: String(cfg.cuota_solar), cuota_edificado: String(cfg.cuota_edificado) });
      onGuardado('Montos de cuota actualizados.');
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  if (!cfg) return null;
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>Montos de cuota de mantenimiento</h3>
        <p className="descripcion">Define cuánto paga cada propietario según su tipo de propiedad. Actualízalo cuando cambien la inflación o los costos de la asociación.</p>
        <div className="fila">
          <div className="campo"><label>Cuota para SOLAR</label><input type="number" step="any" min="0" value={cfg.cuota_solar} onChange={(e) => setCfg((c) => ({ ...c, cuota_solar: e.target.value }))} /></div>
          <div className="campo"><label>Cuota para EDIFICADO</label><input type="number" step="any" min="0" value={cfg.cuota_edificado} onChange={(e) => setCfg((c) => ({ ...c, cuota_edificado: e.target.value }))} /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar montos'}</button>
        </div>
      </form>
    </div>
  );
}

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'cheque'];

// Registrar un abono al propietario: se aplica a la cuota más antigua primero.
function ModalPago({ propietario, onCerrar, onPagado }) {
  const [facturas, setFacturas] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const lista = await api.get(`/facturas?propietario_id=${propietario.propietario_id}`);
    const abiertas = lista
      .filter((f) => (f.estado === 'pendiente' || f.estado === 'vencida') && efectivo(f) - Number(f.pagado) > 0.001)
      .sort((a, b) => String(a.fecha_vencimiento || a.fecha_emision || '').localeCompare(String(b.fecha_vencimiento || b.fecha_emision || '')) || a.id - b.id);
    setFacturas(abiertas);
    return abiertas;
  }, [propietario.propietario_id]);

  useEffect(() => {
    cargar().then((ab) => setMonto(ab.reduce((a, f) => a + (efectivo(f) - Number(f.pagado)), 0).toFixed(2))).catch((e) => setError(e.message));
  }, [cargar]);

  const saldoTotal = (facturas || []).reduce((a, f) => a + (efectivo(f) - Number(f.pagado)), 0);

  async function abonar(e) {
    e.preventDefault();
    setError(null); setMensaje(null); setGuardando(true);
    try {
      const r = await api.post('/cuentas-por-cobrar/abono', { propietario_id: propietario.propietario_id, monto: Number(monto), metodo });
      const saldadas = r.detalle.filter((d) => d.saldado).length;
      setMensaje(`Abono de ${dinero(r.aplicado)} aplicado a ${r.detalle.length} cuota(s)${saldadas ? `, ${saldadas} saldada(s)` : ''}.${r.sobrante > 0 ? ` Sobró ${dinero(r.sobrante)} (no había más saldo).` : ''}`);
      const ab = await cargar();
      setMonto(ab.reduce((a, f) => a + (efectivo(f) - Number(f.pagado)), 0).toFixed(2));
      onPagado();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar pago · {propietario.nombre}</h3>
        <p className="descripcion">El abono se aplica automáticamente a la cuota <strong>más antigua</strong> primero. Saldo total: <strong>{dinero(saldoTotal)}</strong>.</p>
        {error && <p className="error">{error}</p>}
        {mensaje && <p className="ok-msg">{mensaje}</p>}

        <form className="fila" style={{ alignItems: 'flex-end' }} onSubmit={abonar}>
          <div className="campo" style={{ margin: 0 }}><label>Monto a abonar</label><input type="number" step="any" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required /></div>
          <div className="campo" style={{ margin: 0 }}><label>Método</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              {METODOS.map((m) => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m}</option>)}
            </select>
          </div>
          <button type="submit" disabled={guardando || Number(monto) <= 0}>{guardando ? '...' : 'Abonar'}</button>
        </form>

        <h4 style={{ margin: '18px 0 8px' }}>Cuotas pendientes (de la más antigua)</h4>
        {!facturas ? (
          <div className="cargando">Cargando...</div>
        ) : facturas.length === 0 ? (
          <div className="vacio">Este propietario no tiene cuotas pendientes.</div>
        ) : (
          facturas.map((f) => {
            const saldo = efectivo(f) - Number(f.pagado);
            return (
              <div key={f.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                <strong>{f.concepto}</strong>
                <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>
                  {f.fecha_vencimiento ? `Vence ${fecha(f.fecha_vencimiento)} · ` : ''}
                  Saldo {dinero(saldo)}
                </div>
              </div>
            );
          })
        )}
        <div className="pie-modal"><button className="secundario" onClick={onCerrar}>Cerrar</button></div>
      </div>
    </div>
  );
}
