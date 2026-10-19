import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha } from '../lib/format.jsx';
import { exportarExcel, exportarPDF } from '../lib/exportar.js';

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
                    {p.propiedad && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{p.propiedad}</div>}
                  </td>
                  <td>{p.cuotas}{p.cuotas_vencidas > 0 && <span style={{ color: 'var(--rojo)', fontSize: 12 }}> · {p.cuotas_vencidas} vencida(s)</span>}</td>
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

// Emisión masiva de la cuota del mes a todos los propietarios activos.
function ModalEmitir({ onCerrar, onHecho }) {
  const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const [datos, setDatos] = useState({ concepto: `Cuota de mantenimiento ${mes}`, monto: '', fecha_vencimiento: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true); setError(null);
    try {
      const r = await api.post('/facturas/generar-mensuales', {
        concepto: datos.concepto, monto: Number(datos.monto) || 0, fecha_vencimiento: datos.fecha_vencimiento || null,
      });
      onHecho(`Se generaron ${r.creadas} cuota(s)${r.omitidas ? `; ${r.omitidas} ya existían este mes` : ''}.`);
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Emitir cuotas del mes</h3>
        <p className="descripcion">Se crea una cuota para cada propietario activo. No se duplica si ya existe una con el mismo concepto este mes.</p>
        <div className="campo"><label>Concepto *</label><input value={datos.concepto} required onChange={(e) => set('concepto', e.target.value)} /></div>
        <div className="fila">
          <div className="campo"><label>Monto por propietario *</label><input type="number" step="any" min="0" value={datos.monto} required onChange={(e) => set('monto', e.target.value)} /></div>
          <div className="campo"><label>Fecha de vencimiento</label><input type="date" value={datos.fecha_vencimiento} onChange={(e) => set('fecha_vencimiento', e.target.value)} /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Generando...' : 'Emitir cuotas'}</button>
        </div>
      </form>
    </div>
  );
}

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'cheque'];

// Registrar abonos a las cuotas abiertas de un propietario.
function ModalPago({ propietario, onCerrar, onPagado }) {
  const [facturas, setFacturas] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    const lista = await api.get(`/facturas?propietario_id=${propietario.propietario_id}`);
    setFacturas(lista.filter((f) => (f.estado === 'pendiente' || f.estado === 'vencida') && Number(f.monto) - Number(f.pagado) > 0.001));
  }, [propietario.propietario_id]);

  useEffect(() => { cargar().catch((e) => setError(e.message)); }, [cargar]);

  async function abonar(factura, monto, metodo) {
    setError(null); setMensaje(null);
    try {
      await api.post(`/facturas/${factura.id}/pagos`, { monto: Number(monto), metodo });
      setMensaje('Pago registrado.');
      await cargar();
      onPagado();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Registrar pago · {propietario.nombre}</h3>
        <p className="descripcion">Abona a las cuotas pendientes. El saldo se actualiza al guardar.</p>
        {error && <p className="error">{error}</p>}
        {mensaje && <p className="ok-msg">{mensaje}</p>}
        {!facturas ? (
          <div className="cargando">Cargando cuotas...</div>
        ) : facturas.length === 0 ? (
          <div className="vacio">Este propietario no tiene cuotas pendientes.</div>
        ) : (
          facturas.map((f) => <FilaAbono key={f.id} factura={f} onAbonar={abonar} />)
        )}
        <div className="pie-modal"><button className="secundario" onClick={onCerrar}>Cerrar</button></div>
      </div>
    </div>
  );
}

function FilaAbono({ factura, onAbonar }) {
  const saldo = Number(factura.monto) - Number(factura.pagado);
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [metodo, setMetodo] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);

  async function registrar() {
    setGuardando(true);
    await onAbonar(factura, monto, metodo);
    setGuardando(false);
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <strong>{factura.concepto}</strong>
          <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
            {factura.fecha_vencimiento ? `Vence ${fecha(factura.fecha_vencimiento)} · ` : ''}Saldo {dinero(saldo)}
          </div>
        </div>
      </div>
      <div className="fila" style={{ marginTop: 8, alignItems: 'flex-end' }}>
        <div className="campo" style={{ margin: 0 }}><label>Monto</label><input type="number" step="any" min="0" max={saldo} value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
        <div className="campo" style={{ margin: 0 }}><label>Método</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m}</option>)}
          </select>
        </div>
        <button onClick={registrar} disabled={guardando || Number(monto) <= 0}>{guardando ? '...' : 'Abonar'}</button>
      </div>
    </div>
  );
}
