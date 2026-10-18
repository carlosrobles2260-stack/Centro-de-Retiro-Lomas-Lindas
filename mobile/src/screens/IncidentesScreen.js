import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Image, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { API_URL } from '../config';
import { colores } from '../theme';
import { Badge, fechaHora } from '../components/ui';

const TIPOS = ['acceso', 'robo', 'emergencia', 'daño', 'otro'];
const GRAVEDADES = ['baja', 'media', 'alta', 'critica'];
const INVOLUCRADOS = ['visitante', 'propietario', 'empleado', 'seguridad', 'otro'];

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
                <View>
                  <Text style={styles.tipo}>{item.tipo}</Text>
                  {item.involucrado ? <Text style={styles.sub}>con {item.involucrado}</Text> : null}
                </View>
                <Badge estado={item.gravedad} />
              </View>
              {item.foto ? <Image source={{ uri: API_URL + item.foto }} style={styles.foto} /> : null}
              <Text style={styles.desc}>{item.descripcion}</Text>
              <Text style={styles.sub}>
                {item.ubicacion ? `📍 ${item.ubicacion} · ` : ''}{fechaHora(item.fecha)}
              </Text>
              {item.propietario_nombre ? <Text style={styles.sub}>Propietario: {item.propietario_nombre}{item.propiedad ? ` (${item.propiedad})` : ''}</Text> : null}
              {item.responsable_nombre ? <Text style={styles.sub}>Responsable: {item.responsable_nombre}</Text> : null}
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
  const [involucrado, setInvolucrado] = useState('');
  const [gravedad, setGravedad] = useState('baja');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [responsableId, setResponsableId] = useState('');
  const [abiertoResp, setAbiertoResp] = useState(false);
  const [propietarios, setPropietarios] = useState([]);
  const [propietarioId, setPropietarioId] = useState('');
  const [abiertoProp, setAbiertoProp] = useState(false);
  const [foto, setFoto] = useState(null); // { uri, base64 }
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/empleados').then(setEmpleados).catch(() => {});
    api.get('/propietarios').then(setPropietarios).catch(() => {});
  }, []);

  function elegirPropietario(p) {
    setPropietarioId(p ? p.id : '');
    if (p && !ubicacion) setUbicacion(p.propiedad || '');
    setAbiertoProp(false);
  }

  async function tomarFoto(desdeCamara) {
    const permiso = desdeCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Permiso necesario', 'Se necesita acceso para adjuntar la foto.'); return; }
    const fn = desdeCamara ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const r = await fn({ base64: true, quality: 0.6, allowsEditing: false });
    if (!r.canceled && r.assets?.[0]) {
      setFoto({ uri: r.assets[0].uri, base64: r.assets[0].base64 });
    }
  }

  async function guardar() {
    if (!descripcion.trim()) { Alert.alert('Falta la descripción'); return; }
    setGuardando(true);
    try {
      const payload = { tipo, involucrado: involucrado || null, gravedad, descripcion, ubicacion, estado: 'abierto', responsable_id: responsableId || null, propietario_id: propietarioId || null };
      if (foto?.base64) payload.foto_base64 = `data:image/jpeg;base64,${foto.base64}`;
      await api.post('/incidentes', payload);
      onGuardado();
    } catch (e) { Alert.alert('Error', e.message); setGuardando(false); }
  }

  const responsable = empleados.find((e) => String(e.id) === String(responsableId));
  const propietario = propietarios.find((p) => String(p.id) === String(propietarioId));

  return (
    <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.formTitulo}>Reportar incidente</Text>

      <Text style={styles.label}>Tipo</Text>
      <Chips opciones={TIPOS} valor={tipo} onElegir={setTipo} />

      <Text style={styles.label}>¿Con quién fue el incidente?</Text>
      <Chips opciones={INVOLUCRADOS} valor={involucrado} onElegir={setInvolucrado} />

      <Text style={styles.label}>Gravedad</Text>
      <Chips opciones={GRAVEDADES} valor={gravedad} onElegir={setGravedad} />

      <Text style={styles.label}>Descripción</Text>
      <TextInput style={[styles.input, { height: 90 }]} multiline value={descripcion} onChangeText={setDescripcion} placeholder="¿Qué ocurrió?" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Propietario relacionado</Text>
      <TouchableOpacity style={styles.input} onPress={() => setAbiertoProp((a) => !a)}>
        <Text style={{ color: propietario ? colores.texto : '#9aa8a0' }}>
          {propietario ? `${propietario.nombre}${propietario.propiedad ? ` · ${propietario.propiedad}` : ''}` : 'Ninguno'}
        </Text>
      </TouchableOpacity>
      {abiertoProp && (
        <View style={styles.lista}>
          <TouchableOpacity style={styles.listaItem} onPress={() => elegirPropietario(null)}>
            <Text style={{ color: colores.textoSuave }}>Ninguno</Text>
          </TouchableOpacity>
          {propietarios.map((p) => (
            <TouchableOpacity key={p.id} style={styles.listaItem} onPress={() => elegirPropietario(p)}>
              <Text style={{ color: colores.texto }}>{p.nombre}{p.propiedad ? ` · ${p.propiedad}` : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Lugar</Text>
      <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Dónde ocurrió" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Responsable</Text>
      <TouchableOpacity style={styles.input} onPress={() => setAbiertoResp((a) => !a)}>
        <Text style={{ color: responsable ? colores.texto : '#9aa8a0' }}>{responsable ? responsable.nombre : 'Sin asignar'}</Text>
      </TouchableOpacity>
      {abiertoResp && (
        <View style={styles.lista}>
          <TouchableOpacity style={styles.listaItem} onPress={() => { setResponsableId(''); setAbiertoResp(false); }}>
            <Text style={{ color: colores.textoSuave }}>Sin asignar</Text>
          </TouchableOpacity>
          {empleados.map((e) => (
            <TouchableOpacity key={e.id} style={styles.listaItem} onPress={() => { setResponsableId(e.id); setAbiertoResp(false); }}>
              <Text style={{ color: colores.texto }}>{e.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Foto de evidencia</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.botonFoto]} onPress={() => tomarFoto(true)}>
          <Text style={styles.botonFotoTexto}>📷 Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonFoto]} onPress={() => tomarFoto(false)}>
          <Text style={styles.botonFotoTexto}>🖼️ Galería</Text>
        </TouchableOpacity>
      </View>
      {foto && <Image source={{ uri: foto.uri }} style={styles.preview} />}

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
  foto: { width: '100%', height: 160, borderRadius: 8, backgroundColor: '#eee' },
  desc: { color: colores.texto },
  sub: { fontSize: 12, color: colores.textoSuave },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
  form: { flex: 1, backgroundColor: colores.arena, padding: 20, paddingTop: 60 },
  formTitulo: { fontSize: 20, fontWeight: '700', color: colores.texto, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 12, fontSize: 15, color: colores.texto, backgroundColor: '#fff', textAlignVertical: 'top' },
  lista: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde, borderRadius: 10, marginTop: 4, maxHeight: 200 },
  listaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colores.borde },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.verde, borderColor: colores.verde },
  chipTexto: { color: colores.texto, textTransform: 'capitalize', fontSize: 13 },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  botonFoto: { flex: 1, backgroundColor: colores.verdeMuyClaro, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonFotoTexto: { color: colores.verde, fontWeight: '600' },
  preview: { width: '100%', height: 180, borderRadius: 10, marginTop: 10, backgroundColor: '#eee' },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 28 },
  boton: { flex: 1, backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonSec: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
