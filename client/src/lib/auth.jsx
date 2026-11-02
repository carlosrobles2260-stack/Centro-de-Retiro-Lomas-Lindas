import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .get('/auth/me')
      .then((d) => setUsuario(d.usuario))
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  async function login(email, password) {
    const { token, usuario } = await api.post('/auth/login', { email, password });
    setToken(token);
    setUsuario(usuario);
  }

  function logout() {
    setToken(null);
    setUsuario(null);
  }

  // Vuelve a leer el usuario del servidor (p. ej. tras cambiar la contraseña).
  async function recargarUsuario() {
    const d = await api.get('/auth/me');
    setUsuario(d.usuario);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, recargarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
