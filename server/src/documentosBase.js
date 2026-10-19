// Contenido inicial de normas y reglamentos de la asociación. Se cargan una
// sola vez (si no existe un documento con el mismo título), publicados, para
// que la asociación no parta de cero y solo deba ajustarlos. La Directiva
// puede editarlos, despublicarlos o reemplazarlos por un PDF desde el módulo
// "Normas y reglamentos".
export const DOCUMENTOS_BASE = [
  {
    titulo: 'Estatutos de la Asociación de Propietarios',
    categoria: 'estatutos',
    descripcion: 'Estatutos vigentes que rigen la asociación de propietarios del Centro de Retiro Lomas Lindas.',
    orden: 0,
    fecha: '2020-01-15',
    contenido: `ESTATUTOS DE LA ASOCIACIÓN DE PROPIETARIOS (texto base de referencia)

CAPÍTULO I. DENOMINACIÓN, DOMICILIO Y OBJETO
Art. 1. La asociación se denomina Asociación de Propietarios del Centro de Retiro Lomas Lindas, sin fines de lucro.
Art. 2. Su objeto es administrar las áreas comunes, velar por la seguridad y la convivencia, y representar los intereses comunes de los propietarios.

CAPÍTULO II. DE LOS MIEMBROS
Art. 3. Son miembros todos los propietarios de un solar o una edificación dentro del proyecto.
Art. 4. Son deberes del miembro cumplir los estatutos, reglamentos y resoluciones, y mantener al día su cuota de mantenimiento.

CAPÍTULO III. DE LOS ÓRGANOS
Art. 5. Son órganos de la asociación la Asamblea General y la Directiva.
Art. 6. La Asamblea General es la máxima autoridad; se reúne de forma ordinaria una vez al año y de forma extraordinaria cuando sea convocada.
Art. 7. La Directiva administra la asociación entre asambleas y ejecuta sus resoluciones.

CAPÍTULO IV. DE LAS ASAMBLEAS
Art. 8. La asamblea ordinaria conoce la memoria, el estado financiero y el presupuesto; la extraordinaria trata los asuntos para los que fue convocada.
Art. 9. Las resoluciones de asamblea obligan a todos los propietarios.

(Texto base de referencia. La Directiva debe revisarlo y adaptarlo antes de su aplicación formal.)`,
  },
  {
    titulo: 'Reglamento Interno del Centro de Retiro Lomas Lindas',
    categoria: 'reglamento_interno',
    descripcion: 'Normas generales que rigen la vida en el proyecto y la relación entre los propietarios y la asociación.',
    orden: 1,
    fecha: '2024-01-10',
    contenido: `CAPÍTULO I. DISPOSICIONES GENERALES
Art. 1. El presente reglamento regula la convivencia, el uso de las áreas comunes y los deberes y derechos de los propietarios del Centro de Retiro Lomas Lindas.
Art. 2. Es de obligatorio cumplimiento para propietarios, familiares, inquilinos, empleados domésticos y visitantes.

CAPÍTULO II. DE LOS PROPIETARIOS
Art. 3. Todo propietario debe mantener al día el pago de la cuota de mantenimiento, que es la principal fuente de recursos de la asociación.
Art. 4. El propietario es responsable de la conducta de sus familiares, empleados y visitantes dentro del proyecto.
Art. 5. El propietario debe mantener su solar o su edificación en buen estado de limpieza, ornato y seguridad.

CAPÍTULO III. DE LA CUOTA DE MANTENIMIENTO
Art. 6. La cuota se paga por período según el tipo de propiedad (solar o edificado) y su monto puede ser actualizado por la Directiva conforme a la inflación y los costos de operación.
Art. 7. Los pagos se aplican siempre a la deuda más antigua. No se condonan ni se descuentan las deudas pendientes.

CAPÍTULO IV. DE LA SEGURIDAD Y EL ACCESO
Art. 9. El acceso al proyecto se controla en el portón. Todo visitante debe identificarse y portar la credencial que le sea asignada.
Art. 10. Los empleados domésticos y de los propietarios deben portar su carné y credencial de acceso.
Art. 11. El personal de seguridad realiza rondas de vigilancia; obstaculizarlas o agredir al personal constituye una falta grave.

CAPÍTULO V. DE LAS FALTAS Y SANCIONES
Art. 12. Las faltas se clasifican en leves, graves y muy graves, según su impacto en la convivencia y la seguridad.
Art. 13. La Directiva podrá aplicar amonestaciones y, en los casos previstos, restringir el acceso de visitantes reincidentes, sin perjuicio de las acciones legales que correspondan.

DISPOSICIÓN FINAL
Art. 14. Lo no previsto en este reglamento será resuelto por la Directiva conforme a los estatutos de la asociación y a las leyes de la República Dominicana.

(Texto base de referencia. La Directiva debe revisarlo y adaptarlo antes de su aplicación formal.)`,
  },
  {
    titulo: 'Normas de Convivencia',
    categoria: 'convivencia',
    descripcion: 'Reglas para una convivencia tranquila y respetuosa entre vecinos.',
    orden: 2,
    fecha: '2024-01-10',
    contenido: `1. HORARIOS DE SILENCIO
Se respetará el silencio de 10:00 p.m. a 7:00 a.m. Durante este horario se evitarán ruidos, música alta y trabajos de construcción.

2. RUIDOS Y FIESTAS
Las actividades sociales no deben perturbar a los vecinos. Para eventos con música se recomienda avisar a la administración con antelación.

3. ÁREAS COMUNES
Las áreas comunes son de uso de todos. Deben mantenerse limpias; cada quien recoge lo que genera y reporta cualquier daño a la administración.

4. MASCOTAS
Las mascotas deben estar siempre bajo control de su dueño. Sus desechos deben ser recogidos de inmediato. No se permiten animales que representen un peligro para los vecinos.

5. ESTACIONAMIENTO Y VELOCIDAD
Se respetarán los espacios de estacionamiento asignados y la velocidad máxima dentro del proyecto para proteger a peatones y niños.

6. VISITANTES
El propietario es responsable de sus visitantes, quienes deben registrarse en el portón y respetar estas normas.

7. CONSTRUCCIONES Y REMODELACIONES
Las obras deben realizarse en horario laboral, manteniendo limpio el entorno y retirando los escombros por los medios autorizados.

(Texto base de referencia. La Directiva debe revisarlo y adaptarlo antes de su aplicación formal.)`,
  },
  {
    titulo: 'Normas de Medio Ambiente',
    categoria: 'medio_ambiente',
    descripcion: 'Cuidado del entorno, manejo de residuos y protección de las áreas verdes del proyecto.',
    orden: 3,
    fecha: '2024-01-10',
    contenido: `1. MANEJO DE RESIDUOS SÓLIDOS
La basura debe depositarse en los puntos y horarios establecidos, debidamente embolsada. No se permite verter residuos en solares, calles ni áreas verdes.

2. PROHIBICIÓN DE QUEMA
Queda prohibida la quema de basura, residuos o maleza dentro del proyecto por el riesgo de incendios y la contaminación del aire.

3. SEPARACIÓN Y RECICLAJE
Se promueve separar los residuos reciclables (plástico, vidrio, cartón) de los orgánicos para facilitar su manejo.

4. ÁREAS VERDES Y ARBORIZACIÓN
Se protege la vegetación y los árboles del proyecto. La tala o poda mayor requiere autorización de la administración.

5. USO RESPONSABLE DEL AGUA
Se hará un uso racional del agua, evitando desperdicios y reportando fugas a la administración.

6. RUIDO Y CONTAMINACIÓN
Se evitarán actividades que generen contaminación sonora, de humo o de olores que afecten a los vecinos y al entorno natural del retiro.

7. RECOGIDA Y TRASLADO AL VERTEDERO
La recolección de residuos y su traslado al vertedero se realiza por el personal de ornato con los vehículos autorizados, dejando constancia de cada viaje.

(Texto base de referencia. La Directiva debe revisarlo y adaptarlo antes de su aplicación formal.)`,
  },
  {
    titulo: 'Resolución de la Directiva 2026-01 — Cuota de mantenimiento',
    categoria: 'resoluciones',
    descripcion: 'Actualización del monto de la cuota de mantenimiento por tipo de propiedad.',
    orden: 10,
    fecha: '2026-02-05',
    contenido: `RESOLUCIÓN DE LA DIRECTIVA No. 2026-01 (ejemplo)

La Directiva, reunida en sesión ordinaria, RESUELVE:
1. Actualizar la cuota de mantenimiento conforme a los costos de operación y la inflación.
2. Mantener el mismo monto para las propiedades edificadas y un monto menor para los solares.
3. La medida rige a partir del próximo período de facturación.

(Ejemplo de referencia. Reemplazar por la resolución real.)`,
  },
  {
    titulo: 'Acta de Asamblea Ordinaria 2025',
    categoria: 'resoluciones_asamblea_ordinaria',
    descripcion: 'Resoluciones de la asamblea ordinaria anual: memoria, estado financiero y presupuesto.',
    orden: 20,
    fecha: '2025-03-15',
    contenido: `ACTA DE ASAMBLEA GENERAL ORDINARIA 2025 (ejemplo)

Orden del día y resoluciones:
1. Aprobación de la memoria anual de la Directiva.
2. Aprobación del estado financiero del período.
3. Aprobación del presupuesto para el nuevo año.
4. Elección/ratificación de los miembros de la Directiva.

(Ejemplo de referencia. Reemplazar por el acta real.)`,
  },
  {
    titulo: 'Acta de Asamblea Ordinaria 2026',
    categoria: 'resoluciones_asamblea_ordinaria',
    descripcion: 'Resoluciones de la asamblea ordinaria anual: memoria, estado financiero y presupuesto.',
    orden: 21,
    fecha: '2026-03-14',
    contenido: `ACTA DE ASAMBLEA GENERAL ORDINARIA 2026 (ejemplo)

Orden del día y resoluciones:
1. Aprobación de la memoria anual de la Directiva.
2. Aprobación del estado financiero del período.
3. Aprobación del presupuesto para el nuevo año.
4. Plan de seguridad y mantenimiento de las áreas comunes.

(Ejemplo de referencia. Reemplazar por el acta real.)`,
  },
  {
    titulo: 'Acta de Asamblea Extraordinaria 2025-01 — Obras del portón',
    categoria: 'resoluciones_asamblea_extraordinaria',
    descripcion: 'Resoluciones sobre la inversión en el sistema de seguridad del portón de acceso.',
    orden: 30,
    fecha: '2025-09-10',
    contenido: `ACTA DE ASAMBLEA GENERAL EXTRAORDINARIA 2025-01 (ejemplo)

Asunto único de la convocatoria:
1. Aprobación de la inversión en el nuevo sistema de control de acceso del portón.
2. Forma de financiamiento y cronograma de ejecución.

(Ejemplo de referencia. Reemplazar por el acta real.)`,
  },
];
