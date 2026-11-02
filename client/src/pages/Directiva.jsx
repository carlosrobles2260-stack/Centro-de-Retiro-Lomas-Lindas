import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { archivoAImagenBase64 } from '../lib/imagen.js';

const TIPOS = [
  { valor: 'directiva', label: 'Miembro de la Directiva' },
  { valor: 'presidente', label: 'Presidente (histórico)' },
];

// Iniciales para el marcador cuando no hay foto.
function iniciales(nombre = '') {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

function Tarjeta({ m, puedeEditar, onEditar, onEliminar }) {
  return (
    <div className="dir-card">
      {m.foto
        ? <img className="dir-foto" src={m.foto} alt={m.nombre} />
        : <div className="dir-foto dir-foto-vacia">{iniciales(m.nombre)}</div>}
      <div className="dir-nombre">{m.nombre}</div>
      {m.cargo && <div className="dir-cargo">{m.cargo}</div>}
      {m.periodo && <div className="dir-periodo">{m.periodo}</div>}
      {puedeEditar && (
        <div className="dir-acc">
          <button className="secundario chico" onClick={() => onEditar(m)}>Editar</button>
          <button className="peligro chico" onClick={() => onEliminar(m)}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

export default function Directiva() {
  const { usuario } = useAuth();
  const puedeEditar = ['admin', 'administracion', 'presidente'].includes(usuario.rol);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | {} nuevo | fila editar

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setFilas(await api.get('/directiva')); } catch { setFilas([]); }
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(m) {
    if (!confirm(`¿Eliminar a ${m.nombre} de la galería?`)) return;
    await api.del(`/directiva/${m.id}`);
    cargar();
  }

  const directiva = filas.filter((f) => f.tipo === 'directiva');
  const presidentes = filas.filter((f) => f.tipo === 'presidente');

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Directiva de la asociación</h2>
          <p className="descripcion">Miembros de la Directiva con su cargo y período, y la galería de presidentes de la asociación.</p>
        </div>
      </div>

      {cargando ? (
        <div className="cargando">Cargando...</div>
      ) : (
        <>
          <div className="dir-seccion-cab">
            <h3 className="dir-titulo">Directiva actual</h3>
            {puedeEditar && <button onClick={() => setModal({ tipo: 'directiva' })}>+ Agregar miembro</button>}
          </div>
          {directiva.length === 0 ? (
            <div className="vacio">Aún no hay miembros de la Directiva registrados.</div>
          ) : (
            <div className="dir-grid">
              {directiva.map((m) => (
                <Tarjeta key={m.id} m={m} puedeEditar={puedeEditar} onEditar={setModal} onEliminar={eliminar} />
              ))}
            </div>
          )}

          <div className="dir-seccion-cab">
            <h3 className="dir-titulo">🏛️ Galería de presidentes</h3>
            {puedeEditar && <button onClick={() => setModal({ tipo: 'presidente' })}>+ Agregar presidente</button>}
          </div>
          {presidentes.length === 0 ? (
            <div className="vacio">Aún no hay presidentes en la galería.</div>
          ) : (
            <div className="dir-grid">
              {presidentes.map((m) => (
                <Tarjeta key={m.id} m={m} puedeEditar={puedeEditar} onEditar={setModal} onEliminar={eliminar} />
              ))}
            </div>
          )}
        </>
      )}

      {modal && (
        <ModalMiembro
          miembro={modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function ModalMiembro({ miembro, onCerrar, onGuardado }) {
  const esNuevo = !miembro.id;
  const [datos, setDatos] = useState({
    tipo: miembro.tipo || 'directiva',
    cargo: miembro.cargo || '',
    nombre: miembro.nombre || '',
    fecha_desde: (miembro.fecha_desde || '').slice(0, 10),
    fecha_hasta: (miembro.fecha_hasta || '').slice(0, 10),
    orden: miembro.orden ?? 0,
  });
  const [fotoNueva, setFotoNueva] = useState(null); // base64 si se sube una nueva
  const [vistaPrevia, setVistaPrevia] = useState(miembro.foto || null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function elegirFoto(file) {
    if (!file) return;
    try {
      const b64 = await archivoAImagenBase64(file, 600, 0.85);
      setFotoNueva(b64);
      setVistaPrevia(b64);
    } catch { setError('No se pudo procesar la imagen.'); }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!datos.nombre.trim()) { setError('Escribe el nombre.'); return; }
    setGuardando(true);
    setError(null);
    try {
      const payload = { ...datos };
      if (fotoNueva) payload.foto_base64 = fotoNueva;
      if (esNuevo) await api.post('/directiva', payload);
      else await api.put(`/directiva/${miembro.id}`, payload);
      onGuardado();
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal modal-directiva" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{esNuevo ? 'Agregar a la galería' : 'Editar'}</h3>

        <div className="dir-foto-sel">
          {vistaPrevia
            ? <img className="dir-foto" src={vistaPrevia} alt="" />
            : <div className="dir-foto dir-foto-vacia">{iniciales(datos.nombre)}</div>}
          <label className="dir-subir">
            {vistaPrevia ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
          </label>
        </div>

        <div className="campo">
          <label>Tipo</label>
          <select value={datos.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Nombre *</label>
          <input value={datos.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre y apellido" required />
        </div>
        {datos.tipo === 'directiva' && (
          <div className="campo">
            <label>Cargo</label>
            <input value={datos.cargo} onChange={(e) => set('cargo', e.target.value)} placeholder="Ej.: Presidente, Tesorero, Vocal…" />
          </div>
        )}
        <div className="fila">
          <div className="campo">
            <label>Fecha desde</label>
            <input type="date" value={datos.fecha_desde} onChange={(e) => set('fecha_desde', e.target.value)} />
          </div>
          <div className="campo">
            <label>Fecha hasta</label>
            <input type="date" value={datos.fecha_hasta} onChange={(e) => set('fecha_hasta', e.target.value)} title="Vacío = actual" />
          </div>
          <div className="campo campo-orden">
            <label>Orden</label>
            <input type="number" value={datos.orden} onChange={(e) => set('orden', e.target.value)} title="Menor aparece primero" />
          </div>
        </div>
        <p className="descripcion" style={{ marginTop: -2 }}>El período se mostrará como dd/mm/aa. Deja «Fecha hasta» vacía si aún está en funciones.</p>

        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
