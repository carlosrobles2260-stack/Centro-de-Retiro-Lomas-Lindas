import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { exportarExcel, exportarPDF } from '../lib/exportar.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiquetaMes = (per) => {
  const [y, m] = per.split('-');
  return `${MESES[Number(m) - 1]}-${y.slice(2)}`;
};
// Grupos de gastos en el orden del estado del contador.
const GRUPOS = [
  { clave: 'mantenimiento', etiqueta: 'Gastos de Mantenimiento' },
  { clave: 'personal', etiqueta: 'Gastos de Personal' },
  { clave: 'financieros', etiqueta: 'Gastos Financieros' },
  { clave: 'generales', etiqueta: 'Gastos Generales' },
];
const nf = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 });
const n = (v) => (v || v === 0 ? nf.format(Math.round(v)) : '—');

function anioActual() { return new Date().getFullYear(); }
function mesActual() { return String(new Date().getMonth() + 1).padStart(2, '0'); }

export default function EstadoIngresosGastos() {
  const [anio, setAnio] = useState(anioActual());
  const [desdeMes, setDesdeMes] = useState('01');
  const [hastaMes, setHastaMes] = useState(mesActual());
  const [detalle, setDetalle] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await api.get(`/reportes/estado-ingresos-gastos?desde=${anio}-${desdeMes}&hasta=${anio}-${hastaMes}`);
      setData(d); setError(null);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [anio, desdeMes, hastaMes]);
  useEffect(() => { cargar(); }, [cargar]);

  // Suma total por mes de un grupo de gastos { concepto: {per: monto} }.
  function totalGrupo(grupo, per) {
    const g = data?.gastos?.[grupo] || {};
    return Object.values(g).reduce((a, cm) => a + (cm[per] || 0), 0);
  }
  function totalGastos(per) {
    return Object.keys(data?.gastos || {}).reduce((a, g) => a + totalGrupo(g, per), 0);
  }
  const efTotal = (mapa, per) => data.cuentas.reduce((a, c) => a + (mapa[c.id]?.[per] || 0), 0);

  // Arma las filas (etiqueta + valores por mes) para pantalla y exportación.
  function filas() {
    if (!data) return [];
    const P = data.periodos;
    const out = [];
    const fila = (etiqueta, fn, clase) => out.push({ etiqueta, clase, vals: P.map(fn) });
    fila('EFECTIVO AL INICIO DEL PERÍODO', () => '', 'titulo');
    data.cuentas.forEach((c) => fila(`  ${c.nombre}${c.numero ? ' #' + c.numero : ''}`, (p) => data.efectivoInicial[c.id]?.[p]));
    fila('Total Efectivo Al Inicio', (p) => efTotal(data.efectivoInicial, p), 'sub');
    fila('INGRESOS (COBROS)', () => '', 'titulo');
    fila('  Cuotas De Casas Y Solares', (p) => data.ingresos[p] || 0);
    fila('Total De Ingresos', (p) => data.ingresos[p] || 0, 'sub');
    fila('GASTOS', () => '', 'titulo');
    for (const g of GRUPOS) {
      const sub = data.gastos?.[g.clave];
      if (!sub) continue;
      if (detalle) {
        Object.entries(sub).forEach(([concepto, cm]) => fila(`  ${concepto}`, (p) => cm[p] || 0));
      }
      fila(`  ${g.etiqueta}`, (p) => totalGrupo(g.clave, p), detalle ? 'sub' : null);
    }
    fila('Total De Gastos', (p) => totalGastos(p), 'sub');
    fila('EFECTIVO AL FINAL DEL PERÍODO', () => '', 'titulo');
    data.cuentas.forEach((c) => fila(`  ${c.nombre}${c.numero ? ' #' + c.numero : ''}`, (p) => data.efectivoFinal[c.id]?.[p]));
    fila('Total Efectivo Al Final', (p) => efTotal(data.efectivoFinal, p), 'sub');
    return out;
  }

  function exportar(tipo) {
    const P = data.periodos;
    const columnas = [{ key: 'etiqueta', label: 'Concepto', ancho: 34 },
      ...P.map((p) => ({ key: p, label: etiquetaMes(p), fmt: (v) => (v || v === 0) && v !== '' ? n(v) : '', ancho: 12 }))];
    const fs = filas().map((f) => ({ etiqueta: f.etiqueta.trim(), ...Object.fromEntries(P.map((p, i) => [p, f.vals[i]])) }));
    const sub = `Del ${anio}-${desdeMes} al ${anio}-${hastaMes}`;
    if (tipo === 'excel') exportarExcel({ nombre: `estado-ingresos-gastos-${anio}`, hoja: 'Estado', columnas, filas: fs });
    else exportarPDF({ titulo: 'Estado de Ingresos y Gastos', subtitulo: `Asociación de Propietarios Centro de Retiro Lomas Lindas · ${sub}`, nombre: `estado-ingresos-gastos-${anio}`, columnas, filas: fs });
  }

  const opcMes = MESES.map((m, i) => ({ v: String(i + 1).padStart(2, '0'), t: m }));

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Estado de Ingresos y Gastos</h2>
          <p className="descripcion">Resumen mensual de ingresos (cuotas), gastos por categoría y efectivo por banco.</p>
        </div>
        <div className="filtros">
          <button className="secundario" onClick={() => exportar('excel')} disabled={!data}>Excel</button>
          <button className="secundario" onClick={() => exportar('pdf')} disabled={!data}>PDF</button>
        </div>
      </div>

      <div className="barra-busqueda">
        <label style={{ margin: 0 }}>Año <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: 90 }} /></label>
        <label style={{ margin: 0 }}>Desde <select value={desdeMes} onChange={(e) => setDesdeMes(e.target.value)}>{opcMes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></label>
        <label style={{ margin: 0 }}>Hasta <select value={hastaMes} onChange={(e) => setHastaMes(e.target.value)}>{opcMes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></label>
        <label className="recordar" style={{ margin: 0 }}><input type="checkbox" checked={detalle} onChange={(e) => setDetalle(e.target.checked)} /><span>Ver detalle de gastos</span></label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabla-wrap">
        {cargando ? <div className="cargando">Cargando...</div> : !data?.cuentas?.length && Object.keys(data?.gastos || {}).length === 0 && !Object.keys(data?.ingresos || {}).length ? (
          <div className="vacio">Sin datos para el período. Registra pagos, gastos y los saldos de los bancos.</div>
        ) : (
          <table className="tabla-eig">
            <thead>
              <tr>
                <th className="col-concepto">Concepto</th>
                {data.periodos.map((p) => <th key={p}>{etiquetaMes(p)}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas().map((f, i) => (
                <tr key={i} className={f.clase || ''}>
                  <td className="col-concepto">{f.etiqueta}</td>
                  {f.vals.map((v, j) => <td key={j} className="num">{v === '' ? '' : n(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="descripcion" style={{ marginTop: 12 }}>
        ⚙️ Los <strong>saldos de los bancos</strong> se capturan en <strong>Cuentas bancarias</strong>. Los <strong>ingresos</strong> salen de los pagos de cuotas y los <strong>gastos</strong> del módulo Gastos.
      </p>
    </div>
  );
}
