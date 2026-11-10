import { useEffect, useState, useCallback, Fragment } from 'react';
import { api } from '../lib/api.js';

// Matriz de permisos (solo admin): por cada módulo y rol, casillas Ver / Editar.
export default function Permisos() {
  const [data, setData] = useState(null); // { modulos, roles, permisos }
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null); // `${rol}:${modulo}` en curso

  const cargar = useCallback(async () => {
    try { setData(await api.get('/permisos')); setError(null); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function cambiar(rol, modulo, leer, escribir) {
    setGuardando(`${rol}:${modulo}`);
    try {
      const r = await api.put('/permisos', { rol, modulo, leer, escribir });
      setData(r);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setGuardando(null); }
  }

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <div className="cargando">Cargando...</div>;

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Permisos por rol</h2>
          <p className="descripcion">
            Define qué puede <strong>ver</strong> y <strong>editar</strong> cada rol en cada módulo.
            Los cambios aplican de inmediato. El rol <strong>Administrador</strong> siempre tiene acceso total.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabla-wrap">
        <table className="tabla-permisos">
          <thead>
            <tr>
              <th className="col-modulo">Módulo</th>
              {data.roles.map((r) => <th key={r.clave} colSpan={2}>{r.etiqueta}</th>)}
            </tr>
            <tr>
              <th className="col-modulo"></th>
              {data.roles.map((r) => (
                <Fragment key={r.clave}>
                  <th className="sub">👁️ Ver</th>
                  <th className="sub">✏️ Editar</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.modulos.map((m) => (
              <tr key={m.clave}>
                <td className="col-modulo">{m.etiqueta}</td>
                {data.roles.map((r) => {
                  const p = data.permisos[r.clave]?.[m.clave] || { leer: false, escribir: false };
                  const ocupado = guardando === `${r.clave}:${m.clave}`;
                  return (
                    <Fragment key={`${r.clave}-${m.clave}`}>
                      <td className="celda-check">
                        <input
                          type="checkbox"
                          checked={!!p.leer}
                          disabled={ocupado}
                          onChange={(e) => cambiar(r.clave, m.clave, e.target.checked, e.target.checked ? p.escribir : false)}
                        />
                      </td>
                      <td className="celda-check">
                        <input
                          type="checkbox"
                          checked={!!p.escribir}
                          disabled={ocupado || !p.leer}
                          title={!p.leer ? 'Primero marca "Ver"' : ''}
                          onChange={(e) => cambiar(r.clave, m.clave, true, e.target.checked)}
                        />
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="descripcion" style={{ marginTop: 14 }}>
        💡 "Editar" incluye crear, modificar y eliminar. Si quitas "Ver", también se quita "Editar".
      </p>
    </div>
  );
}
