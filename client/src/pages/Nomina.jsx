import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { dinero } from '../lib/format.jsx';

const PERIODICIDAD = [
  { valor: 'mensual', label: 'Mensual' },
  { valor: 'quincenal', label: 'Quincenal' },
  { valor: 'semanal', label: 'Semanal' },
];

export default function Nomina() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [periodicidad, setPeriodicidad] = useState('quincenal');
  const [periodo, setPeriodo] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [tasas, setTasas] = useState(false);

  async function calcular() {
    setCargando(true); setError(null); setMensaje(null);
    try { setData(await api.get(`/nomina?periodicidad=${periodicidad}`)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  async function descontarPrestamos() {
    if (!confirm('¿Registrar el descuento de los préstamos activos de este período en la nómina? Reducirá el saldo de cada préstamo.')) return;
    try {
      const r = await api.post('/nomina/descontar-prestamos', { periodicidad, periodo, fecha });
      setMensaje(`Se registraron ${r.aplicados} descuento(s) de préstamo por ${dinero(r.total)}.`);
      calcular();
    } catch (e) { setError(e.message); }
  }

  async function volante(fila) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const L = 18; let y = 20;
    doc.setFontSize(15); doc.setTextColor(47, 110, 79);
    doc.text('Centro de Retiro Lomas Lindas', L, y); y += 7;
    doc.setFontSize(12); doc.setTextColor(40);
    doc.text('Volante de pago', L, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(90);
    doc.text(`Empleado: ${fila.nombre}${fila.puesto ? ' · ' + fila.puesto : ''}`, L, y); y += 6;
    doc.text(`Período: ${periodo || PERIODICIDAD.find((p) => p.valor === data.periodicidad)?.label} · Fecha: ${fecha}`, L, y); y += 10;

    const linea = (et, val, neg) => {
      doc.setTextColor(neg ? 160 : 40, neg ? 60 : 40, neg ? 60 : 40);
      doc.text(et, L, y); doc.text((neg ? '- ' : '') + dinero(val), 192, y, { align: 'right' }); y += 7;
    };
    doc.setDrawColor(220); doc.line(L, y - 4, 192, y - 4);
    linea('Salario bruto del período', fila.bruto, false);
    linea(`AFP (pensión ${(data.tasas.afp * 100).toFixed(2)}%)`, fila.afp, true);
    linea(`SFS (salud ${(data.tasas.sfs * 100).toFixed(2)}%)`, fila.sfs, true);
    if (fila.isr > 0) linea('ISR (impuesto sobre la renta)', fila.isr, true);
    if (fila.prestamo > 0) linea('Descuento de préstamo', fila.prestamo, true);
    doc.setDrawColor(220); doc.line(L, y - 3, 192, y - 3); y += 2;
    doc.setTextColor(40); doc.setFontSize(10);
    doc.text('Total deducciones', L, y); doc.text(dinero(fila.deducciones), 192, y, { align: 'right' }); y += 9;
    doc.setFontSize(13); doc.setTextColor(47, 110, 79);
    doc.text('NETO A PAGAR', L, y); doc.text(dinero(fila.neto), 192, y, { align: 'right' }); y += 14;
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Documento informativo. Deducciones estimadas de ley (TSS: AFP y SFS; ISR según escala DGII).', L, y);
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, L, 285);
    doc.save(`volante-${fila.nombre.replace(/\s+/g, '-')}.pdf`);
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Nómina por período</h2>
          <p className="descripcion">Cálculo de nómina con deducciones de ley (AFP, SFS e ISR) y descuento de préstamos. Genera el volante de pago de cada empleado.</p>
        </div>
        <button className="secundario" onClick={() => setTasas(true)}>Tasas de ley</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="campo" style={{ margin: 0 }}><label>Periodicidad</label>
            <select value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)}>
              {PERIODICIDAD.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
            </select>
          </div>
          <div className="campo" style={{ margin: 0 }}><label>Período (etiqueta)</label><input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ej: Octubre 2a quincena" /></div>
          <div className="campo" style={{ margin: 0 }}><label>Fecha de pago</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <button onClick={calcular} disabled={cargando}>{cargando ? 'Calculando...' : 'Calcular nómina'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="ok-msg" style={{ marginBottom: 12 }}>{mensaje}</p>}

      {data && (
        <>
          <div className="barra">
            <div className="descripcion">Deducciones de ley: AFP {(data.tasas.afp * 100).toFixed(2)}% · SFS {(data.tasas.sfs * 100).toFixed(2)}% · ISR según escala DGII (exento hasta {dinero(data.tasas.isr_exento)}/año).</div>
            <button className="secundario" onClick={descontarPrestamos} disabled={data.totales.prestamo <= 0}>Descontar préstamos del período</button>
          </div>
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr><th>Empleado</th><th>Bruto</th><th>AFP</th><th>SFS</th><th>ISR</th><th>Préstamo</th><th>Deducciones</th><th>Neto</th><th></th></tr>
              </thead>
              <tbody>
                {data.empleados.map((f) => (
                  <tr key={f.empleado_id}>
                    <td><strong>{f.nombre}</strong>{f.puesto && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{f.puesto}</div>}</td>
                    <td>{dinero(f.bruto)}</td>
                    <td>{dinero(f.afp)}</td>
                    <td>{dinero(f.sfs)}</td>
                    <td>{f.isr > 0 ? dinero(f.isr) : '—'}</td>
                    <td>{f.prestamo > 0 ? dinero(f.prestamo) : '—'}</td>
                    <td>{dinero(f.deducciones)}</td>
                    <td style={{ fontWeight: 700 }}>{dinero(f.neto)}</td>
                    <td><button className="secundario" onClick={() => volante(f)}>Volante</button></td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td>Totales</td>
                  <td>{dinero(data.totales.bruto)}</td>
                  <td>{dinero(data.totales.afp)}</td>
                  <td>{dinero(data.totales.sfs)}</td>
                  <td>{dinero(data.totales.isr)}</td>
                  <td>{dinero(data.totales.prestamo)}</td>
                  <td>{dinero(data.totales.deducciones)}</td>
                  <td>{dinero(data.totales.neto)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {tasas && <ModalTasas onCerrar={() => setTasas(false)} onGuardado={() => { setTasas(false); setMensaje('Tasas actualizadas.'); if (data) calcular(); }} />}
    </div>
  );
}

// Editor de las tasas de ley (AFP, SFS y escala del ISR).
const CAMPOS_TASAS = [
  { k: 'nomina_afp', l: 'AFP — pensión (%)' },
  { k: 'nomina_sfs', l: 'SFS — salud (%)' },
  { k: 'isr_exento', l: 'ISR: exento hasta (RD$/año)' },
  { k: 'isr_tramo2', l: 'ISR: tope tramo 2 (RD$/año)' },
  { k: 'isr_tasa2', l: 'ISR: tasa tramo 2 (%)' },
  { k: 'isr_tramo3', l: 'ISR: tope tramo 3 (RD$/año)' },
  { k: 'isr_tasa3', l: 'ISR: tasa tramo 3 (%)' },
  { k: 'isr_tasa4', l: 'ISR: tasa tramo 4 (%)' },
];

function ModalTasas({ onCerrar, onGuardado }) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/configuracion').then((c) => {
      const o = {};
      for (const { k } of CAMPOS_TASAS) o[k] = c[k] ?? '';
      setCfg(o);
    }).catch(() => setCfg({}));
  }, []);

  async function guardar(e) {
    e.preventDefault(); setGuardando(true); setError(null);
    try { await api.put('/configuracion', cfg); onGuardado(); }
    catch (err) { setError(err.message); setGuardando(false); }
  }

  if (!cfg) return null;
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>Tasas de ley (nómina)</h3>
        <p className="descripcion">Tasas de AFP y SFS, y la escala del ISR (DGII). Actualízalas cuando cambien las normas de la TSS o la DGII.</p>
        <div className="ficha-grid">
          {CAMPOS_TASAS.map(({ k, l }) => (
            <div className="campo" key={k} style={{ margin: 0 }}>
              <label>{l}</label>
              <input type="number" step="any" min="0" value={cfg[k]} onChange={(e) => setCfg((c) => ({ ...c, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar tasas'}</button>
        </div>
      </form>
    </div>
  );
}
