// Carga BORRADORES de ejemplo para las secciones del portal del propietario:
// Nuestra historia, Actividades y Contactos de interés. Se insertan como
// BORRADOR (publicado = 0), ocultos al propietario, para que el administrador
// los edite con los datos reales y luego los marque "Publicado".
//
// Idempotente: no duplica (omite si ya existe un documento con el mismo título y
// categoría). No vuelve a crear uno que el administrador haya borrado a propósito
// (se marca con una clave en configuracion).
//
// Uso: docker compose exec -T server node src/seed-contenido-portal.js
import db from './db.js';

const MARCA = 'contenido_portal_ejemplo';

const BORRADORES = [
  {
    categoria: 'historia', orden: 1,
    titulo: 'Nuestra historia y evolución',
    descripcion: 'Reseña del origen y la evolución del Centro de Retiro Lomas Lindas. (EJEMPLO — edita con los datos reales.)',
    contenido:
`El Centro de Retiro Lomas Lindas nació como un proyecto de la Asociación de Propietarios para contar con un espacio de descanso, convivencia y retiro en un entorno natural y seguro.

• [AÑO] — Fundación de la asociación y adquisición de los terrenos.
• [AÑO] — Trazado de los solares y primeras construcciones.
• [AÑO] — Instalación del portón y del control de acceso.
• [AÑO] — Conformación de la Directiva y aprobación de los Estatutos.

Hoy la comunidad sigue creciendo con mejoras en áreas comunes, seguridad y servicios para el disfrute de todos los propietarios.

(Reemplaza los [AÑO] y este texto por la historia real del proyecto.)`,
  },
  {
    categoria: 'actividades', orden: 1,
    titulo: 'Asamblea General Ordinaria',
    descripcion: 'Cada enero. Rendición de cuentas, aprobación del presupuesto y elección de la Directiva. (EJEMPLO)',
    contenido: 'Participan todos los propietarios al día. Fecha y lugar se anuncian con antelación.',
  },
  {
    categoria: 'actividades', orden: 2,
    titulo: 'Jornada de limpieza y embellecimiento',
    descripcion: 'Trimestral. Mantenimiento de áreas comunes, jardines y vías. (EJEMPLO)',
    contenido: 'Se invita a propietarios y colaboradores a participar. Lleva guantes y herramientas básicas.',
  },
  {
    categoria: 'actividades', orden: 3,
    titulo: 'Retiro y convivencia',
    descripcion: 'Fecha por confirmar. Jornada de retiro y convivencia en las instalaciones del centro. (EJEMPLO)',
    contenido: 'Actividad abierta a las familias de los propietarios.',
  },
  {
    categoria: 'contactos', orden: 1,
    titulo: 'Oficina administrativa',
    descripcion: 'Tel: [809-000-0000] · Correo: [correo@ejemplo.com] · Horario: [L-V 9:00-17:00]. (EJEMPLO)',
    contenido: 'Para pagos, estados de cuenta, accesos y trámites de la asociación.',
  },
  {
    categoria: 'contactos', orden: 2,
    titulo: 'Garita / Seguridad (24 horas)',
    descripcion: 'Tel: [809-000-0000]. (EJEMPLO)',
    contenido: 'Reporta emergencias, visitas o incidentes en el portón.',
  },
  {
    categoria: 'contactos', orden: 3,
    titulo: 'Emergencias',
    descripcion: 'Policía Nacional / Sistema 9-1-1 · Bomberos · Centro de salud más cercano: [nombre y tel]. (EJEMPLO)',
    contenido: '',
  },
  {
    categoria: 'contactos', orden: 4,
    titulo: 'Directiva',
    descripcion: 'Presidenta: [nombre · tel] · Tesorero: [nombre · tel]. (EJEMPLO)',
    contenido: 'Contactos de los miembros de la Directiva para asuntos de la asociación.',
  },
];

const ya = await db.get('SELECT valor FROM configuracion WHERE clave = ?', [MARCA]);
if (ya) { console.log('• borradores de ejemplo ya cargados antes. No se hace nada.'); process.exit(0); }

let creados = 0;
for (const b of BORRADORES) {
  const existe = await db.get('SELECT id FROM documentos WHERE titulo = ? AND categoria = ?', [b.titulo, b.categoria]);
  if (existe) { console.log('• ya existía:', b.categoria, '-', b.titulo); continue; }
  await db.run(
    `INSERT INTO documentos (titulo, categoria, descripcion, contenido, publicado, orden)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [b.titulo, b.categoria, b.descripcion, b.contenido || null, b.orden],
  );
  console.log('✓ borrador creado:', b.categoria, '-', b.titulo);
  creados++;
}

await db.run(
  'INSERT INTO configuracion (clave, valor) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = ?)',
  [MARCA, new Date().toISOString(), MARCA],
);
console.log(`\nListo. Borradores nuevos: ${creados}. Edítalos en "Normas y reglamentos" y márcalos Publicado.`);
process.exit(0);
