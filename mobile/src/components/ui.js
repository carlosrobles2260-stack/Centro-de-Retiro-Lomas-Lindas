import { View, Text, StyleSheet } from 'react-native';
import { colorEstado } from '../theme';

export function Badge({ estado }) {
  if (!estado) return null;
  const color = colorEstado(estado);
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeTexto, { color }]}>{String(estado).replace('_', ' ')}</Text>
    </View>
  );
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
