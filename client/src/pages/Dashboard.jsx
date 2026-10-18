import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { dinero, fechaHora, fecha, Badge } from '../lib/format.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <div className="cargando">Cargando panel...</div>;

  return (
    <div>
      <h2>Panel principal</h2>
      <p className="descripcion">Resumen general del Centro de Retiro Lomas Lindas.</p>

      <div className="grupo-seccion">
        <h3 style={{ margin: '8px 0 12px', fontSize: 15, color: 'var(--texto-suave)' }}>Seguridad y accesos</h3>
        <div className="grid grid-4">
          <Stat etiqueta="Visitas de hoy" valor={d.seguridad.visitasHoy} />
          <Stat etiqueta="Visitantes dentro" valor={d.seguridad.visitasDentro} color="verde" />
          <Stat etiqueta="Visitas pendientes" valor={d.seguridad.visitasPendientes} />
          <Stat etiqueta="Incidentes abiertos" valor={d.seguridad.incidentesAbiertos} color="rojo" />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: '8px 0 12px', fontSize: 15, color: 'var(--texto-suave)' }}>Finanzas (mes actual)</h3>
        <div className="grid grid-4">
          <Stat etiqueta="Por cobrar" valor={dinero(d.finanzas.porCobrar)} color="rojo" />
          <Stat etiqueta="Ingresos del mes" valor={dinero(d.finanzas.ingresosMes)} color="verde" />
          <Stat etiqueta="Gastos del mes" valor={dinero(d.finanzas.gastosMes)} />
          <Stat etiqueta="Balance del mes" valor={dinero(d.finanzas.balanceMes)} color="azul" />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: '8px 0 12px', fontSize: 15, color: 'var(--texto-suave)' }}>Registro general</h3>
        <div className="grid grid-4">
          <Stat etiqueta="Propietarios activos" valor={d.general.propietarios} />
          <Stat etiqueta="Empleados activos" valor={d.general.empleados} />
          <Stat etiqueta="Rondas de hoy" valor={d.seguridad.rondasHoy} />
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Visitas recientes</h3>
          {d.visitasRecientes.length === 0 ? (
            <p className="descripcion">Sin visitas registradas.</p>
          ) : (
            d.visitasRecientes.map((v) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--borde)' }}>
                <div>
                  <strong>{v.visitante_nombre}</strong>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                    {v.propietario_nombre || 'Sin propietario'} · {fechaHora(v.creado_en)}
                  </div>
                </div>
                <Badge estado={v.estado} />
              </div>
            ))
          )}
          <Link to="/visitas" style={{ fontSize: 13, display: 'inline-block', marginTop: 10 }}>Ver todas →</Link>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Incidentes recientes</h3>
          {d.incidentesRecientes.length === 0 ? (
            <p className="descripcion">Sin incidentes.</p>
          ) : (
            d.incidentesRecientes.map((i) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--borde)' }}>
                <div>
                  <strong style={{ textTransform: 'capitalize' }}>{i.tipo || 'Incidente'}</strong>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{i.descripcion?.slice(0, 40)} · {fecha(i.fecha)}</div>
                </div>
                <Badge estado={i.gravedad} />
              </div>
            ))
          )}
          <Link to="/incidentes" style={{ fontSize: 13, display: 'inline-block', marginTop: 10 }}>Ver todos →</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ etiqueta, valor, color }) {
  return (
    <div className="card stat">
      <div className="etiqueta">{etiqueta}</div>
      <div className={`valor ${color || ''}`}>{valor}</div>
    </div>
  );
}
