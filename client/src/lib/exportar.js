// Las librerías de exportación (xlsx, jspdf) son pesadas, así que se cargan
// de forma diferida (dynamic import) solo cuando el usuario exporta.

// Convierte filas de datos usando una definición de columnas [{ key, label, fmt? }].
function materializar(columnas, filas) {
  const encabezados = columnas.map((c) => c.label);
  const cuerpo = filas.map((f) => columnas.map((c) => {
    const valor = c.key.split('.').reduce((o, k) => (o ? o[k] : undefined), f);
    return c.fmt ? c.fmt(valor, f) : (valor ?? '');
  }));
  return { encabezados, cuerpo };
}

export async function exportarExcel({ nombre, hoja = 'Reporte', columnas, filas }) {
  const XLSX = await import('xlsx');
  const { encabezados, cuerpo } = materializar(columnas, filas);
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...cuerpo]);
  ws['!cols'] = columnas.map((c) => ({ wch: c.ancho || 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31));
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

export async function exportarPDF({ titulo, subtitulo, nombre, columnas, filas }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: columnas.length > 5 ? 'landscape' : 'portrait' });
  const { encabezados, cuerpo } = materializar(columnas, filas);

  doc.setFontSize(16);
  doc.setTextColor(47, 110, 79); // verde Lomas Lindas
  doc.text('Centro de Retiro Lomas Lindas', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(titulo, 14, 26);
  if (subtitulo) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitulo, 14, 32);
  }

  autoTable(doc, {
    head: [encabezados],
    body: cuerpo,
    startY: subtitulo ? 36 : 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [47, 110, 79], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 246, 242] },
  });

  const fecha = new Date().toLocaleString('es-ES');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generado el ${fecha}`, 14, doc.internal.pageSize.getHeight() - 10);

  doc.save(`${nombre}.pdf`);
}
