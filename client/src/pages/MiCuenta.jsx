import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { dinero, fecha, Badge } from '../lib/format.jsx';

const PUESTO = { domestica: 'Empleada doméstica', jardinero: 'Jardinero', cuidador: 'Cuidador', motorista: 'Motorista', otro: 'Otro' };

// Vista del propietario que inició sesión: su estado de cuenta de cuotas.
export default function MiCuenta() {
  const { usuario, logout } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/mi-cuenta').then(setDatos).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="micuenta">
      <header className="mc-top">
        <div className="mc-marca">
          <img src="/emblema.png" alt="" />
          <div>
            <strong>Lomas Lindas</strong>
            <span>Estado de cuenta</span>
          </div>
        </div>
        <div className="mc-user">
          <span>{usuario.nombre}</span>
          <button className="secundario" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="mc-main">
        {error && <p className="error">{error}</p>}
        {!datos ? (
          <div className="cargando">Cargando...</div>
        ) : (
          <>
            <div className="mc-saldo card">
              <div className="etiqueta">Saldo pendiente de cuotas de mantenimiento</div>
              <div className={`mc-monto ${datos.saldo > 0 ? 'rojo' : 'verde'}`}>{dinero(datos.saldo)}</div>
              <div className="mc-nota">
                {datos.saldo > 0 ? `Tienes ${datos.pendientes} cuota(s) por pagar.` : 'Estás al día. ¡Gracias!'}
                {' · '}Total pagado: {dinero(datos.pagado)}
              </div>
            </div>

            <h2>Mis cuotas</h2>
            <div className="tabla-wrap">
              {datos.facturas.length === 0 ? (
                <div className="vacio">Aún no hay cuotas registradas.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Concepto</th><th>Emisión</th><th>Vence</th><th>Monto</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {datos.facturas.map((f) => (
                      <tr key={f.id}>
                        <td>{f.concepto}</td>
                        <td>{fecha(f.fecha_emision)}</td>
                        <td>{fecha(f.fecha_vencimiento)}</td>
                        <td style={{ fontWeight: 600 }}>{dinero(f.monto)}</td>
                        <td><Badge estado={f.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {datos.empleados?.length > 0 && (
              <>
                <h2>Mis empleados</h2>
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr><th>Nombre</th><th>Puesto</th><th>Teléfono</th><th>Credencial</th></tr>
                    </thead>
                    <tbody>
                      {datos.empleados.map((e) => (
                        <tr key={e.id}>
                          <td>{e.nombre}</td>
                          <td>{PUESTO[e.puesto] || e.puesto || '—'}</td>
                          <td>{e.telefono || '—'}</td>
                          <td>{e.codigo ? <a href={`/credencial/${e.codigo}`} target="_blank" rel="noreferrer">Ver credencial</a> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="mc-pie">Para registrar un pago o aclarar un cargo, comunícate con la administración del centro.</p>
          </>
        )}
      </main>
    </div>
  );
}
