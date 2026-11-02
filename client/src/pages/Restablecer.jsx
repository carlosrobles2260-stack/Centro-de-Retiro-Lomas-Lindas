import { useState } from 'react';
import { api } from '../lib/api.js';

// Página pública para crear una nueva contraseña a partir del enlace del correo.
// Lee el token de la dirección: /restablecer?token=...
export default function Restablecer() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setCargando(true);
    try {
      await api.post('/auth/restablecer', { token, password });
      setListo(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/logo.png" alt="Lomas Lindas · Centro de Retiro" className="login-logo" />

        {!token ? (
          <>
            <p className="sub" style={{ textAlign: 'center' }}>Enlace no válido</p>
            <p className="error">Falta el código del enlace. Solicita un nuevo correo de recuperación desde la pantalla de inicio de sesión.</p>
            <a href="/" className="link-bloque">Volver al inicio de sesión</a>
          </>
        ) : listo ? (
          <>
            <p className="sub" style={{ textAlign: 'center' }}>¡Contraseña actualizada!</p>
            <p style={{ textAlign: 'center', color: 'var(--texto-suave)' }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <a href="/" className="boton-bloque">Ir a iniciar sesión</a>
          </>
        ) : (
          <form onSubmit={enviar}>
            <p className="sub" style={{ textAlign: 'center' }}>Crear nueva contraseña</p>
            <div className="campo">
              <label>Nueva contraseña</label>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus minLength={6} />
            </div>
            <div className="campo">
              <label>Repetir contraseña</label>
              <input type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </div>
            <button type="submit" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar nueva contraseña'}</button>
            {error && <p className="error">{error}</p>}
            <a href="/" className="link-bloque">Volver al inicio de sesión</a>
          </form>
        )}
      </div>
    </div>
  );
}
