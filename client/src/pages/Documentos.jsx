import CrudModule from '../components/CrudModule.jsx';

const CATEGORIAS = [
  { valor: 'estatutos', label: 'Estatutos' },
  { valor: 'reglamento_interno', label: 'Reglamento interno' },
  { valor: 'convivencia', label: 'Normas de convivencia' },
  { valor: 'medio_ambiente', label: 'Medio ambiente' },
  { valor: 'resoluciones', label: 'Resoluciones de la Directiva' },
  { valor: 'resoluciones_asamblea_ordinaria', label: 'Resoluciones de Asamblea Ordinaria' },
  { valor: 'resoluciones_asamblea_extraordinaria', label: 'Resoluciones de Asamblea Extraordinaria' },
  { valor: 'otra', label: 'Otras normas' },
];
const PUBLICADO = [
  { valor: 1, label: 'Publicado (visible al propietario)' },
  { valor: 0, label: 'Borrador (oculto)' },
];
const etq = (lista, v) => lista.find((x) => String(x.valor) === String(v))?.label || v || '—';

export default function Documentos() {
  return (
    <CrudModule
      titulo="Normas y reglamentos"
      descripcion="Estatutos, reglamentos, normas y resoluciones de la Directiva y de las asambleas (ordinarias y extraordinarias) del proyecto. Lo que publiques aquí lo verá el propietario al entrar a su cuenta. Puedes subir un PDF, enlazar un documento o escribir el texto."
      endpoint="/documentos"
      filtros={[{ name: 'categoria', label: 'Categoría', opciones: CATEGORIAS }]}
      columnas={[
        { key: 'titulo', label: 'Documento', render: (f) => <><strong>{f.titulo}</strong>{f.descripcion && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{f.descripcion}</div>}</> },
        { key: 'categoria', label: 'Categoría', render: (f) => <span className="badge azul">{etq(CATEGORIAS, f.categoria)}</span> },
        { key: 'archivo', label: 'Archivo / enlace', render: (f) => (f.archivo || f.enlace) ? <a href={f.archivo || f.enlace} target="_blank" rel="noreferrer">Ver</a> : (f.contenido ? 'Texto' : '—') },
        { key: 'publicado', label: 'Estado', render: (f) => Number(f.publicado) ? <span className="badge verde">Publicado</span> : <span className="badge gris">Borrador</span> },
      ]}
      campos={[
        { name: 'titulo', label: 'Título', requerido: true },
        { name: 'categoria', label: 'Categoría', type: 'select', defecto: 'reglamento_interno', opciones: CATEGORIAS },
        { name: 'descripcion', label: 'Descripción breve (para el propietario)', type: 'textarea' },
        { name: 'archivo', label: 'Documento (PDF o imagen, máx. 15 MB)', type: 'file', accept: 'application/pdf,image/*' },
        { name: 'enlace', label: 'Enlace externo (opcional)' },
        { name: 'contenido', label: 'Texto de la norma (opcional, si no subes archivo)', type: 'textarea' },
        { name: 'orden', label: 'Orden de presentación', type: 'number', defecto: 0 },
        { name: 'publicado', label: 'Estado', type: 'select', defecto: 1, opciones: PUBLICADO },
      ]}
    />
  );
}
