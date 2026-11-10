import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const nf = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 });

export default function Bancos() {
  const [cuentas, setCuentas] = useState([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [saldos, setSaldos] = useState({}); // `${cuentaId}:${YYYY-MM}` -> saldo
  const [modal, setModal] = useState(null); // {} nuevo | fila editar
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const c = await api.get('/bancos');
      setCuentas(Array.isArray(c) ? c : (c.datos || []));
      const s = await api.get(`/bancos/saldos?desde=${anio}-01&hasta=${anio}-12`);
      const map = {};
      for (const f of s) map[`${f.cuenta_id}:${f.periodo}`] = f.saldo;
      setSaldos(map);
      setError(null);
    } catch (e) { setError(e.message); }
  }, [anio]);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardarSaldo(cuentaId, mesIdx, valorStr) {
    const periodo = `${anio}-${String(mesIdx + 1).padStart(2, '0')}`;
    const saldo = Number(String(valorStr).replace(/[^0-9.-]/g, '')) || 0;
    setSaldos((p) => ({ ...p, [`${cuentaId}:${periodo}`]: saldo }));
    try { await api.put('/bancos/saldos', { cuenta_id: cuentaId, periodo, saldo }); }
    catch (e) { setError(e.message); }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar la cuenta ${c.nombre}? (se borran sus saldos)`)) return;
    await api.del(`/bancos/${c.id}`); cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Cuentas bancarias y saldos</h2>
          <p className="descripcion">Registra las cuentas y el <strong>saldo de cierre de cada mes</strong> (del estado del banco). Alimentan el Estado de Ingresos y Gastos.</p>
        </div>
        <button onClick={() => setModal({})}>+ Nueva cuenta</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="barra-busqueda">
        <label style={{ margin: 0 }}>Año <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 90 }} /></label>
      </div>

      <div className="tabla-wrap">
        {cuentas.length === 0 ? (
          <div className="vacio">No hay cuentas. Agrega "Banreservas", "BHD", etc.</div>
        ) : (
          <table className="tabla-eig">
            <thead>
              <tr>
                <th className="col-concepto">Cuenta</th>
                {MESES.map((m) => <th key={m}>{m}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id}>
                  <td className="col-concepto">
                    <strong>{c.nombre}</strong>{c.numero ? <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>#{c.numero}</div> : null}
                    <div className="dir-acc" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                      <button className="secundario chico" onClick={() => setModal(c)}>Editar</button>
                      <button className="peligro chico" onClick={() => eliminar(c)}>Eliminar</button>
                    </div>
                  </td>
                  {MESES.map((m, i) => {
                    const key = `${c.id}:${anio}-${String(i + 1).padStart(2, '0')}`;
                    return (
                      <td key={m} className="num">
                        <input
                          className="saldo-input"
                          defaultValue={saldos[key] != null ? nf.format(saldos[key]) : ''}
                          key={key + ':' + (saldos[key] ?? '')}
                          onBlur={(e) => guardarSaldo(c.id, i, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="descripcion" style={{ marginTop: 10 }}>💡 Escribe el saldo al cierre de cada mes y sal del campo (Tab) para guardar. El "efectivo inicial" de un mes es el cierre del mes anterior.</p>

      <InstruccionesPago />

      {modal && <ModalCuenta cuenta={modal} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); cargar(); }} />}
    </div>
  );
}

function ModalCuenta({ cuenta, onCerrar, onGuardado }) {
  const esNuevo = !cuenta.id;
  const [datos, setDatos] = useState({
    nombre: cuenta.nombre || '', numero: cuenta.numero || '',
    titular: cuenta.titular || '', tipo_cuenta: cuenta.tipo_cuenta || '',
    para_pago: cuenta.para_pago ?? 1, orden: cuenta.orden ?? 0,
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function enviar(e) {
    e.preventDefault();
    if (!datos.nombre.trim()) { setError('Escribe el nombre del banco.'); return; }
    setGuardando(true); setError(null);
    try {
      const payload = { ...datos, para_pago: Number(datos.para_pago) ? 1 : 0 };
      if (esNuevo) await api.post('/bancos', payload);
      else await api.put(`/bancos/${cuenta.id}`, payload);
      onGuardado();
    } catch (e) { setError(e.message); setGuardando(false); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{esNuevo ? 'Nueva cuenta bancaria' : 'Editar cuenta'}</h3>
        <div className="campo"><label>Banco / nombre *</label><input value={datos.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej.: Banreservas" required /></div>
        <div className="campo"><label>Número de cuenta</label><input value={datos.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Ej.: 2460003514" /></div>
        <div className="campo"><label>Titular (a nombre de quién)</label><input value={datos.titular} onChange={(e) => set('titular', e.target.value)} placeholder="Ej.: Asociación de Propietarios Lomas Lindas" /></div>
        <div className="fila">
          <div className="campo">
            <label>Tipo de cuenta</label>
            <select value={datos.tipo_cuenta} onChange={(e) => set('tipo_cuenta', e.target.value)}>
              <option value="">—</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
          <div className="campo"><label>Orden</label><input type="number" value={datos.orden} onChange={(e) => set('orden', e.target.value)} /></div>
        </div>
        <div className="campo">
          <label className="sync-check">
            <input type="checkbox" checked={!!Number(datos.para_pago)} onChange={(e) => set('para_pago', e.target.checked ? 1 : 0)} />
            Mostrar al propietario como cuenta para pagar la cuota
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

// Editor de las instrucciones de pago que ve el propietario (claves de configuración).
function InstruccionesPago() {
  const [cfg, setCfg] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.get('/configuracion').then((c) => setCfg({
      pago_titular: c.pago_titular || '', pago_instrucciones: c.pago_instrucciones || '',
      pago_whatsapp: c.pago_whatsapp || '', pago_correo: c.pago_correo || '',
    })).catch((e) => setError(e.message));
  }, []);
  const set = (k, v) => { setCfg((c) => ({ ...c, [k]: v })); setGuardado(false); };
  async function guardar() {
    try { await api.put('/configuracion', cfg); setGuardado(true); setError(null); }
    catch (e) { setError(e.message); }
  }
  if (!cfg) return null;
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h3 style={{ marginTop: 0 }}>Instrucciones de pago (las ve el propietario)</h3>
      <p className="descripcion">Esto aparece en el portal del propietario, en «Estado de cuenta → Cómo pagar tu cuota», junto a las cuentas marcadas para pago.</p>
      <div className="campo"><label>Titular por defecto (si la cuenta no lo trae)</label><input value={cfg.pago_titular} onChange={(e) => set('pago_titular', e.target.value)} /></div>
      <div className="campo"><label>Instrucciones (qué hacer para notificar el pago)</label><textarea rows={3} value={cfg.pago_instrucciones} onChange={(e) => set('pago_instrucciones', e.target.value)} /></div>
      <div className="fila">
        <div className="campo"><label>WhatsApp de la oficina</label><input value={cfg.pago_whatsapp} onChange={(e) => set('pago_whatsapp', e.target.value)} placeholder="Ej.: 809-000-0000" /></div>
        <div className="campo"><label>Correo de la oficina</label><input value={cfg.pago_correo} onChange={(e) => set('pago_correo', e.target.value)} placeholder="correo@ejemplo.com" /></div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="pie-modal" style={{ justifyContent: 'flex-start' }}>
        <button onClick={guardar}>Guardar instrucciones</button>
        {guardado && <span style={{ color: 'var(--verde)', alignSelf: 'center' }}>✓ Guardado</span>}
      </div>
    </div>
  );
}
