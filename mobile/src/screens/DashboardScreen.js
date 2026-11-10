import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAuth } from '../auth';
import { colores } from '../theme';
import { Badge, fechaHora } from '../components/ui';

export default function DashboardScreen() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setD(await api.get('/dashboard'));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (cargando && !d) {
    return <View style={styles.centro}><ActivityIndicator size="large" color={colores.verde} /></View>;
  }

  return (
    <ScrollView
      style={styles.fondo}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
    >
      <Text style={styles.saludo}>Hola, {usuario?.nombre}</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {d && (
        <>
          <Text style={styles.seccion}>Seguridad</Text>
          <View style={styles.grid}>
            <Stat etiqueta="Visitas hoy" valor={d.seguridad.visitasHoy} />
            <Stat etiqueta="Dentro ahora" valor={d.seguridad.visitasDentro} color={colores.verde} />
            <Stat etiqueta="Pendientes" valor={d.seguridad.visitasPendientes} color={colores.amarillo} />
            <Stat etiqueta="Incidentes abiertos" valor={d.seguridad.incidentesAbiertos} color={colores.rojo} />
          </View>

          <Text style={styles.seccion}>Visitas recientes</Text>
          <View style={styles.card}>
            {d.visitasRecientes.length === 0 ? (
              <Text style={styles.vacio}>Sin visitas recientes.</Text>
            ) : d.visitasRecientes.map((v) => (
              <View key={v.id} style={styles.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filaTitulo}>{v.visitante_nombre}</Text>
                  <Text style={styles.filaSub}>{v.propietario_nombre || 'Sin propietario'} · {fechaHora(v.creado_en)}</Text>
                </View>
                <Badge estado={v.estado} />
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ etiqueta, valor, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEtiqueta}>{etiqueta}</Text>
      <Text style={[styles.statValor, color && { color }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.arena },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colores.arena },
  saludo: { fontSize: 22, fontWeight: '700', color: colores.texto, marginBottom: 8 },
  seccion: { fontSize: 14, fontWeight: '600', color: colores.textoSuave, marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    width: '47.5%', borderWidth: 1, borderColor: colores.borde,
  },
  statEtiqueta: { fontSize: 12, color: colores.textoSuave },
  statValor: { fontSize: 26, fontWeight: '700', color: colores.texto, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colores.borde },
  fila: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colores.borde },
  filaTitulo: { fontWeight: '600', color: colores.texto },
  filaSub: { fontSize: 12, color: colores.textoSuave, marginTop: 2 },
  vacio: { padding: 16, color: colores.textoSuave, textAlign: 'center' },
  error: { color: colores.rojo, marginVertical: 8 },
});
