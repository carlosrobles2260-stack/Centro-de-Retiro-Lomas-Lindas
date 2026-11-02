import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const [modo, setModo] = useState('login'); // 'login' | 'recuperar'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await login(email, password, recordar);
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  async function recuperar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const r = await api.post('/auth/recuperar', { email });
      setAviso(r.mensaje || 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError(null);
    setAviso(null);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/logo.png" alt="Lomas Lindas · Centro de Retiro" className="login-logo" />

        {modo === 'login' ? (
          <form onSubmit={enviar}>
            <p className="sub" style={{ textAlign: 'center' }}>Sistema de gestión del centro de retiro</p>
            <div className="campo">
              <label htmlFor="login-email">Correo electrónico</label>
              <input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="campo">
              <label htmlFor="login-password">Contraseña</label>
              <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <label className="recordar">
              <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
              <span>Mantener la sesión iniciada en este dispositivo</span>
            </label>
            <button type="submit" disabled={cargando}>{cargando ? 'Ingresando...' : 'Ingresar'}</button>
            {error && <p className="error">{error}</p>}
            <button type="button" className="enlace-texto" onClick={() => cambiarModo('recuperar')}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={recuperar}>
            <p className="sub" style={{ textAlign: 'center' }}>Recuperar contraseña</p>
            {aviso ? (
              <>
                <p className="ok-msg" style={{ textAlign: 'center' }}>{aviso}</p>
                <p style={{ textAlign: 'center', color: 'var(--texto-suave)', fontSize: 15 }}>
                  Revisa tu correo y abre el enlace para crear una nueva contraseña. El enlace es válido por 1 hora.
                </p>
              </>
            ) : (
              <>
                <p style={{ textAlign: 'center', color: 'var(--texto-suave)', fontSize: 14, margin: '0 0 16px' }}>
                  Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
                <div className="campo">
                  <label>Correo electrónico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={cargando}>{cargando ? 'Enviando...' : 'Enviar enlace'}</button>
                {error && <p className="error">{error}</p>}
              </>
            )}
            <button type="button" className="enlace-texto" onClick={() => cambiarModo('login')}>
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
