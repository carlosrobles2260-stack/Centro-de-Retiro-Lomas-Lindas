import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colores } from '../theme';

const EMOJI = { camion: '🚛', pickup: '🚙', patrulla: '🚓', moto: '🏍️', otro: '📍' };

// Distancia en metros entre dos coordenadas (Haversine).
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estadoVehiculo(v, geocercas) {
  if (v.lat == null) return { texto: 'Sin señal', color: colores.textoSuave };
  const enVertedero = geocercas.some(
    (g) => g.tipo === 'vertedero' &&
      distanciaMetros(v.lat, v.lng, Number(g.lat), Number(g.lng)) <= Number(g.radio_m)
  );
  if (enVertedero) return { texto: 'En el vertedero', color: colores.rojo };
  if (Number(v.velocidad) > 0) return { texto: 'En movimiento', color: colores.verde };
  return { texto: 'Detenido', color: colores.amarillo };
}

export default function FlotaScreen() {
  const [datos, setDatos] = useState({ vehiculos: [], geocercas: [] });
  const [cargando, setCargando] = useState(true);
  const temporizador = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api.get('/gps/posiciones'));
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setCargando(false); }
  }, []);

  // Refresca al enfocar y cada 15 segundos.
  useFocusEffect(useCallback(() => {
    cargar();
    temporizador.current = setInterval(cargar, 15000);
    return () => clearInterval(temporizador.current);
  }, [cargar]));

  return (
    <View style={styles.fondo}>
      {cargando ? (
        <ActivityIndicator size="large" color={colores.verde} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={datos.vehiculos}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={cargar}
          refreshing={false}
          ListHeaderComponent={<Text style={styles.titulo}>Posición de los vehículos según su GPS. Se actualiza cada 15 segundos.</Text>}
          ListEmptyComponent={<Text style={styles.vacio}>No hay vehículos registrados.</Text>}
          renderItem={({ item }) => {
            const est = estadoVehiculo(item, datos.geocercas);
            return (
              <View style={styles.card}>
                <Text style={styles.emoji}>{EMOJI[item.tipo] || EMOJI.otro}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={styles.sub}>
                    {item.placa ? item.placa + ' · ' : ''}
                    {item.velocidad != null ? `${item.velocidad} km/h` : 'sin datos'}
                  </Text>
                  {item.fecha_hora ? <Text style={styles.sub}>Última señal: {String(item.fecha_hora).slice(11, 16)}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: est.color }]}>
                  <Text style={styles.badgeTxt}>{est.texto}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={cargar}>
        <Text style={styles.fabTexto}>↻ Actualizar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  titulo: { color: colores.textoSuave, fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  nombre: { fontSize: 16, fontWeight: '700', color: colores.texto },
  sub: { fontSize: 13, color: colores.textoSuave },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 40 },
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: colores.verde, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fabTexto: { color: '#fff', fontWeight: '700' },
});
