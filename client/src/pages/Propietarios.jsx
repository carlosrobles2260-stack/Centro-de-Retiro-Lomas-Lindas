import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Badge } from '../lib/format.jsx';
import { archivoAImagenBase64 } from '../lib/imagen.js';

const TIPOS = [
  { valor: 'solar', label: 'Solar' },
  { valor: 'residencia', label: 'Residencia' },
];
const etiquetaTipo = (v) => TIPOS.find((t) => t.valor === v)?.label || v;

export default function Propietarios() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | {} nuevo | fila editar

  const cargar = useCallback(async () => {
    setCargando(true);
    setFilas(await api.get('/propietarios'));
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(f) {
    if (!confirm('¿Eliminar este propietario? Esta acción no se puede deshacer.')) return;
    await api.del(`/propietarios/${f.id}`);
    cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Propietarios</h2>
          <p className="descripcion">Registro de propietarios, su número de carnet y el solar o residencia asociada con fotos del frente.</p>
        </div>
        <button onClick={() => setModal({})}>+ Nuevo propietario</button>
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay propietarios registrados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Carnet</th><th>Propiedad</th><th>Teléfono</th><th>Fotos</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.carnet || '—'}</td>
                  <td>
                    {p.propiedad || '—'}
                    {p.tipo_propiedad && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{etiquetaTipo(p.tipo_propiedad)}</div>}
                  </td>
                  <td>{p.telefono || '—'}</td>
                  <td>
                    {p.fotos?.length ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.fotos.slice(0, 3).map((f, i) => (
                          <a key={i} href={f} target="_blank" rel="noreferrer">
                            <img src={f} alt="propiedad" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                          </a>
                        ))}
                        {p.fotos.length > 3 && <span style={{ fontSize: 12, color: 'var(--texto-suave)', alignSelf: 'center' }}>+{p.fotos.length - 3}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td><Badge estado={p.activo ? 'normal' : 'gris'} /></td>
                  <td>
                    <div className="acciones">
                      <button className="secundario" onClick={() => setModal(p)}>Editar</button>
                      <button className="peligro" onClick={() => eliminar(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalPropietario
          propietario={modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function ModalPropietario({ propietario, onCerrar, onGuardado }) {
  const esNuevo = !propietario.id;
  const [datos, setDatos] = useState({
    nombre: propietario.nombre || '',
    carnet: propietario.carnet || '',
    tipo_propiedad: propietario.tipo_propiedad || '',
    propiedad: propietario.propiedad || '',
    documento: propietario.documento || '',
    telefono: propietario.telefono || '',
    email: propietario.email || '',
    direccion: propietario.direccion || '',
    activo: propietario.activo ?? 1,
  });
  const [fotos, setFotos] = useState(propietario.fotos || []); // URLs ya guardadas
  const [nuevas, setNuevas] = useState([]); // base64 por subir
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function agregarFotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    try {
      for (const file of files) {
        const b64 = await archivoAImagenBase64(file);
        setNuevas((n) => [...n, b64]);
      }
    } catch (err) { setError(err.message); }
  }

  async function enviar(ev) {
    ev.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = { ...datos, activo: Number(datos.activo) ? 1 : 0, fotos, fotos_base64: nuevas };
      if (esNuevo) await api.post('/propietarios', payload);
      else await api.put(`/propietarios/${propietario.id}`, payload);
      onGuardado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{esNuevo ? 'Nuevo propietario' : 'Editar propietario'}</h3>

        <div className="campo">
          <label>Nombre completo *</label>
          <input value={datos.nombre} required onChange={(e) => set('nombre', e.target.value)} />
        </div>

        <div className="fila">
          <div className="campo">
            <label>Número de carnet</label>
            <input value={datos.carnet} onChange={(e) => set('carnet', e.target.value)} placeholder="N.º de carnet del propietario" />
          </div>
          <div className="campo">
            <label>Documento de identidad</label>
            <input value={datos.documento} onChange={(e) => set('documento', e.target.value)} />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Tipo de propiedad</label>
            <select value={datos.tipo_propiedad} onChange={(e) => set('tipo_propiedad', e.target.value)}>
              <option value="">Sin especificar</option>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Solar / residencia (lote, casa o unidad)</label>
            <input value={datos.propiedad} onChange={(e) => set('propiedad', e.target.value)} placeholder="Ej: Solar 12, Residencia B-4" />
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label>Teléfono</label>
            <input value={datos.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </div>
          <div className="campo">
            <label>Correo electrónico</label>
            <input type="email" value={datos.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>

        <div className="campo">
          <label>Dirección</label>
          <input value={datos.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </div>

        <div className="campo">
          <label>Fotos del frente de la propiedad</label>
          <input type="file" accept="image/*" capture="environment" multiple onChange={agregarFotos} />
          {(fotos.length > 0 || nuevas.length > 0) && (
            <div className="galeria-fotos">
              {fotos.map((f, i) => (
                <div key={`u${i}`} className="foto-item">
                  <img src={f} alt="propiedad" />
                  <button type="button" onClick={() => setFotos((a) => a.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {nuevas.map((f, i) => (
                <div key={`n${i}`} className="foto-item">
                  <img src={f} alt="nueva" />
                  <button type="button" onClick={() => setNuevas((a) => a.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="campo">
          <label className="sync-check">
            <input type="checkbox" checked={!!Number(datos.activo)} onChange={(e) => set('activo', e.target.checked ? 1 : 0)} />
            Propietario activo
          </label>
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
