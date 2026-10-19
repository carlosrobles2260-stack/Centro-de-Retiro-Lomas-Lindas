import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero } from '../lib/format.jsx';

const BUCKETS = [
  { key: 'vigente', label: 'Por vencer', color: 'var(--verde)' },
  { key: 'd1_30', label: '1 – 30 días', color: 'var(--amarillo)' },
  { key: 'd31_60', label: '31 – 60 días', color: '#e67e22' },
  { key: 'd61', label: 'Más de 60 días', color: 'var(--rojo)' },
];

export default function CuentasPorCobrar() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

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
        <button className="secundario" onClick={marcarVencidas} disabled={ocupado}>
          {ocupado ? 'Actualizando...' : 'Marcar cuotas vencidas'}
        </button>
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
                      <button className="secundario" onClick={() => recordar(p)}>Recordatorio</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
