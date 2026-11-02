import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

// Cambio obligatorio de contraseña en el primer ingreso (contraseña temporal).
export default function CambiarPassword() {
  const { usuario, logout, recargarUsuario } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setCargando(true);
    try {
      await api.post('/auth/cambiar-password', { actual, nueva });
      await recargarUsuario(); // ya no debe cambiar -> entra al sistema
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/logo.png" alt="Lomas Lindas · Centro de Retiro" className="login-logo" />
        <p className="sub" style={{ textAlign: 'center' }}>Crea tu contraseña</p>
        <p style={{ textAlign: 'center', color: 'var(--texto-suave)', fontSize: 15, margin: '0 0 18px' }}>
          Por tu seguridad, debes cambiar la contraseña temporal antes de continuar.
        </p>
        <form onSubmit={enviar}>
          <div className="campo">
            <label>Contraseña temporal (la que te enviamos)</label>
            <input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required autoFocus />
          </div>
          <div className="campo">
            <label>Nueva contraseña</label>
            <input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={6} />
          </div>
          <div className="campo">
            <label>Repetir nueva contraseña</label>
            <input type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
          </div>
          <button type="submit" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar y continuar'}</button>
          {error && <p className="error">{error}</p>}
        </form>
        <button type="button" className="enlace-texto" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
}
