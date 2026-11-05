# Recursos para implementar el ERP Lomas Lindas

_Centro de Retiro Lomas Lindas · 19 de octubre de 2026_

Para poner la aplicación a disposición de la asociación y sus propietarios hacen falta cuatro cosas: contratar los servicios en línea (servidor, base de datos, dominio y correo), disponer de unos pocos equipos (una computadora en la oficina y un teléfono o tablet con cámara en el portón), cargar los datos iniciales (propietarios, personal, cuotas y normas) y capacitar al personal. El sistema ya está construido y probado; los costos de los servicios se detallan en el documento de costos aparte.

## Servicios e infraestructura

Son los servicios en línea que hacen que la aplicación esté disponible desde internet. El detalle de precios y los escenarios de presupuesto están en el documento de costos aparte.

| Servicio | Para qué | Obligatorio |
| --- | --- | --- |
| Dominio web | La dirección del sistema (ej. lomaslindas.com) | Sí |
| Alojamiento del servidor (backend) | Correr la aplicación | Sí |
| Base de datos | Guardar todos los datos con respaldo | Sí |
| Alojamiento de la app web (frontend) | Servir la aplicación a los usuarios | Sí (plan gratuito alcanza) |
| Almacenamiento de archivos | Fotos, credenciales y PDF de normas/actas | Sí |
| Envío de correos | Avisos y credenciales a invitados y Directiva | Sí |
| Certificado de seguridad (HTTPS) | El candado del sitio | Sí (incluido, gratis) |
| GPS Systrack+ | Ubicación de los vehículos | Ya contratado por la asociación |

Como referencia, un presupuesto recomendado ronda US$29/mes más el dominio anual, con una opción económica desde ~US$15/mes (ver documento de costos).

## Equipos y dispositivos

Lo físico es mínimo; en buena medida ya existe.

- **Oficina de administración:** una computadora con navegador e internet para la gestión diaria (cuotas, pagos, nómina, reportes).
- **Portón / caseta de seguridad:** un teléfono o tablet con cámara y conexión a internet para escanear el código QR de las credenciales. La aplicación se instala como app en ese dispositivo.
- **Internet:** conexión estable en la oficina y en el portón (datos móviles o wifi).
- **Vehículos:** los equipos GPS ya están instalados y conectados con Systrack+; no hace falta comprar nada nuevo.
- **Opcional:** una impresora en la oficina para los recibos o volantes de pago, y un respaldo de energía (UPS) para el equipo del portón.

No se necesitan servidores propios ni equipos especiales: todo corre en la nube y en dispositivos comunes.

## Datos iniciales a cargar

Para que el sistema sea útil desde el primer día hay que ingresar la información real del centro. La mayoría la provee la administración; las normas y resoluciones las provee la Directiva.

| Dato | Qué incluye | Lo provee |
| --- | --- | --- |
| Propietarios | Nombre, carné, tipo de propiedad (solar o edificado), fotos del frente, contacto | Administración |
| Cuotas | Monto por tipo de propiedad y las cuotas pendientes actuales | Administración / Presidencia |
| Empleados | Ficha completa (datos, salario, fecha de ingreso) de seguridad y ornato | Administración |
| Empleados de propietarios | Personal doméstico con su credencial de acceso | Propietario / Administración |
| Vehículos y geocercas | Flota y las zonas (vertedero, puntos de control) | Administración |
| Activos | Inventario y valoración de los bienes de la asociación | Administración |
| Normas y documentos | Estatutos, reglamentos, normas, resoluciones de la Directiva y de las asambleas | Directiva |
| Usuarios del sistema | Cuentas y roles (administración, seguridad, presidencia, propietarios) | Administración |

Los documentos (estatutos, actas) se suben como PDF o se escribe su texto; el sistema ya trae un contenido base de ejemplo para ajustar.

## Personas y roles

Cada persona entra con su propio usuario y ve solo lo que le corresponde.

| Rol | Quién | Qué hace en el sistema |
| --- | --- | --- |
| Administración | Personal de oficina | Propietarios, cuotas y pagos, gastos, nómina, activos, normas y reportes |
| Seguridad | Guardias del portón | Registro de visitas, escaneo de credenciales, rondas e incidencias |
| Presidencia | Presidente/a de la Directiva | Consulta el panel financiero y la cobranza de la asociación |
| Propietario | Cada propietario | Ve su estado de cuenta, sus empleados y las normas del proyecto |

No hace falta personal técnico dedicado: la operación diaria la llevan la oficina y la seguridad.

## Puesta en marcha

Una vez contratados los servicios, el arranque sigue estos pasos:

1. Registrar el dominio y publicar el sistema en el servidor.
2. Configurar el correo (y, si se desea, WhatsApp) para el envío de credenciales y avisos.
3. Crear los usuarios y asignar los roles (administración, seguridad, presidencia).
4. Cargar los datos iniciales (propietarios, cuotas, empleados, vehículos, activos y normas).
5. Instalar la app en el teléfono o tablet del portón y probar el escaneo de credenciales.
6. Capacitar a la oficina y a la seguridad en el uso diario.
7. Dar acceso a los propietarios a su estado de cuenta y a las normas.
8. Activar los respaldos automáticos de la base de datos.

## Seguridad, respaldo y protección de datos

El sistema maneja datos personales de propietarios y empleados, por lo que conviene cuidarlos.

- **Respaldos automáticos** de la base de datos, para no perder información ante cualquier fallo.
- **Acceso por roles y contraseña**, de modo que cada quien vea solo lo que le corresponde.
- **Conexión cifrada (HTTPS)** en todo el sistema.
- **Cuidado de los datos personales**: usarlos solo para la gestión del centro y limitar quién puede verlos.
- **Continuidad**: al estar en la nube, el sistema sigue disponible aunque falle un equipo de la oficina.

Con esto, la asociación tiene una plataforma lista para operar, ordenada y segura, tanto para la administración como para los propietarios.
