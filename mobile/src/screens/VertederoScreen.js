import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colores } from '../theme';
import { fecha } from '../components/ui';

const hoyISO = () => new Date().toISOString().slice(0, 10);
const ahoraHHMM = () => new Date().toTimeString().slice(0, 5);

export default function VertederoScreen() {
  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setFilas(await api.get('/viajes-vertedero'));
      setResumen(await api.get('/viajes-vertedero/resumen').catch(() => null));
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCargando(false); }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const Encabezado = (
    <View style={styles.resumen}>
      <Col n={resumen?.hoy} l="Hoy" />
      <Col n={resumen?.mes} l="Este mes" />
      <Col n={resumen?.total} l="Total" />
    </View>
  );

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
          ListHeaderComponent={Encabezado}
          ListEmptyComponent={<Text style={styles.vacio}>Sin viajes registrados.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.fecha}>{fecha(item.fecha)}</Text>
                <Text style={styles.horas}>{item.hora_salida || '—'}{item.hora_regreso ? ` → ${item.hora_regreso}` : ''}</Text>
              </View>
              {item.vehiculo ? <Text style={styles.sub}>🚛 {item.vehiculo}</Text> : null}
              {item.responsable_nombre ? <Text style={styles.sub}>Responsable: {item.responsable_nombre}</Text> : null}
              {item.notas ? <Text style={styles.sub}>{item.notas}</Text> : null}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabTexto}>＋ Registrar viaje</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <FormViaje onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); cargar(); }} />
      </Modal>
    </View>
  );
}

function Col({ n, l }) {
  return (
    <View style={styles.resCol}>
      <Text style={styles.resNum}>{n ?? '…'}</Text>
      <Text style={styles.resLbl}>{l}</Text>
    </View>
  );
}

function FormViaje({ onCerrar, onGuardado }) {
  const [fechaV, setFechaV] = useState(hoyISO());
  const [salida, setSalida] = useState(ahoraHHMM());
  const [regreso, setRegreso] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [responsableId, setResponsableId] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { api.get('/empleados').then(setEmpleados).catch(() => {}); }, []);
  const responsable = empleados.find((e) => String(e.id) === String(responsableId));

  async function guardar() {
    setGuardando(true);
    try {
      await api.post('/viajes-vertedero', {
        fecha: fechaV || hoyISO(), hora_salida: salida || null, hora_regreso: regreso || null,
        vehiculo: vehiculo || null, responsable_id: responsableId || null, notas: notas || null,
      });
      onGuardado();
    } catch (e) { Alert.alert('Error', e.message); setGuardando(false); }
  }

  return (
    <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.formTitulo}>Registrar viaje al vertedero</Text>

      <Text style={styles.label}>Fecha</Text>
      <TextInput style={styles.input} value={fechaV} onChangeText={setFechaV} placeholder="AAAA-MM-DD" placeholderTextColor="#9aa8a0" />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Hora de salida</Text>
          <View style={styles.horaFila}>
            <TextInput style={[styles.input, { flex: 1 }]} value={salida} onChangeText={setSalida} placeholder="HH:MM" placeholderTextColor="#9aa8a0" />
            <TouchableOpacity style={styles.ahora} onPress={() => setSalida(ahoraHHMM())}><Text style={styles.ahoraTxt}>Ahora</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Hora de regreso</Text>
          <View style={styles.horaFila}>
            <TextInput style={[styles.input, { flex: 1 }]} value={regreso} onChangeText={setRegreso} placeholder="HH:MM" placeholderTextColor="#9aa8a0" />
            <TouchableOpacity style={styles.ahora} onPress={() => setRegreso(ahoraHHMM())}><Text style={styles.ahoraTxt}>Ahora</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Vehículo (placa o nombre)</Text>
      <TextInput style={styles.input} value={vehiculo} onChangeText={setVehiculo} placeholder="Ej: Camión LL-01" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Responsable / conductor</Text>
      <TouchableOpacity style={styles.input} onPress={() => setAbierto((a) => !a)}>
        <Text style={{ color: responsable ? colores.texto : '#9aa8a0' }}>{responsable ? responsable.nombre : 'Sin asignar'}</Text>
      </TouchableOpacity>
      {abierto && (
        <View style={styles.lista}>
          <TouchableOpacity style={styles.listaItem} onPress={() => { setResponsableId(''); setAbierto(false); }}>
            <Text style={{ color: colores.textoSuave }}>Sin asignar</Text>
          </TouchableOpacity>
          {empleados.map((e) => (
            <TouchableOpacity key={e.id} style={styles.listaItem} onPress={() => { setResponsableId(e.id); setAbierto(false); }}>
              <Text style={{ color: colores.texto }}>{e.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Notas</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={notas} onChangeText={setNotas} placeholder="Observaciones" placeholderTextColor="#9aa8a0" />

      <View style={styles.formBotones}>
        <TouchableOpacity style={[styles.boton, styles.botonSec]} onPress={onCerrar}>
          <Text style={{ color: colores.texto, fontWeight: '600' }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  resumen: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colores.borde, flexDirection: 'row', justifyContent: 'space-around' },
  resCol: { alignItems: 'center' },
  resNum: { fontSize: 24, fontWeight: '700', color: colores.verde },
  resLbl: { fontSize: 12, color: colores.textoSuave },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fecha: { fontSize: 16, fontWeight: '700', color: colores.texto },
  horas: { color: colores.verde, fontWeight: '600' },
  sub: { fontSize: 13, color: colores.textoSuave },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
  form: { flex: 1, backgroundColor: colores.arena, padding: 20, paddingTop: 60 },
  formTitulo: { fontSize: 20, fontWeight: '700', color: colores.texto, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 12, fontSize: 15, color: colores.texto, backgroundColor: '#fff', textAlignVertical: 'top' },
  horaFila: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  ahora: { backgroundColor: colores.verdeMuyClaro, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  ahoraTxt: { color: colores.verde, fontWeight: '600', fontSize: 13 },
  lista: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde, borderRadius: 10, marginTop: 4, maxHeight: 200 },
  listaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colores.borde },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 28 },
  boton: { flex: 1, backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonSec: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
