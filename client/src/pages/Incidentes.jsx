import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Badge, fecha } from '../lib/format.jsx';
import { archivoAImagenBase64 } from '../lib/imagen.js';

const TIPOS = [
  { valor: 'acceso', label: 'Control de acceso' },
  { valor: 'robo', label: 'Robo / hurto' },
  { valor: 'emergencia', label: 'Emergencia' },
  { valor: 'daño', label: 'Daño a la propiedad' },
  { valor: 'otro', label: 'Otro' },
];
const GRAVEDADES = ['baja', 'media', 'alta', 'critica'];
const ESTADOS = ['abierto', 'en_proceso', 'cerrado'];

export default function Incidentes() {
  const [filas, setFilas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | {} nuevo | fila editar
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroGravedad, setFiltroGravedad] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = new URLSearchParams();
    if (filtroEstado) qs.set('estado', filtroEstado);
    if (filtroGravedad) qs.set('gravedad', filtroGravedad);
    setFilas(await api.get('/incidentes' + (qs.toString() ? `?${qs}` : '')));
    setCargando(false);
  }, [filtroEstado, filtroGravedad]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    api.get('/empleados').then(setEmpleados).catch(() => {});
    api.get('/propietarios').then(setPropietarios).catch(() => {});
  }, []);

  async function eliminar(f) {
    if (!confirm('¿Eliminar este incidente?')) return;
    await api.del(`/incidentes/${f.id}`);
    cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Incidentes de seguridad</h2>
          <p className="descripcion">Bitácora de novedades. Puedes adjuntar una foto de evidencia y asignar un responsable.</p>
        </div>
        <button onClick={() => setModal({})}>+ Reportar incidente</button>
      </div>

      <div className="barra">
        <div className="filtros">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Estado: todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
          </select>
          <select value={filtroGravedad} onChange={(e) => setFiltroGravedad(e.target.value)}>
            <option value="">Gravedad: todas</option>
            {GRAVEDADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay incidentes registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Propietario</th><th>Foto</th>
                <th>Responsable</th><th>Gravedad</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((i) => (
                <tr key={i.id}>
                  <td>{fecha(i.fecha)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{i.tipo}</td>
                  <td>{i.descripcion}{i.ubicacion && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>📍 {i.ubicacion}</div>}</td>
                  <td>{i.propietario_nombre || '—'}{i.propiedad && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{i.propiedad}</div>}</td>
                  <td>
                    {i.foto
                      ? <a href={i.foto} target="_blank" rel="noreferrer"><img src={i.foto} alt="evidencia" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6 }} /></a>
                      : '—'}
                  </td>
                  <td>{i.responsable_nombre || '—'}</td>
                  <td><Badge estado={i.gravedad} /></td>
                  <td><Badge estado={i.estado} /></td>
                  <td>
                    <div className="acciones">
                      <button className="secundario" onClick={() => setModal(i)}>Editar</button>
                      <button className="peligro" onClick={() => eliminar(i)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalIncidente
          incidente={modal}
          empleados={empleados}
          propietarios={propietarios}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function ModalIncidente({ incidente, empleados, propietarios, onCerrar, onGuardado }) {
  const esNuevo = !incidente.id;
  const [datos, setDatos] = useState({
    tipo: incidente.tipo || 'otro',
    gravedad: incidente.gravedad || 'baja',
    estado: incidente.estado || 'abierto',
    descripcion: incidente.descripcion || '',
    ubicacion: incidente.ubicacion || '',
    responsable_id: incidente.responsable_id || '',
    propietario_id: incidente.propietario_id || '',
  });
  const [fotoBase64, setFotoBase64] = useState(null);
  const [preview, setPreview] = useState(incidente.foto || null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function elegirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await archivoAImagenBase64(file);
      setFotoBase64(b64);
      setPreview(b64);
    } catch (err) {
      setError(err.message);
    }
  }

  async function enviar(ev) {
    ev.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = { ...datos, responsable_id: datos.responsable_id || null, propietario_id: datos.propietario_id || null };
      if (fotoBase64) payload.foto_base64 = fotoBase64;
      if (esNuevo) await api.post('/incidentes', payload);
      else await api.put(`/incidentes/${incidente.id}`, payload);
      onGuardado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  // Al elegir propietario, sugiere su propiedad como lugar si está vacío.
  function elegirPropietario(id) {
    const p = propietarios.find((x) => String(x.id) === String(id));
    setDatos((d) => ({ ...d, propietario_id: id, ubicacion: d.ubicacion || p?.propiedad || '' }));
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{esNuevo ? 'Reportar incidente' : 'Editar incidente'}</h3>

        <div className="fila">
          <div className="campo">
            <label>Tipo</label>
            <select value={datos.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Gravedad</label>
            <select value={datos.gravedad} onChange={(e) => set('gravedad', e.target.value)}>
              {GRAVEDADES.map((g) => <option key={g} value={g} style={{ textTransform: 'capitalize' }}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="campo">
          <label>Descripción *</label>
          <textarea rows={3} value={datos.descripcion} required onChange={(e) => set('descripcion', e.target.value)} />
        </div>
        <div className="fila">
          <div className="campo">
            <label>Propietario relacionado</label>
            <select value={datos.propietario_id} onChange={(e) => elegirPropietario(e.target.value)}>
              <option value="">Ninguno</option>
              {propietarios.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.propiedad ? ` · ${p.propiedad}` : ''}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Lugar</label>
            <input value={datos.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Dónde ocurrió" />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Responsable</label>
            <select value={datos.responsable_id} onChange={(e) => set('responsable_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Estado</label>
            <select value={datos.estado} onChange={(e) => set('estado', e.target.value)}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="campo">
          <label>Foto de evidencia</label>
          <input type="file" accept="image/*" capture="environment" onChange={elegirFoto} />
          {preview && <img src={preview} alt="evidencia" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 180, borderRadius: 8 }} />}
        </div>

        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
