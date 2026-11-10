import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colores } from '../theme';
import { Badge, fechaHora } from '../components/ui';

const ACCIONES = {
  pendiente: [
    { estado: 'autorizada', texto: 'Autorizar' },
    { estado: 'rechazada', texto: 'Rechazar', peligro: true },
  ],
  autorizada: [
    { estado: 'dentro', texto: 'Registrar entrada' },
    { estado: 'rechazada', texto: 'Rechazar', peligro: true },
  ],
  dentro: [{ estado: 'finalizada', texto: 'Registrar salida' }],
  finalizada: [],
  rechazada: [],
};

const FILTROS = ['', 'pendiente', 'autorizada', 'dentro'];

export default function VisitasScreen({ navigation }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const qs = filtro ? `?estado=${filtro}` : '';
      setFilas(await api.get('/visitas' + qs));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  async function cambiarEstado(visita, estado) {
    try {
      let autorizado_por = visita.autorizado_por;
      await api.patch(`/visitas/${visita.id}/estado`, { estado, autorizado_por });
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function confirmar(visita, accion) {
    Alert.alert(accion.texto, `¿${accion.texto} la visita de ${visita.visitante_nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: accion.texto, onPress: () => cambiarEstado(visita, accion.estado) },
    ]);
  }

  return (
    <View style={styles.fondo}>
      <View style={styles.filtros}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f || 'todos'}
            style={[styles.chip, filtro === f && styles.chipActivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.chipTexto, filtro === f && styles.chipTextoActivo]}>
              {f === '' ? 'Todas' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={colores.verde} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onRefresh={cargar}
          refreshing={cargando}
          ListEmptyComponent={<Text style={styles.vacio}>No hay visitas.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{item.visitante_nombre}</Text>
                  <Text style={styles.sub}>
                    {item.propietario_nombre || 'Sin propietario'}
                    {item.placa_vehiculo ? ` · 🚗 ${item.placa_vehiculo}` : ''}
                  </Text>
                  {item.fecha_entrada && <Text style={styles.sub}>Entrada: {fechaHora(item.fecha_entrada)}</Text>}
                </View>
                <Badge estado={item.estado} />
              </View>
              <View style={styles.acciones}>
                {(ACCIONES[item.estado] || []).map((a) => (
                  <TouchableOpacity
                    key={a.estado}
                    style={[styles.accion, a.peligro && styles.accionPeligro]}
                    onPress={() => confirmar(item, a)}
                  >
                    <Text style={[styles.accionTexto, a.peligro && { color: '#fff' }]}>{a.texto}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabEscanear} onPress={() => navigation.navigate('Escanear')}>
          <Text style={styles.fabTexto}>📷 Escanear QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabRegistrar} onPress={() => navigation.navigate('RegistrarVisita', {})}>
          <Text style={styles.fabTexto}>＋ Registrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  filtros: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.verde, borderColor: colores.verde },
  chipTexto: { color: colores.texto, textTransform: 'capitalize', fontSize: 13 },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  nombre: { fontSize: 16, fontWeight: '700', color: colores.texto },
  sub: { fontSize: 13, color: colores.textoSuave, marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  accion: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: colores.verdeMuyClaro },
  accionPeligro: { backgroundColor: colores.rojo },
  accionTexto: { color: colores.verde, fontWeight: '600' },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  fabEscanear: { flex: 1, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabRegistrar: { flex: 1, backgroundColor: colores.verdeClaro, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
});
