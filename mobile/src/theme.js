// Paleta y estilos compartidos (coherentes con la app web).
export const colores = {
  verde: '#2f6e4f',
  verdeClaro: '#4a9270',
  verdeMuyClaro: '#e8f3ec',
  arena: '#f5f2eb',
  texto: '#1f2a24',
  textoSuave: '#5d6b63',
  borde: '#dfe4e0',
  blanco: '#ffffff',
  rojo: '#c0392b',
  amarillo: '#d98e04',
  azul: '#2b6cb0',
  gris: '#eceff0',
};

// Color de badge según el estado.
export function colorEstado(estado) {
  const map = {
    pendiente: colores.amarillo, autorizada: colores.azul, dentro: colores.verde,
    finalizada: colores.textoSuave, rechazada: colores.rojo,
    abierto: colores.rojo, en_proceso: colores.amarillo, cerrado: colores.verde,
    baja: colores.textoSuave, media: colores.amarillo, alta: colores.rojo, critica: colores.rojo,
    normal: colores.verde, novedad: colores.amarillo,
  };
  return map[estado] || colores.textoSuave;
}
