// Controles de paginación reutilizables (Anterior / Página X de Y / Siguiente).
export default function Paginacion({ pagina, paginas, total, onCambio, etiqueta = 'registro', etiquetaPlural }) {
  if (!paginas || paginas <= 1) return null;
  const nombre = total === 1 ? etiqueta : (etiquetaPlural || `${etiqueta}s`);
  return (
    <div className="paginacion">
      <button className="secundario" disabled={pagina <= 1} onClick={() => onCambio(Math.max(1, pagina - 1))}>‹ Anterior</button>
      <span className="paginacion-info">
        Página {pagina} de {paginas}{total ? ` · ${total} ${nombre}` : ''}
      </span>
      <button className="secundario" disabled={pagina >= paginas} onClick={() => onCambio(Math.min(paginas, pagina + 1))}>Siguiente ›</button>
    </div>
  );
}
