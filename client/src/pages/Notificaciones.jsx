import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { fechaHora, Badge } from '../lib/format.jsx';
import Paginacion from '../components/Paginacion.jsx';

export default function Notificaciones() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = new URLSearchParams();
    if (filtro) qs.set('estado', filtro);
    qs.set('pagina', String(pagina));
    qs.set('limite', '20');
    const r = await api.get('/notificaciones?' + qs.toString());
    const lista = Array.isArray(r) ? r : (r.datos || []);
    setFilas(lista);
    setPaginas(Array.isArray(r) ? 1 : (r.paginas || 1));
    setTotal(Array.isArray(r) ? lista.length : (r.total || 0));
    setCargando(false);
  }, [filtro, pagina]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [filtro]);

  async function reenviar(n) {
    await api.post(`/notificaciones/${n.id}/reenviar`);
    cargar();
  }

  return (
    <div>
      <h2>Notificaciones a propietarios</h2>
      <p className="descripcion">
        Avisos enviados a los propietarios cuando se registra o ingresa una visita.
        Si no hay servidor de correo (SMTP) configurado, las notificaciones quedan
        en estado <em>simulada</em>.
      </p>

      <div className="barra">
        <div className="filtros">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="enviada">Enviada</option>
            <option value="simulada">Simulada</option>
            <option value="pendiente">Pendiente</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay notificaciones.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Propietario</th>
                <th>Destino</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((n) => (
                <tr key={n.id}>
                  <td>{fechaHora(n.creado_en)}</td>
                  <td>{n.propietario_nombre || '—'}</td>
                  <td>{n.destino || <span style={{ color: 'var(--rojo)' }}>sin correo</span>}</td>
                  <td>
                    {n.asunto}
                    {n.detalle && <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>{n.detalle}</div>}
                  </td>
                  <td><Badge estado={n.estado} /></td>
                  <td>
                    <div className="acciones">
                      <button className="secundario" onClick={() => reenviar(n)}>Reenviar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && <Paginacion pagina={pagina} paginas={paginas} total={total} etiqueta="notificación" etiquetaPlural="notificaciones" onCambio={setPagina} />}
    </div>
  );
}
