import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { fechaHora } from '../lib/format.jsx';

const ABRIR_SALIDA = [
  { valor: '1', label: 'Sí, abre también al salir' },
  { valor: '0', label: 'No, solo al entrar' },
];
const TIPO = { propietario: 'Propietario', visitante: 'Visitante', empleado: 'Empleado' };

// Configuración del acceso por QR y la barrera del portón + bitácora de accesos.
export default function ControlAcceso() {
  const [cfg, setCfg] = useState(null);
  const [bitacora, setBitacora] = useState([]);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const cargarBitacora = useCallback(() => {
    api.get('/acceso/bitacora').then(setBitacora).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/configuracion').then((c) => setCfg({
      acceso_rele_url: c.acceso_rele_url || '',
      acceso_token_ttl: c.acceso_token_ttl || '45',
      acceso_abrir_en_salida: c.acceso_abrir_en_salida ?? '1',
    })).catch((e) => setError(e.message));
    cargarBitacora();
  }, [cargarBitacora]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setError(null); setMsg(null);
    try {
      await api.put('/configuracion', {
        acceso_rele_url: String(cfg.acceso_rele_url || '').trim(),
        acceso_token_ttl: String(cfg.acceso_token_ttl || '45'),
        acceso_abrir_en_salida: String(cfg.acceso_abrir_en_salida || '1'),
      });
      setMsg('Configuración guardada.');
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  async function probar() {
    setProbando(true); setError(null); setMsg(null);
    try {
      const r = await api.post('/acceso/probar-barrera', {});
      const txt = {
        abierta: '✅ La barrera recibió la señal (abierta).',
        no_configurada: 'No hay URL de relé configurada todavía.',
        omitida: 'Señal omitida.',
        error: '⚠️ No se pudo contactar el relé. Revisa la URL y la conexión.',
      }[r.barrera] || `Respuesta: ${r.barrera}`;
      setMsg(txt);
    } catch (err) { setError(err.message); }
    finally { setProbando(false); }
  }

  if (error && !cfg) return <p className="error">{error}</p>;
  if (!cfg) return <div className="cargando">Cargando...</div>;

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Control de acceso (QR y barrera)</h2>
          <p className="descripcion">Acceso al proyecto por QR dinámico con antipassback. Aquí se configura la señal a la barrera del portón para cuando esté instalado el relé.</p>
        </div>
      </div>

      {msg && <p className="ok-msg" style={{ marginBottom: 12 }}>{msg}</p>}
      {error && <p className="error">{error}</p>}

      <form className="card" style={{ marginBottom: 18 }} onSubmit={guardar}>
        <div className="campo">
          <label>URL del relé / controlador de la barrera</label>
          <input value={cfg.acceso_rele_url} placeholder="https://… (vacío = no abre nada todavía)" onChange={(e) => set('acceso_rele_url', e.target.value)} />
          <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 4 }}>El sistema hace un POST a esta URL cuando un acceso es válido. Déjala vacía hasta tener el equipo del portón.</div>
        </div>
        <div className="fila">
          <div className="campo"><label>Validez del pase QR (segundos)</label><input type="number" min="10" max="300" value={cfg.acceso_token_ttl} onChange={(e) => set('acceso_token_ttl', e.target.value)} /></div>
          <div className="campo"><label>¿Abrir la barrera también al salir?</label>
            <select value={cfg.acceso_abrir_en_salida} onChange={(e) => set('acceso_abrir_en_salida', e.target.value)}>
              {ABRIR_SALIDA.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="pie-modal" style={{ justifyContent: 'flex-start', gap: 10 }}>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          <button type="button" className="secundario" onClick={probar} disabled={probando}>{probando ? 'Enviando...' : 'Probar barrera'}</button>
        </div>
      </form>

      <div className="barra">
        <h3 style={{ margin: 0 }}>Bitácora de accesos</h3>
        <button className="secundario" onClick={cargarBitacora}>Actualizar</button>
      </div>
      <div className="tabla-wrap">
        {bitacora.length === 0 ? (
          <div className="vacio">Aún no hay accesos registrados.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Movimiento</th><th>Barrera</th><th>Registró</th></tr>
            </thead>
            <tbody>
              {bitacora.map((a) => (
                <tr key={a.id}>
                  <td>{fechaHora(a.fecha)}</td>
                  <td>{TIPO[a.tipo_sujeto] || a.tipo_sujeto}</td>
                  <td><span className={`badge ${a.direccion === 'entrada' ? 'verde' : 'gris'}`}>{a.direccion}</span></td>
                  <td>{a.barrera || '—'}</td>
                  <td>{a.registrado_por_nombre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
