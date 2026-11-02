import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

/**
 * Módulo genérico de gestión (listar / crear / editar / eliminar).
 *
 * Props:
 *  - titulo, descripcion
 *  - endpoint          ej. '/empleados'
 *  - columnas          [{ key, label, render?(fila) }]
 *  - campos            [{ name, label, type, opciones?, fuente?, labelKey?, requerido?, ancho? }]
 *                      type: text | number | date | textarea | select
 *                      fuente: endpoint para cargar opciones (FK); labelKey: campo a mostrar
 *  - filtros           [{ name, label, opciones:[{valor,label}] }]  (opcional)
 *  - permiteCrear      bool (default true)
 */
export default function CrudModule({
  titulo,
  descripcion,
  endpoint,
  columnas,
  campos = [],
  filtros = [],
  permiteCrear = true,
  accionesExtra = [], // [{ texto, onClick(fila), clase }]
  onCambio, // callback(filas) tras cada carga (crear/editar/eliminar)
  onCreado, // callback(respuesta) tras crear un registro nuevo
}) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | {} (nuevo) | fila (editar)
  const [fuentes, setFuentes] = useState({}); // opciones de FK cargadas
  const [filtroValores, setFiltroValores] = useState({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(filtroValores).filter(([, v]) => v)
      ).toString();
      const datos = await api.get(endpoint + (qs ? `?${qs}` : ''));
      setFilas(datos);
      setError(null);
      if (onCambio) onCambio(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [endpoint, filtroValores]);

  useEffect(() => { cargar(); }, [cargar]);

  // Carga las opciones de los campos tipo FK (fuente).
  useEffect(() => {
    campos
      .filter((c) => c.fuente)
      .forEach((c) => {
        api.get(c.fuente).then((datos) => {
          setFuentes((prev) => ({ ...prev, [c.name]: datos }));
        }).catch(() => {});
      });
  }, [endpoint]); // eslint-disable-line

  async function guardar(datos) {
    let resp;
    if (modal.id) await api.put(`${endpoint}/${modal.id}`, datos);
    else resp = await api.post(endpoint, datos);
    const creado = !modal.id;
    setModal(null);
    cargar();
    if (creado && onCreado) onCreado(resp);
  }

  async function eliminar(fila) {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    await api.del(`${endpoint}/${fila.id}`);
    cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>{titulo}</h2>
          {descripcion && <p className="descripcion">{descripcion}</p>}
        </div>
        {permiteCrear && <button onClick={() => setModal({})}>+ Nuevo</button>}
      </div>

      {filtros.length > 0 && (
        <div className="barra">
          <div className="filtros">
            {filtros.map((f) => (
              <select
                key={f.name}
                value={filtroValores[f.name] || ''}
                onChange={(e) => setFiltroValores((p) => ({ ...p, [f.name]: e.target.value }))}
              >
                <option value="">{f.label}: todos</option>
                {f.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.label}</option>
                ))}
              </select>
            ))}
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay registros.</div>
        ) : (
          <table>
            <thead>
              <tr>
                {columnas.map((c) => <th key={c.key}>{c.label}</th>)}
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  {columnas.map((c) => (
                    <td key={c.key}>{c.render ? c.render(fila) : (fila[c.key] ?? '—')}</td>
                  ))}
                  <td>
                    <div className="acciones">
                      {accionesExtra.map((a) => (
                        <button key={a.texto} className={a.clase || 'secundario'} onClick={() => a.onClick(fila)}>{a.texto}</button>
                      ))}
                      <button className="secundario" onClick={() => setModal(fila)}>Editar</button>
                      <button className="peligro" onClick={() => eliminar(fila)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <FormModal
          titulo={modal.id ? `Editar ${titulo}` : `Nuevo registro`}
          campos={campos}
          valores={modal}
          fuentes={fuentes}
          onGuardar={guardar}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}

function FormModal({ titulo, campos, valores, fuentes, onGuardar, onCerrar }) {
  const [datos, setDatos] = useState(() => {
    const init = {};
    for (const c of campos) init[c.name] = valores[c.name] ?? c.defecto ?? '';
    return init;
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function set(name, valor) {
    setDatos((d) => ({ ...d, [name]: valor }));
  }

  // Lee un archivo seleccionado y lo guarda como data URL (base64) en el campo indicado.
  function leerArchivo(campo, file) {
    if (!file) return;
    const lector = new FileReader();
    lector.onload = () => set(campo, lector.result);
    lector.readAsDataURL(file);
  }

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      // Convierte vacíos de FK/numéricos a null para no romper la base.
      const payload = { ...datos };
      for (const c of campos) {
        if ((c.type === 'number' || c.fuente) && payload[c.name] === '') payload[c.name] = null;
      }
      await onGuardar(payload);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{titulo}</h3>
        {campos.map((c) => (
          <div className="campo" key={c.name}>
            <label>{c.label}{c.requerido && ' *'}</label>
            {c.type === 'textarea' ? (
              <textarea
                rows={3}
                value={datos[c.name] ?? ''}
                required={c.requerido}
                onChange={(e) => set(c.name, e.target.value)}
              />
            ) : c.type === 'file' ? (
              <div>
                <input
                  type="file"
                  accept={c.accept || undefined}
                  onChange={(e) => leerArchivo(c.base64Campo || `${c.name}_base64`, e.target.files?.[0])}
                />
                {valores[c.name] && !datos[c.base64Campo || `${c.name}_base64`] && (
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    Actual: <a href={valores[c.name]} target="_blank" rel="noreferrer">ver archivo</a>
                  </div>
                )}
              </div>
            ) : c.type === 'select' ? (
              <select
                value={datos[c.name] ?? ''}
                required={c.requerido}
                onChange={(e) => set(c.name, e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {(c.fuente ? (fuentes[c.name] || []) : c.opciones || []).map((o) => {
                  const valor = c.fuente ? o.id : o.valor;
                  const label = c.fuente ? (o[c.labelKey] || o.nombre) : o.label;
                  return <option key={valor} value={valor}>{label}</option>;
                })}
              </select>
            ) : (
              <input
                type={c.type || 'text'}
                value={datos[c.name] ?? ''}
                required={c.requerido}
                step={c.type === 'number' ? 'any' : undefined}
                onChange={(e) => set(c.name, e.target.value)}
              />
            )}
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
