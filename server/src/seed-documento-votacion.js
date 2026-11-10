// Agrega a la lista de documentos (Normas y reglamentos) el comunicado de
// "Requisitos de Votación" de las Elecciones de la Junta Directiva 2026-2028.
// Idempotente: no lo duplica si ya existe (por título).
//
// Uso: docker compose exec -T server node src/seed-documento-votacion.js
import db from './db.js';

const TITULO = 'Requisitos de Votación — Elecciones Junta Directiva 2026-2028 (ASOPROLOLI)';
const CATEGORIA = 'resoluciones';
const DESCRIPCION = 'Condiciones indispensables para participar y votar en las asambleas eleccionarias, conforme a los Estatutos de la Asociación de Propietarios de Lomas Lindas (ASOPROLOLI).';
const CONTENIDO =
`ASOCIACIÓN DE PROPIETARIOS DE LOMAS LINDAS (ASOPROLOLI)
Elecciones Junta Directiva 2026 – 2028

De conformidad con los estatutos de ASOPROLOLI, se informa a todos los miembros de la comunidad las condiciones indispensables para participar y ejercer su derecho al voto en las asambleas eleccionarias:

1) ACREDITACIÓN DE PROPIEDAD Y CALIDAD DE MIEMBRO
Ser titular de un inmueble en el proyecto, registrado en el libro de propietarios y acreditado mediante Certificado de Título o constancia avalada ante la Junta Directiva. (Artículos 5 y 6)

2) ESTAR AL DÍA CON LAS CUOTAS
Cumplir puntualmente con el pago de las cuotas y contribuciones mensuales regularmente fijadas por la asociación. (Artículo 9)

3) ASISTENCIA PRESENCIAL O REPRESENTACIÓN FORMAL
Asistir presencialmente a la asamblea o designar un representante mediante un Poder Especial legalizado por Notario Público, el cual debe quedar depositado en los archivos de la asociación. (Artículo 14)

4) LÍMITE DE REPRESENTACIÓN
Una persona únicamente puede actuar en representación de un (1) solo propietario. (Artículo 14, Párrafo I)

5) UNIDAD DE REPRESENTACIÓN EN COPROPIEDAD
Si el inmueble pertenece a dos o más personas o posee usufructo, debe designarse a un único representante que actúe en nombre de todos. (Artículo 15)

6) REGLA DE VOTO
Cada propietario tiene derecho a un (1) solo voto. (Artículo 16)

¡SU PARTICIPACIÓN ES FUNDAMENTAL!
Asegúrese de verificar su estado de cuenta y tramitar o depositar sus poderes con la debida anticipación a la celebración de la asamblea.`;

const existe = await db.get('SELECT id FROM documentos WHERE titulo = ?', [TITULO]);
if (existe) {
  console.log('• ya existía el documento. No se duplica.');
  process.exit(0);
}
await db.run(
  `INSERT INTO documentos (titulo, categoria, descripcion, contenido, publicado, orden)
   VALUES (?, ?, ?, ?, 1, 0)`,
  [TITULO, CATEGORIA, DESCRIPCION, CONTENIDO],
);
console.log('✓ documento agregado y publicado:', TITULO);
process.exit(0);
