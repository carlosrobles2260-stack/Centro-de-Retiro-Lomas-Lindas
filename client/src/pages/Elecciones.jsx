import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { fecha, fechaHora } from '../lib/format.jsx';

const ESTADO = {
  borrador: { txt: 'Borrador', cls: 'gris' },
  abierta: { txt: 'Votación abierta', cls: 'verde' },
  cerrada: { txt: 'Cerrada', cls: 'azul' },
};

// Formulario para crear/editar una elección (solo en borrador).
function FormEleccion({ inicial, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial || { titulo: '', periodo: '', descripcion: '', fecha_apertura: '', fecha_cierre: '', solo_solventes: 1 });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); onGuardar(f); }}>
      <div className="campo">
        <label>Título *</label>
        <input value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Elección de la Directiva" required />
      </div>
      <div className="fila">
        <div className="campo"><label>Período</label><input value={f.periodo || ''} onChange={(e) => set('periodo', e.target.value)} placeholder="2026-2028" /></div>
        <div className="campo"><label>¿Quién puede votar?</label>
          <select value={f.solo_solventes} onChange={(e) => set('solo_solventes', Number(e.target.value))}>
            <option value={1}>Solo propietarios al día</option>
            <option value={0}>Todos los propietarios</option>
          </select>
        </div>
      </div>
      <div className="fila">
        <div className="campo"><label>Apertura (informativa)</label><input type="date" value={f.fecha_apertura || ''} onChange={(e) => set('fecha_apertura', e.target.value)} /></div>
        <div className="campo"><label>Cierre (informativa)</label><input type="date" value={f.fecha_cierre || ''} onChange={(e) => set('fecha_cierre', e.target.value)} /></div>
      </div>
      <div className="campo">
        <label>Descripción</label>
        <textarea rows={2} value={f.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} placeholder="Elección de la plancha que dirigirá la Directiva..." />
      </div>
      <div className="pie-modal" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <button type="submit">Guardar</button>
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// Gestión de planchas de una elección en borrador.
function Planchas({ eleccionId, planchas, bloqueado, onCambio }) {
  const [edit, setEdit] = useState(null); // objeto en edición o null
  const [error, setError] = useState(null);
  const vacia = { numero: '', nombre: '', lema: '', integrantes: '' };

  async function guardar(p) {
    setError(null);
    try {
      if (p.id) await api.put(`/elecciones/${eleccionId}/planchas/${p.id}`, p);
      else await api.post(`/elecciones/${eleccionId}/planchas`, p);
      setEdit(null); onCambio();
    } catch (e) { setError(e.message); }
  }
  async function borrar(id) {
    if (!confirm('¿Eliminar esta plancha?')) return;
    try { await api.del(`/elecciones/${eleccionId}/planchas/${id}`); onCambio(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="barra">
        <h3 style={{ margin: 0 }}>Planchas ({planchas.length})</h3>
        {!bloqueado && !edit && <button onClick={() => setEdit(vacia)}>Agregar plancha</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {bloqueado && <p className="descripcion">Las planchas solo se editan mientras la elección está en borrador.</p>}

      {edit && (
        <form className="card" style={{ marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); guardar(edit); }}>
          <div className="fila">
            <div className="campo" style={{ maxWidth: 110 }}><label>Número</label><input type="number" min="1" value={edit.numero ?? ''} onChange={(e) => setEdit({ ...edit, numero: e.target.value })} /></div>
            <div className="campo"><label>Nombre *</label><input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} required placeholder="Plancha Unidad" /></div>
          </div>
          <div className="campo"><label>Lema / propuesta</label><input value={edit.lema || ''} onChange={(e) => setEdit({ ...edit, lema: e.target.value })} placeholder="Transparencia y mantenimiento" /></div>
          <div className="campo"><label>Integrantes y cargos</label><textarea rows={4} value={edit.integrantes || ''} onChange={(e) => setEdit({ ...edit, integrantes: e.target.value })} placeholder={'Presidente: Juan Pérez\nTesorero: María Gómez\n...'} /></div>
          <div className="pie-modal" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <button type="submit">Guardar plancha</button>
            <button type="button" className="secundario" onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="tabla-wrap">
        {planchas.length === 0 ? (
          <div className="vacio">Aún no hay planchas. Agrega al menos 2 para abrir la votación.</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Nombre</th><th>Lema</th><th>Integrantes</th>{!bloqueado && <th></th>}</tr></thead>
            <tbody>
              {planchas.map((p) => (
                <tr key={p.id}>
                  <td>{p.numero ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td>{p.lema || '—'}</td>
                  <td style={{ whiteSpace: 'pre-line' }}>{p.integrantes || '—'}</td>
                  {!bloqueado && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="secundario" onClick={() => setEdit(p)}>Editar</button>{' '}
                      <button className="peligro" onClick={() => borrar(p.id)}>Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Resultados de una elección cerrada (conteo + participación).
function Resultados({ eleccionId }) {
  const [r, setR] = useState(null);
  const [padron, setPadron] = useState([]);
  const [verPadron, setVerPadron] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/elecciones/${eleccionId}/resultados`).then(setR).catch((e) => setError(e.message));
  }, [eleccionId]);

  const cargarPadron = () => {
    setVerPadron((v) => !v);
    if (padron.length === 0) api.get(`/elecciones/${eleccionId}/padron`).then(setPadron).catch(() => {});
  };

  if (error) return <p className="error">{error}</p>;
  if (!r) return <div className="cargando">Cargando resultados...</div>;

  const pct = (n) => (r.total > 0 ? Math.round((n / r.total) * 100) : 0);
  const participacion = r.padron > 0 ? Math.round((r.total / r.padron) * 100) : 0;

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Resultados</h3>
      <div className="mc-res-meta">
        <span><strong>{r.total}</strong> votos emitidos</span>
        <span>Padrón: <strong>{r.padron}</strong> propietarios</span>
        <span>Participación: <strong>{participacion}%</strong></span>
      </div>
      <div className="res-barras">
        {r.planchas.map((p) => (
          <div key={p.id} className={`res-fila ${p.id === r.ganadora ? 'gana' : ''}`}>
            <div className="res-top">
              <span>{p.numero != null && <b>{p.numero}. </b>}{p.nombre}{p.id === r.ganadora && r.total > 0 && <span className="res-sello"> · ganadora</span>}</span>
              <span className="res-cifra">{p.votos} ({pct(p.votos)}%)</span>
            </div>
            <div className="res-pista"><div className="res-relleno" style={{ width: `${pct(p.votos)}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="descripcion">El voto es secreto: el conteo no está vinculado a los nombres. La lista de participación solo indica quién votó, no por quién.</p>
      <button className="secundario" onClick={cargarPadron}>{verPadron ? 'Ocultar participación' : 'Ver participación'}</button>
      {verPadron && (
        <div className="tabla-wrap" style={{ marginTop: 12 }}>
          {padron.length === 0 ? <div className="vacio">Nadie ha votado.</div> : (
            <table>
              <thead><tr><th>Fecha</th><th>Propietario</th><th>Propiedad</th></tr></thead>
              <tbody>
                {padron.map((v, i) => (
                  <tr key={i}><td>{fechaHora(v.fecha)}</td><td>{v.nombre}</td><td>{v.propiedad || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// Detalle de una elección: datos, planchas, abrir/cerrar y resultados.
function Detalle({ id, onVolver }) {
  const [e, setE] = useState(null);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(() => {
    api.get(`/elecciones/${id}`).then((x) => { setE(x); setEditando(false); }).catch((err) => setError(err.message));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  async function guardarEdicion(datos) {
    try { await api.put(`/elecciones/${id}`, datos); cargar(); }
    catch (err) { setError(err.message); }
  }
  async function cambiarEstado(accion) {
    const txt = accion === 'abrir'
      ? 'Al abrir la votación ya no podrás editar las planchas. ¿Continuar?'
      : 'Al cerrar la elección se publican los resultados y no se admiten más votos. ¿Continuar?';
    if (!confirm(txt)) return;
    try { await api.post(`/elecciones/${id}/estado`, { accion }); cargar(); }
    catch (err) { setError(err.message); }
  }

  if (error && !e) return <><button className="secundario" onClick={onVolver}>← Volver</button><p className="error">{error}</p></>;
  if (!e) return <div className="cargando">Cargando...</div>;

  const est = ESTADO[e.estado] || { txt: e.estado, cls: 'gris' };

  return (
    <div>
      <div className="barra">
        <button className="secundario" onClick={onVolver}>← Volver</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {e.estado === 'borrador' && <button onClick={() => cambiarEstado('abrir')}>Abrir votación</button>}
          {e.estado === 'abierta' && <button className="peligro" onClick={() => cambiarEstado('cerrar')}>Cerrar elección</button>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {editando ? (
        <FormEleccion inicial={e} onGuardar={guardarEdicion} onCancelar={() => setEditando(false)} />
      ) : (
        <div className="card">
          <div className="barra" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{e.titulo} <span className={`badge ${est.cls}`}>{est.txt}</span></h2>
            {e.estado === 'borrador' && <button className="secundario" onClick={() => setEditando(true)}>Editar datos</button>}
          </div>
          <div className="mc-res-meta">
            {e.periodo && <span>Período <strong>{e.periodo}</strong></span>}
            <span>{e.solo_solventes ? 'Solo propietarios al día' : 'Todos los propietarios'}</span>
            {(e.fecha_apertura || e.fecha_cierre) && <span>{e.fecha_apertura ? fecha(e.fecha_apertura) : '—'} a {e.fecha_cierre ? fecha(e.fecha_cierre) : '—'}</span>}
            <span><strong>{e.votantes}</strong> votos</span>
          </div>
          {e.descripcion && <p className="descripcion" style={{ marginTop: 8 }}>{e.descripcion}</p>}
          {e.estado === 'abierta' && <p className="descripcion">Los propietarios ya pueden votar desde su app ("Mi cuenta"), asistan o no a la asamblea. Los resultados se verán al cerrar.</p>}
        </div>
      )}

      {e.estado !== 'cerrada' && (
        <Planchas eleccionId={id} planchas={e.planchas || []} bloqueado={e.estado !== 'borrador'} onCambio={cargar} />
      )}
      {e.estado === 'cerrada' && <Resultados eleccionId={id} />}
    </div>
  );
}

// Listado y alta de elecciones de la Directiva.
export default function Elecciones() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [sel, setSel] = useState(null);

  const cargar = useCallback(() => {
    api.get('/elecciones').then(setLista).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function crear(datos) {
    try { const nueva = await api.post('/elecciones', datos); setCreando(false); setSel(nueva.id); cargar(); }
    catch (e) { setError(e.message); }
  }

  if (sel) return <Detalle id={sel} onVolver={() => { setSel(null); cargar(); }} />;

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Elecciones de la Directiva</h2>
          <p className="descripcion">Votación de las planchas que dirigirán la Directiva. El voto es secreto y los propietarios votan desde su app, asistan o no a la asamblea.</p>
        </div>
        {!creando && <button onClick={() => setCreando(true)}>Nueva elección</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {creando && <FormEleccion onGuardar={crear} onCancelar={() => setCreando(false)} />}

      {!lista ? <div className="cargando">Cargando...</div> : (
        <div className="tabla-wrap" style={{ marginTop: 12 }}>
          {lista.length === 0 ? <div className="vacio">Aún no hay elecciones registradas.</div> : (
            <table>
              <thead><tr><th>Título</th><th>Período</th><th>Estado</th><th>Planchas</th><th>Votos</th><th></th></tr></thead>
              <tbody>
                {lista.map((e) => {
                  const est = ESTADO[e.estado] || { txt: e.estado, cls: 'gris' };
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.titulo}</td>
                      <td>{e.periodo || '—'}</td>
                      <td><span className={`badge ${est.cls}`}>{est.txt}</span></td>
                      <td>{e.planchas}</td>
                      <td>{e.votantes}</td>
                      <td><button className="secundario" onClick={() => setSel(e.id)}>Gestionar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
