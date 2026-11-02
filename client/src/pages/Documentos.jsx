import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import CrudModule from '../components/CrudModule.jsx';
import { fecha } from '../lib/format.jsx';

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

// Categorías que se sustentan en los Estatutos (todas menos estatutos y otras).
const CAT_FUNDAMENTO = CATEGORIAS.filter((c) => !['estatutos', 'otra'].includes(c.valor));

export default function Documentos() {
  const [fundamentos, setFundamentos] = useState(false);

  return (
    <div>
      <div className="barra" style={{ justifyContent: 'flex-end' }}>
        <button className="secundario" onClick={() => setFundamentos(true)}>Fundamento estatutario</button>
      </div>

      <CrudModule
        titulo="Normas y reglamentos"
        descripcion="Estatutos, reglamentos, normas y resoluciones de la Directiva y de las asambleas (ordinarias y extraordinarias) del proyecto. Lo que publiques aquí lo verá el propietario al entrar a su cuenta. Puedes subir un PDF, enlazar un documento o escribir el texto."
        endpoint="/documentos"
        filtros={[{ name: 'categoria', label: 'Categoría', opciones: CATEGORIAS }]}
        columnas={[
          { key: 'titulo', label: 'Documento', render: (f) => <><strong>{f.titulo}</strong>{f.descripcion && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{f.descripcion}</div>}</> },
          { key: 'categoria', label: 'Categoría', render: (f) => <span className="badge azul">{etq(CATEGORIAS, f.categoria)}</span> },
          { key: 'fecha', label: 'Fecha', render: (f) => (f.fecha ? fecha(f.fecha) : '—') },
          { key: 'archivo', label: 'Archivo / enlace', render: (f) => (f.archivo || f.enlace) ? <a href={f.archivo || f.enlace} target="_blank" rel="noreferrer">Ver</a> : (f.contenido ? 'Texto' : '—') },
          { key: 'publicado', label: 'Estado', render: (f) => Number(f.publicado) ? <span className="badge verde">Publicado</span> : <span className="badge gris">Borrador</span> },
        ]}
        campos={[
          { name: 'titulo', label: 'Título', requerido: true },
          { name: 'categoria', label: 'Categoría', type: 'select', defecto: 'reglamento_interno', opciones: CATEGORIAS },
          { name: 'fecha', label: 'Fecha del acta / documento', type: 'date' },
          { name: 'descripcion', label: 'Descripción breve (para el propietario)', type: 'textarea' },
          { name: 'archivo', label: 'Documento (PDF o imagen, máx. 15 MB)', type: 'file', accept: 'application/pdf,image/*' },
          { name: 'enlace', label: 'Enlace externo (opcional)' },
          { name: 'contenido', label: 'Texto de la norma (opcional, si no subes archivo)', type: 'textarea' },
          { name: 'orden', label: 'Orden de presentación', type: 'number', defecto: 0 },
          { name: 'publicado', label: 'Estado', type: 'select', defecto: 1, opciones: PUBLICADO },
        ]}
      />

      {fundamentos && <ModalFundamentos onCerrar={() => setFundamentos(false)} />}
    </div>
  );
}

// Editor del fundamento estatutario de cada categoría (artículo de los Estatutos
// que la sustenta). Se guarda en la configuración y se muestra al propietario.
function ModalFundamentos({ onCerrar }) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/configuracion').then((c) => {
      const o = {};
      for (const { valor } of CAT_FUNDAMENTO) o[valor] = c[`fundamento_${valor}`] ?? '';
      setCfg(o);
    }).catch(() => setCfg({}));
  }, []);

  async function guardar(e) {
    e.preventDefault(); setGuardando(true); setError(null);
    try {
      const payload = {};
      for (const { valor } of CAT_FUNDAMENTO) payload[`fundamento_${valor}`] = cfg[valor] || '';
      await api.put('/configuracion', payload);
      onCerrar();
    } catch (err) { setError(err.message); setGuardando(false); }
  }

  if (!cfg) return null;
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>Fundamento estatutario por categoría</h3>
        <p className="descripcion">Indica el artículo de los Estatutos que sustenta cada categoría. El propietario lo verá al abrir la categoría, con un enlace a los Estatutos.</p>
        {CAT_FUNDAMENTO.map(({ valor, label }) => (
          <div className="campo" key={valor}>
            <label>{label}</label>
            <input value={cfg[valor]} onChange={(e) => setCfg((c) => ({ ...c, [valor]: e.target.value }))} placeholder="Ej: Arts. 6 y 8 de los Estatutos" />
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
