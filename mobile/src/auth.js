import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, onDesautenticar } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    onDesautenticar(() => setUsuario(null));
    (async () => {
      const token = await getToken();
      if (!token) { setCargando(false); return; }
      try {
        const d = await api.get('/auth/me');
        setUsuario(d.usuario);
      } catch {
        await setToken(null);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const { token, usuario } = await api.post('/auth/login', { email, password });
    await setToken(token);
    setUsuario(usuario);
  }

  async function logout() {
    await setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
