import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../api';
import { colores } from '../theme';

export default function RegistrarVisitaScreen({ route, navigation }) {
  const visitantePre = route.params?.visitante || null;
  const [visitantes, setVisitantes] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [datos, setDatos] = useState({
    visitante_id: visitantePre?.id || '',
    propietario_id: visitantePre?.propietario_id || '',
    motivo: '',
    autorizado_por: visitantePre?.propietario_nombre || '',
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!visitantePre) api.get('/visitantes').then(setVisitantes).catch(() => {});
    api.get('/propietarios').then(setPropietarios).catch(() => {});
  }, []);

  const nombreVisitante = visitantePre?.nombre
    || visitantes.find((v) => v.id === datos.visitante_id)?.nombre;

  async function guardar() {
    if (!datos.visitante_id) {
      Alert.alert('Falta el visitante', 'Selecciona o escanea un visitante.');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/visitas', { ...datos, propietario_id: datos.propietario_id || null });
      Alert.alert('Visita registrada', `Se registró la visita de ${nombreVisitante}.`);
      navigation.navigate('Visitas');
    } catch (e) {
      Alert.alert('Error', e.message);
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={{ padding: 16 }}>
      {visitantePre ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>✅ Credencial escaneada</Text>
          <Text style={styles.bannerNombre}>{visitantePre.nombre}</Text>
          <Text style={styles.bannerSub}>{visitantePre.codigo} · {visitantePre.tipo}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Visitante</Text>
          <Selector
            opciones={visitantes.map((v) => ({ id: v.id, label: `${v.nombre}${v.documento ? ` (${v.documento})` : ''}`, propietario_id: v.propietario_id }))}
            valor={datos.visitante_id}
            onElegir={(o) => setDatos((d) => ({ ...d, visitante_id: o.id, propietario_id: o.propietario_id || d.propietario_id }))}
            placeholder="Selecciona un visitante"
          />
        </>
      )}

      <Text style={styles.label}>Propietario que recibe</Text>
      <Selector
        opciones={propietarios.map((p) => ({ id: p.id, label: `${p.nombre}${p.propiedad ? ` · ${p.propiedad}` : ''}` }))}
        valor={datos.propietario_id}
        onElegir={(o) => setDatos((d) => ({ ...d, propietario_id: o.id }))}
        placeholder="Selecciona un propietario"
      />

      <Text style={styles.label}>Motivo</Text>
      <TextInput style={styles.input} value={datos.motivo} onChangeText={(t) => setDatos((d) => ({ ...d, motivo: t }))} placeholder="Motivo de la visita" placeholderTextColor="#9aa8a0" />

      <Text style={styles.label}>Autorizado por</Text>
      <TextInput style={styles.input} value={datos.autorizado_por} onChangeText={(t) => setDatos((d) => ({ ...d, autorizado_por: t }))} placeholder="Nombre de quien autoriza" placeholderTextColor="#9aa8a0" />

      <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Registrar visita</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// Selector simple tipo lista desplegable.
function Selector({ opciones, valor, onElegir, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const elegido = opciones.find((o) => o.id === valor);
  return (
    <View>
      <TouchableOpacity style={styles.input} onPress={() => setAbierto((a) => !a)}>
        <Text style={{ color: elegido ? colores.texto : '#9aa8a0' }}>{elegido ? elegido.label : placeholder}</Text>
      </TouchableOpacity>
      {abierto && (
        <View style={styles.lista}>
          {opciones.length === 0 && <Text style={styles.listaVacia}>Sin opciones</Text>}
          {opciones.map((o) => (
            <TouchableOpacity key={o.id} style={styles.listaItem} onPress={() => { onElegir(o); setAbierto(false); }}>
              <Text style={{ color: colores.texto }}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  banner: { backgroundColor: colores.verdeMuyClaro, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colores.verdeClaro },
  bannerTexto: { color: colores.verde, fontWeight: '700' },
  bannerNombre: { fontSize: 18, fontWeight: '700', color: colores.texto, marginTop: 4 },
  bannerSub: { color: colores.textoSuave, marginTop: 2, textTransform: 'capitalize' },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colores.texto, backgroundColor: '#fff' },
  lista: { backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde, borderRadius: 10, marginTop: 4, maxHeight: 220 },
  listaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colores.borde },
  listaVacia: { padding: 12, color: colores.textoSuave },
  boton: { backgroundColor: colores.verde, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
