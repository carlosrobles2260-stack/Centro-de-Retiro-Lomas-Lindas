import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';

// Cursos disponibles. Cada uno es una página HTML autodidacta servida por el
// propio sistema (client/public). Se muestran según el rol del usuario.
const CURSOS = [
  {
    id: 'administrativas', icono: '🏛️', titulo: 'Administrativas / Directiva',
    desc: 'Recorrido del sistema para la Directiva y la administración: finanzas, normas, elección de la Directiva y más.',
    archivo: 'capacitacion.html', roles: ['administracion', 'presidente'],
  },
  {
    id: 'seguridad', icono: '🛡️', titulo: 'Seguridad',
    desc: 'Verificación en la entrada: propietarios y visitantes, control de reingreso (antipassback) y casos especiales.',
    archivo: 'capacitacion-seguridad.html', roles: ['seguridad', 'administracion', 'presidente'],
  },
  {
    id: 'propietarios', icono: '🏠', titulo: 'Propietarios',
    desc: 'El portal del propietario: autorizar invitados, el pase de acceso, las cuotas y la votación.',
    archivo: 'capacitacion-propietarios.html', roles: ['administracion', 'presidente'],
  },
];

// Módulo de capacitación incrustado en el ERP. Lista los cursos que
// corresponden al rol y los abre dentro del propio sistema.
export default function Capacitacion() {
  const { usuario } = useAuth();
  const [sel, setSel] = useState(null);
  const visibles = CURSOS.filter((c) => usuario.rol === 'admin' || c.roles.includes(usuario.rol));

  if (sel) {
    return (
      <div className="cap-visor">
        <div className="barra">
          <button className="secundario" onClick={() => setSel(null)}>← Volver a los cursos</button>
          <a className="secundario-link chico" href={`/${sel.archivo}`} target="_blank" rel="noreferrer">Abrir en pestaña nueva</a>
        </div>
        <iframe title={sel.titulo} src={`/${sel.archivo}`} className="cap-iframe" />
      </div>
    );
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Capacitación</h2>
          <p className="descripcion">Cursos autodidactas con autoevaluación. Se muestran según tu rol en el sistema.</p>
        </div>
      </div>
      {visibles.length === 0 ? (
        <div className="vacio">No hay cursos disponibles para tu usuario.</div>
      ) : (
        <div className="cap-grid">
          {visibles.map((c) => (
            <button key={c.id} className="cap-card" onClick={() => setSel(c)}>
              <span className="cap-ico">{c.icono}</span>
              <strong>{c.titulo}</strong>
              <span className="cap-desc">{c.desc}</span>
              <span className="cap-cta">Comenzar →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
