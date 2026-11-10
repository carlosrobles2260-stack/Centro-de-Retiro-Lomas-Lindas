import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../auth';
import { colores } from '../theme';
import { API_URL } from '../config';

const ROLES = { admin: 'Administrador', seguridad: 'Seguridad', administracion: 'Administración' };

export default function PerfilScreen() {
  const { usuario, logout } = useAuth();
  return (
    <View style={styles.fondo}>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarTexto}>{usuario?.nombre?.[0] || '?'}</Text></View>
        <Text style={styles.nombre}>{usuario?.nombre}</Text>
        <Text style={styles.rol}>{ROLES[usuario?.rol] || usuario?.rol}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      <Text style={styles.info}>Servidor: {API_URL}</Text>

      <TouchableOpacity style={styles.boton} onPress={logout}>
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena, padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: colores.borde },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colores.verde, justifyContent: 'center', alignItems: 'center' },
  avatarTexto: { color: '#fff', fontSize: 30, fontWeight: '700' },
  nombre: { fontSize: 20, fontWeight: '700', color: colores.texto, marginTop: 14 },
  rol: { color: colores.verde, fontWeight: '600', marginTop: 2 },
  email: { color: colores.textoSuave, marginTop: 2 },
  info: { color: colores.textoSuave, fontSize: 12, textAlign: 'center', marginTop: 20 },
  boton: { backgroundColor: colores.rojo, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
