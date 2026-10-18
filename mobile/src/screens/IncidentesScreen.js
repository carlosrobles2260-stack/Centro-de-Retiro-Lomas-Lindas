import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colores } from '../theme';
import { Badge, fechaHora } from '../components/ui';

const TIPOS = ['acceso', 'robo', 'emergencia', 'daño', 'otro'];
const GRAVEDADES = ['baja', 'media', 'alta', 'critica'];

export default function IncidentesScreen() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setFilas(await api.get('/incidentes')); } catch (e) { Alert.alert('Error', e.message); }
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
          ListEmptyComponent={<Text style={styles.vacio}>Sin incidentes registrados.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.tipo}>{item.tipo}</Text>
                <Badge estado={item.gravedad} />
              </View>
              <Text style={styles.desc}>{item.descripcion}</Text>
              <Text style={styles.sub}>
                {item.ubicacion ? `${item.ubicacion} · ` : ''}{fechaHora(item.fecha)}
              </Text>
              <Badge estado={item.estado} />
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabTexto}>＋ Reportar incidente</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <FormIncidente onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); cargar(); }} />
      </Modal>
    </View>
  );
}

function FormIncidente({ onCerrar, onGuardado }) {
  const [tipo, setTipo] = useState('otro');
  const [gravedad, setGravedad] = useState('baja');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!descripcion.trim()) { Alert.alert('Falta la descripción'); return; }
    setGuardando(true);
    try {
      await api.post('/incidentes', { tipo, gravedad, descripcion, ubicacion, estado: 'abierto' });
      onGuardado();
    } catch (e) { Alert.alert('Error', e.message); setGuardando(false); }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitulo}>Reportar incidente</Text>

      <Text style={styles.label}>Tipo</Text>
      <Chips opciones={TIPOS} valor={tipo} onElegir={setTipo} />

      <Text style={styles.label}>Gravedad</Text>
      <Chips opciones={GRAVEDADES} valor={gravedad} onElegir={setGravedad} />

      <Text style={styles.label}>Descripción</Text>
      <TextInput style={[styles.input, { height: 90 }]} multiline value={descripcion} onChangeText={setDescripcion} placeholder="¿Qué ocurrió?" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Ubicación</Text>
      <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Lugar" placeholderTextColor="#9aa8a0" />

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

function Chips({ opciones, valor, onElegir }) {
  return (
    <View style={styles.chips}>
      {opciones.map((o) => (
        <TouchableOpacity key={o} style={[styles.chip, valor === o && styles.chipActivo]} onPress={() => onElegir(o)}>
          <Text style={[styles.chipTexto, valor === o && styles.chipTextoActivo]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipo: { fontSize: 16, fontWeight: '700', color: colores.texto, textTransform: 'capitalize' },
  desc: { color: colores.texto },
  sub: { fontSize: 12, color: colores.textoSuave },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
  form: { flex: 1, backgroundColor: colores.arena, padding: 20, paddingTop: 60 },
  formTitulo: { fontSize: 20, fontWeight: '700', color: colores.texto, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 12, fontSize: 15, color: colores.texto, backgroundColor: '#fff', textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.verde, borderColor: colores.verde },
  chipTexto: { color: colores.texto, textTransform: 'capitalize', fontSize: 13 },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 28 },
  boton: { flex: 1, backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonSec: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
