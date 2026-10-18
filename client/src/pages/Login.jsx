import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={enviar}>
        <img src="/logo.png" alt="Lomas Lindas · Centro de Retiro" className="login-logo" />
        <p className="sub" style={{ textAlign: 'center' }}>Sistema de gestión del centro de retiro</p>

        <div className="campo">
          <label>Correo electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="campo">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button type="submit" disabled={cargando}>{cargando ? 'Ingresando...' : 'Ingresar'}</button>
        {error && <p className="error">{error}</p>}

        <div className="hint">
          <strong>Demo:</strong> admin@lomaslindas.com / admin123
        </div>
      </form>
    </div>
  );
}
