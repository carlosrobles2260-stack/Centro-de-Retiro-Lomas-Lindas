// Cálculo estimado de prestaciones laborales según el Código de Trabajo de la
// República Dominicana (Ministerio de Trabajo). Es una estimación de referencia;
// el cálculo oficial debe validarse con el Ministerio de Trabajo.

// Factor legal: salario diario = salario mensual / 23.83 (promedio de días/mes).
const DIAS_MES = 23.83;

const dias = (fecha) => new Date(String(fecha).slice(0, 10) + 'T00:00:00');

// Antigüedad entre dos fechas: años y meses completos, y días totales.
function antiguedad(ingreso, hasta) {
  const a = dias(ingreso), b = dias(hasta);
  let anios = b.getFullYear() - a.getFullYear();
  let meses = b.getMonth() - a.getMonth();
  let d = b.getDate() - a.getDate();
  if (d < 0) meses -= 1;
  if (meses < 0) { anios -= 1; meses += 12; }
  const mesesTotales = anios * 12 + meses;
  return { anios, meses, mesesTotales, diasTotales: Math.round((b - a) / 86400000) };
}

function diasPreaviso(m) {
  if (m < 3) return 0;
  if (m < 6) return 7;
  if (m < 12) return 14;
  return 28;
}

// Auxilio de cesantía (días), según antigüedad.
function diasCesantia(ant) {
  const m = ant.mesesTotales;
  if (m < 3) return 0;
  if (m < 6) return 6;
  if (m < 12) return 13;
  const tasa = ant.anios >= 5 ? 23 : 21; // 21 días/año (1-5 años), 23 días/año (+5 años)
  let d = tasa * ant.anios;
  if (ant.meses >= 3) d += tasa * (ant.meses / 12); // fracción > 3 meses, proporcional
  return d;
}

// Vacaciones (días) pendientes de pago.
function diasVacaciones(ant) {
  if (ant.mesesTotales < 12) return 14 * (ant.mesesTotales / 12); // proporcional el primer año
  return ant.anios >= 5 ? 18 : 14;
}

// Meses trabajados dentro del año calendario de la fecha de salida (para la regalía).
function mesesEnElAnio(ingreso, hasta) {
  const b = dias(hasta);
  const inicioAnio = new Date(b.getFullYear(), 0, 1);
  const desde = dias(ingreso) > inicioAnio ? dias(ingreso) : inicioAnio;
  const meses = (b.getFullYear() - desde.getFullYear()) * 12 + (b.getMonth() - desde.getMonth()) + (b.getDate() >= desde.getDate() ? 1 : 0);
  return Math.max(0, Math.min(12, meses));
}

/**
 * Calcula las prestaciones laborales.
 * @param {object} p { salarioMensual, fechaIngreso, hasta, tipo }
 *   tipo: 'desahucio' | 'despido' | 'renuncia'
 */
export function calcularPrestaciones({ salarioMensual, fechaIngreso, hasta, tipo = 'desahucio' }) {
  const salario = Number(salarioMensual) || 0;
  const fin = hasta || new Date().toISOString().slice(0, 10);
  const ant = antiguedad(fechaIngreso, fin);
  const salarioDiario = salario / DIAS_MES;

  const preDias = diasPreaviso(ant.mesesTotales);
  const cesDias = diasCesantia(ant);
  const vacDias = diasVacaciones(ant);
  const navidad = salario * mesesEnElAnio(fechaIngreso, fin) / 12;

  // Qué componentes aplican según el tipo de terminación.
  // - desahucio (lo ejerce el empleador): preaviso + cesantía + vacaciones + regalía.
  // - despido justificado / renuncia: solo derechos adquiridos (vacaciones + regalía).
  const esDesahucio = tipo === 'desahucio';

  const componentes = [
    { clave: 'preaviso', etiqueta: 'Preaviso', dias: preDias, monto: preDias * salarioDiario, aplica: esDesahucio },
    { clave: 'cesantia', etiqueta: 'Auxilio de cesantía', dias: cesDias, monto: cesDias * salarioDiario, aplica: esDesahucio },
    { clave: 'vacaciones', etiqueta: 'Vacaciones', dias: round2(vacDias), monto: vacDias * salarioDiario, aplica: true },
    { clave: 'navidad', etiqueta: 'Salario de Navidad (regalía)', dias: null, monto: navidad, aplica: true },
  ];

  const total = componentes.filter((c) => c.aplica).reduce((a, c) => a + c.monto, 0);

  return {
    salarioMensual: salario,
    salarioDiario: round2(salarioDiario),
    fechaIngreso, hasta: fin, tipo,
    antiguedad: { anios: ant.anios, meses: ant.meses, dias_totales: ant.diasTotales },
    componentes: componentes.map((c) => ({ ...c, dias: c.dias != null ? round2(c.dias) : null, monto: round2(c.monto) })),
    total: round2(total),
  };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
