import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

const TOKEN_KEY = 'll_token';

let tokenEnMemoria = null;
let alDesautenticar = null; // callback para cerrar sesión si el token expira

export async function getToken() {
  if (tokenEnMemoria) return tokenEnMemoria;
  tokenEnMemoria = await AsyncStorage.getItem(TOKEN_KEY);
  return tokenEnMemoria;
}

export async function setToken(token) {
  tokenEnMemoria = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export function onDesautenticar(cb) {
  alDesautenticar = cb;
}

async function request(metodo, ruta, cuerpo) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Verifica la URL del API y tu conexión.');
  }

  if (res.status === 401 && !ruta.startsWith('/auth/login')) {
    await setToken(null);
    if (alDesautenticar) alDesautenticar();
    throw new Error('Sesión expirada');
  }

  const texto = await res.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    const err = new Error(datos?.error || 'Error en la solicitud');
    err.code = datos?.code;
    err.status = res.status;
    throw err;
  }
  return datos;
}

export const api = {
  get: (ruta) => request('GET', ruta),
  post: (ruta, cuerpo) => request('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => request('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo) => request('PATCH', ruta, cuerpo),
  del: (ruta) => request('DELETE', ruta),
};
