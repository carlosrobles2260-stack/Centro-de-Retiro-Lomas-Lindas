import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { dinero } from '../lib/format.jsx';
import { exportarExcel, exportarPDF } from '../lib/exportar.js';

const num2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const COLUMNAS_NOMINA = [
  { key: 'nombre', label: 'Empleado', ancho: 26 },
  { key: 'puesto', label: 'Puesto', ancho: 20 },
  { key: 'bruto', label: 'Bruto (RD$)', fmt: num2 },
  { key: 'afp', label: 'AFP (RD$)', fmt: num2 },
  { key: 'sfs', label: 'SFS (RD$)', fmt: num2 },
  { key: 'isr', label: 'ISR (RD$)', fmt: num2 },
  { key: 'prestamo', label: 'Préstamo (RD$)', fmt: num2 },
  { key: 'deducciones', label: 'Deducciones (RD$)', fmt: num2 },
  { key: 'neto', label: 'Neto (RD$)', fmt: num2 },
  { key: 'aporte_patronal', label: 'Aporte patronal (RD$)', fmt: num2 },
  { key: 'costo_total', label: 'Costo total (RD$)', fmt: num2 },
];

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

  function filasExport() {
    const t = data.totales;
    return [
      ...data.empleados,
      { nombre: 'TOTALES', puesto: '', bruto: t.bruto, afp: t.afp, sfs: t.sfs, isr: t.isr, prestamo: t.prestamo, deducciones: t.deducciones, neto: t.neto, aporte_patronal: t.aporte_patronal, costo_total: t.costo_total },
    ];
  }

  function exportar(tipo) {
    const etiquetaPer = PERIODICIDAD.find((p) => p.valor === data.periodicidad)?.label;
    const nombre = `nomina-${(periodo || etiquetaPer).replace(/\s+/g, '-')}`;
    if (tipo === 'excel') {
      exportarExcel({ nombre, hoja: 'Nómina', columnas: COLUMNAS_NOMINA, filas: filasExport() });
    } else {
      const subtitulo = `Período: ${periodo || etiquetaPer} · ${etiquetaPer} · Pago: ${fecha} · Neto total: ${dinero(data.totales.neto)}`;
      exportarPDF({ titulo: 'Reporte de nómina', subtitulo, nombre, columnas: COLUMNAS_NOMINA, filas: filasExport() });
    }
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
    if (fila.aporte_patronal > 0) {
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Aporte patronal TSS a cargo de la asociación (no descontado al empleado): ${dinero(fila.aporte_patronal)}`, L, y); y += 6;
    }
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
            <div className="filtros">
              <button className="secundario" onClick={() => exportar('excel')}>Excel</button>
              <button className="secundario" onClick={() => exportar('pdf')}>PDF</button>
              <button className="secundario" onClick={descontarPrestamos} disabled={data.totales.prestamo <= 0}>Descontar préstamos del período</button>
            </div>
          </div>
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr><th>Empleado</th><th>Bruto</th><th>AFP</th><th>SFS</th><th>ISR</th><th>Préstamo</th><th>Deducciones</th><th>Neto</th><th></th></tr>
              </thead>
              <tbody>
                {data.empleados.map((f) => (
                  <tr key={f.empleado_id}>
                    <td><strong>{f.nombre}</strong>{f.puesto && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{f.puesto}</div>}</td>
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

          <h3 style={{ marginTop: 22 }}>Aportes patronales (TSS) y costo de nómina</h3>
          <p className="descripcion">Aportes a cargo de la asociación (no se descuentan al empleado): AFP {(data.tasas.afp_patronal * 100).toFixed(2)}% · SFS {(data.tasas.sfs_patronal * 100).toFixed(2)}% · Riesgos laborales {(data.tasas.srl * 100).toFixed(2)}% · INFOTEP {(data.tasas.infotep * 100).toFixed(2)}%.</p>
          {data.tasas.topes && (data.tasas.topes.sfs || data.tasas.topes.afp || data.tasas.topes.srl) && (
            <p className="descripcion">Topes de cotización (por salario mensual): SFS hasta {dinero(data.tasas.topes.sfs)} · AFP hasta {dinero(data.tasas.topes.afp)} · Riesgos laborales hasta {dinero(data.tasas.topes.srl)}. INFOTEP sin tope.</p>
          )}
          <div className="grid grid-3" style={{ marginBottom: 10 }}>
            <Stat etiqueta="AFP patronal (pensión)" valor={dinero(data.totales.afp_patronal)} />
            <Stat etiqueta="SFS patronal (salud)" valor={dinero(data.totales.sfs_patronal)} />
            <Stat etiqueta="Riesgos laborales (SRL)" valor={dinero(data.totales.srl)} />
            <Stat etiqueta="INFOTEP" valor={dinero(data.totales.infotep)} />
            <Stat etiqueta="Total aportes patronales" valor={dinero(data.totales.aporte_patronal)} clase="rojo" />
            <Stat etiqueta="Costo total de nómina" valor={dinero(data.totales.costo_total)} clase="verde" />
          </div>
          <p className="descripcion">Costo total = salario bruto del período ({dinero(data.totales.bruto)}) + aportes patronales ({dinero(data.totales.aporte_patronal)}).</p>
        </>
      )}

      {tasas && <ModalTasas onCerrar={() => setTasas(false)} onGuardado={() => { setTasas(false); setMensaje('Tasas actualizadas.'); if (data) calcular(); }} />}
    </div>
  );
}

function Stat({ etiqueta, valor, clase }) {
  return <div className="card stat"><div className="etiqueta">{etiqueta}</div><div className={`valor ${clase || ''}`}>{valor}</div></div>;
}

// Editor de las tasas de ley (AFP, SFS y escala del ISR).
const CAMPOS_TASAS = [
  { k: 'nomina_afp', l: 'AFP — pensión, empleado (%)' },
  { k: 'nomina_sfs', l: 'SFS — salud, empleado (%)' },
  { k: 'nomina_afp_patronal', l: 'AFP — pensión, patronal (%)' },
  { k: 'nomina_sfs_patronal', l: 'SFS — salud, patronal (%)' },
  { k: 'nomina_srl', l: 'Riesgos laborales — patronal (%)' },
  { k: 'nomina_infotep', l: 'INFOTEP — patronal (%)' },
  { k: 'tss_salario_min_cotizable', l: 'Salario mínimo cotizable (RD$) — 0 = sin topes' },
  { k: 'tss_tope_sfs', l: 'Tope SFS (× salario mín.)' },
  { k: 'tss_tope_afp', l: 'Tope AFP (× salario mín.)' },
  { k: 'tss_tope_srl', l: 'Tope riesgos laborales (× salario mín.)' },
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
