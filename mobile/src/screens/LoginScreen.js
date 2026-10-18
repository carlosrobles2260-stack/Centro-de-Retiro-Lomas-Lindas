import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../auth';
import { colores } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setCargando(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message);
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Lomas Lindas</Text>
        <Text style={styles.sub}>Centro de Retiro · Seguridad</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="correo@lomaslindas.com"
          placeholderTextColor="#9aa8a0"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9aa8a0"
        />

        <TouchableOpacity style={styles.boton} onPress={enviar} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Ingresar</Text>}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.hint}>Demo: admin@lomaslindas.com / admin123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.verde, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 28 },
  titulo: { fontSize: 24, fontWeight: '700', color: colores.verde },
  sub: { color: colores.textoSuave, marginBottom: 22, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: colores.borde, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colores.texto,
  },
  boton: {
    backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colores.rojo, marginTop: 12, textAlign: 'center' },
  hint: { marginTop: 18, fontSize: 12, color: colores.textoSuave, textAlign: 'center' },
});
