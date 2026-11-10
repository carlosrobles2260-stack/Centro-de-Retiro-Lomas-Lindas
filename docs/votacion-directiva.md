# Votación electrónica para elegir la Directiva

_Centro de Retiro Lomas Lindas · 20 de octubre de 2026_

En noviembre se elige la plancha que dirigirá la Directiva de Lomas Lindas durante el período **2026-2028**. El sistema ya cuenta con un **módulo de votación** para que los propietarios elijan la plancha **desde su app**, con voto **secreto**, **un voto por propietario** y **resultados solo al cerrar** la elección. Está construido y probado; lo único que requiere es que la Directiva lo apruebe y defina las fechas.

## El punto clave: votar sin asistir a la asamblea

El voto es **a distancia, desde la app del propietario** ("Mi cuenta"). No hace falta estar presente en la asamblea eleccionaria. Mientras la elección esté **abierta**, cualquier propietario al día entra a su app, ve las planchas y vota. Una misma ventana de votación cubre tres situaciones:

- **Voto anticipado**, en los días previos a la asamblea.
- **Voto durante la asamblea**, para quienes asisten.
- **Voto de los ausentes**, que participan en línea en el mismo período sin tener que desplazarse.

Así, un propietario al día que no pudo asistir **no pierde su derecho al voto**: lo ejerce desde su teléfono mientras la votación siga abierta.

## Cómo funciona

1. **La administración prepara la elección.** Registra el título, el período (2026-2028) y las **planchas** (número, nombre, lema e integrantes con sus cargos).
2. **Se abre la votación.** A partir de ese momento las planchas quedan fijas y los propietarios pueden votar desde su app. Se exige un mínimo de **2 planchas** para abrir.
3. **El propietario vota.** Entra a "Mi cuenta", elige **una sola plancha**, confirma y su voto queda registrado. El sistema le avisa si ya votó o si no está habilitado.
4. **Se cierra la elección.** No se admiten más votos y **recién entonces** se publican los resultados: conteo por plancha, porcentaje, participación y plancha ganadora.

## Las tres reglas acordadas

| Regla | Cómo lo garantiza el sistema |
| --- | --- |
| **Voto secreto** | El padrón (quién votó) y las boletas (qué plancha) se guardan **por separado**, sin vínculo entre sí. El conteo no puede atribuirse a ningún nombre. |
| **Solo propietarios al día** | Un propietario con saldo pendiente ve el motivo y **no puede votar**. Si se pone al día mientras la elección sigue abierta, se habilita. |
| **Resultados solo al cerrar** | Antes del cierre **nadie** —ni la administración— ve el conteo. Esto evita influir en los votos pendientes. |

Además: **un voto por propietario** (no se admite el doble voto), las **planchas se bloquean** al abrir la votación, y la elección deja registro de **quién participó** (no de su elección), útil para verificar el quórum.

## Qué quedó implementado

Construido y probado de extremo a extremo. Funciona hoy, sin equipo adicional.

| Componente | Qué hace | Estado |
| --- | --- | --- |
| Gestión de la elección | Crear la elección, período y descripción; abrir y cerrar | Listo |
| Planchas | Alta de planchas con número, nombre, lema e integrantes | Listo |
| Voto del propietario | Tarjeta de votación en "Mi cuenta" con confirmación | Listo |
| Voto secreto | Boletas anónimas separadas del padrón | Listo |
| Un voto por propietario | El mismo propietario no vota dos veces | Listo |
| Solo solventes | Bloquea el voto de quien tiene saldo pendiente (configurable) | Listo |
| Resultados al cerrar | Conteo, porcentaje, participación y ganadora | Listo |
| Padrón de participación | Lista de quién votó (no por quién), para el quórum | Listo |

Se probó: creación de la elección y las planchas; apertura de la votación; voto de un propietario al día; rechazo del **doble voto**; rechazo del voto de un **deudor**; imposibilidad de ver resultados antes del cierre; y publicación de resultados al cerrar.

## Qué necesitamos de la Directiva

1. **Aprobar el uso de la votación electrónica** para la elección 2026-2028.
2. **Definir la ventana de votación:** fecha y hora de apertura y de cierre (puede incluir días previos a la asamblea y el día de la asamblea).
3. **Confirmar el requisito de solvencia:** mantener "solo propietarios al día" (recomendado) o permitir a todos.
4. **Aportar las planchas:** número, nombre, lema e integrantes con sus cargos.
5. **Validar el padrón:** confirmar la lista de propietarios habilitados.

## Respaldo reglamentario

Si los estatutos o el reglamento de la asociación exigen **quórum de presencia física**, **acta notarial** u otra formalidad para validar la elección, conviene **respaldar el voto electrónico a distancia con una resolución de asamblea** que lo autorice expresamente, al igual que se hace con otras resoluciones del proyecto. El sistema deja constancia de la participación, lo que facilita verificar el quórum.

**Propuesta de resolución (borrador):**

> La Asamblea de Propietarios del Centro de Retiro Lomas Lindas autoriza el uso del **sistema de votación electrónica** del ERP para la elección de la Directiva del período 2026-2028. El voto será **secreto**, de **un voto por propiedad al día** con las cuotas de mantenimiento, y los **resultados se publicarán al cerrar** la votación. La ventana de votación estará abierta desde el **[fecha/hora de apertura]** hasta el **[fecha/hora de cierre]**, y los propietarios podrán emitir su voto **a distancia desde la aplicación**, hayan asistido o no a la asamblea eleccionaria. El registro de participación del sistema servirá como constancia del quórum.

Con la aprobación y las fechas definidas, la administración deja la elección lista y los propietarios podrán votar desde su app.
