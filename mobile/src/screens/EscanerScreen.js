import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../api';
import { colores } from '../theme';

export default function EscanerScreen({ navigation }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [buscando, setBuscando] = useState(false);
  const yaLeido = useRef(false);

  async function alEscanear({ data }) {
    if (yaLeido.current || buscando) return;
    yaLeido.current = true;
    setBuscando(true);
    try {
      const codigo = String(data).trim();
      const visitante = await api.get(`/visitantes/codigo/${encodeURIComponent(codigo)}`);
      navigation.replace('RegistrarVisita', { visitante });
    } catch (e) {
      // Permite reintentar tras un breve margen.
      setBuscando(false);
      setTimeout(() => { yaLeido.current = false; }, 1500);
      alert(e.message || 'Credencial no encontrada');
    }
  }

  if (!permiso) {
    return <View style={styles.centro}><ActivityIndicator color={colores.verde} /></View>;
  }

  if (!permiso.granted) {
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>Se necesita acceso a la cámara para escanear las credenciales.</Text>
        <TouchableOpacity style={styles.boton} onPress={pedirPermiso}>
          <Text style={styles.botonTexto}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.fondo}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={buscando ? undefined : alEscanear}
      />
      <View style={styles.overlay}>
        <View style={styles.marco} />
        <Text style={styles.ayuda}>Apunta al código QR de la credencial</Text>
        {buscando && <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />}
      </View>
      <TouchableOpacity style={styles.cancelar} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelarTexto}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colores.arena },
  texto: { color: colores.texto, textAlign: 'center', marginBottom: 16, fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  marco: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16, backgroundColor: 'transparent' },
  ayuda: { color: '#fff', marginTop: 20, fontSize: 15, fontWeight: '600' },
  boton: { backgroundColor: colores.verde, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  cancelar: { position: 'absolute', bottom: 36, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  cancelarTexto: { color: '#fff', fontWeight: '600' },
});
