import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { colores } from '../theme';

const PUESTO = { domestica: 'Empleada doméstica', jardinero: 'Jardinero', cuidador: 'Cuidador', motorista: 'Motorista', otro: 'Otro' };

// Registra la entrada o salida de un empleado del propietario escaneado en el portón.
export default function AccesoEmpleadoScreen({ route, navigation }) {
  const emp = route.params?.empleado || {};
  const [guardando, setGuardando] = useState(null); // 'entrada' | 'salida'

  async function registrar(tipo) {
    setGuardando(tipo);
    try {
      await api.post('/empleados-propietario/acceso', { codigo: emp.codigo, tipo });
      Alert.alert(tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', `${emp.nombre} · ${tipo}.`);
      navigation.navigate('Visitas');
    } catch (e) {
      Alert.alert('Error', e.message);
      setGuardando(null);
    }
  }

  const sugerido = emp.sugerido || 'entrada';

  return (
    <View style={styles.fondo}>
      <View style={styles.banner}>
        <Text style={styles.bannerTexto}>✅ Empleado del propietario</Text>
        <Text style={styles.bannerNombre}>{emp.nombre}</Text>
        <Text style={styles.bannerSub}>{PUESTO[emp.puesto] || emp.puesto || 'Empleado'}{emp.carnet ? ` · Carné ${emp.carnet}` : ''}</Text>
      </View>

      <View style={styles.datos}>
        {emp.propietario_nombre ? <Dato etiqueta="Propietario" valor={emp.propietario_nombre} /> : null}
        {emp.propiedad ? <Dato etiqueta="Propiedad" valor={emp.propiedad} /> : null}
        {emp.documento ? <Dato etiqueta="Documento" valor={emp.documento} /> : null}
        <Dato etiqueta="Código" valor={emp.codigo} />
      </View>

      <Text style={styles.pregunta}>¿Qué movimiento registras?</Text>
      <TouchableOpacity
        style={[styles.boton, sugerido === 'entrada' && styles.botonSugerido]}
        onPress={() => registrar('entrada')} disabled={!!guardando}>
        {guardando === 'entrada' ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>⬇️  Registrar entrada{sugerido === 'entrada' ? '  (sugerido)' : ''}</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.boton, styles.botonSalida, sugerido === 'salida' && styles.botonSugerido]}
        onPress={() => registrar('salida')} disabled={!!guardando}>
        {guardando === 'salida' ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>⬆️  Registrar salida{sugerido === 'salida' ? '  (sugerido)' : ''}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelar} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelarTexto}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.datoFila}>
      <Text style={styles.datoEtq}>{etiqueta}</Text>
      <Text style={styles.datoVal}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena, padding: 16 },
  banner: { backgroundColor: colores.verdeMuyClaro, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colores.verdeClaro },
  bannerTexto: { color: colores.verde, fontWeight: '700' },
  bannerNombre: { fontSize: 20, fontWeight: '700', color: colores.texto, marginTop: 4 },
  bannerSub: { color: colores.textoSuave, marginTop: 2 },
  datos: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 6, marginTop: 14 },
  datoFila: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: colores.borde },
  datoEtq: { color: colores.textoSuave },
  datoVal: { color: colores.texto, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  pregunta: { marginTop: 22, marginBottom: 10, fontWeight: '700', color: colores.texto, fontSize: 15 },
  boton: { backgroundColor: colores.verdeClaro, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  botonSalida: { backgroundColor: '#8a6d3b' },
  botonSugerido: { backgroundColor: colores.verde },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelar: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelarTexto: { color: colores.textoSuave, fontWeight: '600' },
});
