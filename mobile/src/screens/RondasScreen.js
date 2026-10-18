import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colores } from '../theme';
import { Badge, fechaHora } from '../components/ui';

export default function RondasScreen() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setFilas(await api.get('/rondas')); } catch (e) { Alert.alert('Error', e.message); }
    finally { setCargando(false); }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  return (
    <View style={styles.fondo}>
      {cargando ? (
        <ActivityIndicator size="large" color={colores.verde} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          onRefresh={cargar}
          refreshing={cargando}
          ListEmptyComponent={<Text style={styles.vacio}>Sin rondas registradas.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.punto}>{item.punto_control}</Text>
                <Badge estado={item.estado} />
              </View>
              {item.observaciones ? <Text style={styles.obs}>{item.observaciones}</Text> : null}
              <Text style={styles.sub}>{item.empleado_nombre || 'Guardia'} · {fechaHora(item.fecha_hora)}</Text>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabTexto}>＋ Registrar ronda</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <FormRonda onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); cargar(); }} />
      </Modal>
    </View>
  );
}

function FormRonda({ onCerrar, onGuardado }) {
  const [punto, setPunto] = useState('');
  const [estado, setEstado] = useState('normal');
  const [obs, setObs] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!punto.trim()) { Alert.alert('Falta el punto de control'); return; }
    setGuardando(true);
    try {
      await api.post('/rondas', { punto_control: punto, estado, observaciones: obs });
      onGuardado();
    } catch (e) { Alert.alert('Error', e.message); setGuardando(false); }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitulo}>Registrar ronda</Text>

      <Text style={styles.label}>Punto de control</Text>
      <TextInput style={styles.input} value={punto} onChangeText={setPunto} placeholder="Ej: Perímetro norte" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Estado</Text>
      <View style={styles.chips}>
        {['normal', 'novedad'].map((o) => (
          <TouchableOpacity key={o} style={[styles.chip, estado === o && styles.chipActivo]} onPress={() => setEstado(o)}>
            <Text style={[styles.chipTexto, estado === o && styles.chipTextoActivo]}>{o === 'normal' ? 'Sin novedad' : 'Con novedad'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Observaciones</Text>
      <TextInput style={[styles.input, { height: 90 }]} multiline value={obs} onChangeText={setObs} placeholder="Observaciones" placeholderTextColor="#9aa8a0" />

      <View style={styles.formBotones}>
        <TouchableOpacity style={[styles.boton, styles.botonSec]} onPress={onCerrar}>
          <Text style={{ color: colores.texto, fontWeight: '600' }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  punto: { fontSize: 16, fontWeight: '700', color: colores.texto },
  obs: { color: colores.texto },
  sub: { fontSize: 12, color: colores.textoSuave },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
  form: { flex: 1, backgroundColor: colores.arena, padding: 20, paddingTop: 60 },
  formTitulo: { fontSize: 20, fontWeight: '700', color: colores.texto, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 12, fontSize: 15, color: colores.texto, backgroundColor: '#fff', textAlignVertical: 'top' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.verde, borderColor: colores.verde },
  chipTexto: { color: colores.texto, fontSize: 13 },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 28 },
  boton: { flex: 1, backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonSec: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
