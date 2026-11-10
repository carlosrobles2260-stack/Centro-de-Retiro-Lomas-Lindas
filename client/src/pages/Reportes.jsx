import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha, fechaHora } from '../lib/format.jsx';
import { exportarExcel, exportarPDF } from '../lib/exportar.js';

// Definición de los reportes disponibles.
const REPORTES = {
  financiero: {
    titulo: 'Reporte financiero',
    conRango: true,
    endpoint: (d, h) => `/reportes/financiero?desde=${d}&hasta=${h}`,
    filas: (r) => [
      ...r.pagos.map((p) => ({ tipo: 'Ingreso', fecha: p.fecha, concepto: p.concepto, detalle: p.propietario, categoria: p.metodo, monto: p.monto })),
      ...r.gastos.map((g) => ({ tipo: 'Gasto', fecha: g.fecha, concepto: g.concepto, detalle: g.proveedor, categoria: g.categoria, monto: -g.monto })),
    ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    resumen: (r) => `Ingresos: ${dinero(r.resumen.ingresos)} · Gastos: ${dinero(r.resumen.gastos)} · Balance: ${dinero(r.resumen.balance)}`,
    columnas: [
      { key: 'tipo', label: 'Tipo' },
      { key: 'fecha', label: 'Fecha', fmt: fecha },
      { key: 'concepto', label: 'Concepto', ancho: 30 },
      { key: 'detalle', label: 'Propietario / Proveedor', ancho: 24 },
      { key: 'categoria', label: 'Método / Categoría' },
      { key: 'monto', label: 'Monto', fmt: (v) => dinero(v) },
    ],
  },
  'estado-cuenta': {
    titulo: 'Estado de cuenta de propietarios',
    conRango: false,
    endpoint: () => '/reportes/estado-cuenta',
    filas: (r) => r.filas,
    resumen: (r) => `Total por cobrar: ${dinero(r.totalPorCobrar)} · ${r.total} propietarios`,
    columnas: [
      { key: 'nombre', label: 'Propietario', ancho: 26 },
      { key: 'propiedad', label: 'Propiedad' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'facturas_pendientes', label: 'Facturas pendientes' },
      { key: 'saldo', label: 'Saldo', fmt: (v) => dinero(v) },
    ],
  },
  visitas: {
    titulo: 'Reporte de visitas',
    conRango: true,
    endpoint: (d, h) => `/reportes/visitas?desde=${d}&hasta=${h}`,
    filas: (r) => r.filas,
    resumen: (r) => `${r.total} visitas en el período`,
    columnas: [
      { key: 'creado_en', label: 'Registrada', fmt: fechaHora },
      { key: 'visitante', label: 'Visitante', ancho: 24 },
      { key: 'visitante_tipo', label: 'Tipo' },
      { key: 'propietario', label: 'Propietario', ancho: 24 },
      { key: 'estado', label: 'Estado' },
      { key: 'fecha_entrada', label: 'Entrada', fmt: fechaHora },
      { key: 'fecha_salida', label: 'Salida', fmt: fechaHora },
      { key: 'autorizado_por', label: 'Autorizó' },
    ],
  },
  incidentes: {
    titulo: 'Bitácora de incidentes',
    conRango: true,
    endpoint: (d, h) => `/reportes/incidentes?desde=${d}&hasta=${h}`,
    filas: (r) => r.filas,
    resumen: (r) => `${r.total} incidentes en el período`,
    columnas: [
      { key: 'fecha', label: 'Fecha', fmt: fechaHora },
      { key: 'tipo', label: 'Tipo' },
      { key: 'descripcion', label: 'Descripción', ancho: 36 },
      { key: 'ubicacion', label: 'Ubicación' },
      { key: 'gravedad', label: 'Gravedad' },
      { key: 'estado', label: 'Estado' },
      { key: 'reportado_por', label: 'Reportó' },
    ],
  },
};

const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = hoy.slice(0, 8) + '01';

export default function Reportes() {
  const [tipo, setTipo] = useState('financiero');
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const def = REPORTES[tipo];

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await api.get(def.endpoint(desde, hasta)));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [tipo, desde, hasta]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);

  const filas = datos ? def.filas(datos) : [];
  const subtitulo = def.conRango ? `Período: ${fecha(desde)} — ${fecha(hasta)}` : `Al ${fecha(hoy)}`;
  const nombreArchivo = `${tipo}_${desde}_${hasta}`;

  function excel() {
    exportarExcel({ nombre: nombreArchivo, hoja: def.titulo, columnas: def.columnas, filas });
  }
  function pdf() {
    exportarPDF({ titulo: def.titulo, subtitulo, nombre: nombreArchivo, columnas: def.columnas, filas });
  }

  return (
    <div>
      <h2>Reportes</h2>
      <p className="descripcion">Consulta y exporta reportes administrativos y de seguridad en Excel o PDF.</p>

      <div className="barra">
        <div className="filtros">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(REPORTES).map(([k, v]) => <option key={k} value={k}>{v.titulo}</option>)}
          </select>
          {def.conRango && (
            <>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </>
          )}
        </div>
        <div className="filtros">
          <button className="secundario" onClick={excel} disabled={!filas.length}>Exportar Excel</button>
          <button onClick={pdf} disabled={!filas.length}>Exportar PDF</button>
        </div>
      </div>

      {datos && <div className="card" style={{ marginBottom: 16 }}><strong>{def.resumen(datos)}</strong></div>}
      {error && <p className="error">{error}</p>}

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay datos para este reporte en el período seleccionado.</div>
        ) : (
          <table>
            <thead>
              <tr>{def.columnas.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.id ?? i}>
                  {def.columnas.map((c) => {
                    const valor = c.key.split('.').reduce((o, k) => (o ? o[k] : undefined), f);
                    return <td key={c.key}>{c.fmt ? c.fmt(valor, f) : (valor ?? '—')}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
