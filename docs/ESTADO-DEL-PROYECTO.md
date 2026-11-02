# Estado del proyecto — ERP Centro de Retiro Lomas Lindas

_Resumen vivo para dar continuidad entre sesiones. Se actualiza a medida que avanza el proyecto._

## En producción

- **Servidor:** VPS Contabo (Cloud VPS 6 · 6 vCPU · 12 GB RAM · 200 GB SSD · EE. UU. Este · Ubuntu 24.04).
- **Acceso al sistema:** `http://13.140.236.51:8080` (por IP; aún sin dominio/HTTPS).
- **Base de datos:** PostgreSQL en Docker (volumen `db_data`). Respaldos: Auto Backup de Contabo.
- **Despliegue:** automático. Un `git push` a la rama `ccr-ad5a08cf-4fdooo` → el servidor
  se actualiza solo cada ~3 min vía `deploy/autodeploy.sh` (cron). Ver `deploy/README.md`.
- **Correo saliente (SMTP):** Brevo (relay). Remitente verificado: `carlosrobles2260@gmail.com`.
  Las credenciales reales están en el archivo `.env` del servidor (no en el repositorio).

## Módulos construidos

- Seguridad y accesos: visitas, propietarios, visitantes, incidentes, rondas.
- **Acceso por QR dinámico** con antipassback (pase del propietario/empleado; credencial del invitado).
- **Propietario autoriza invitados** desde "Mi cuenta" (genera credencial QR y la comparte).
- Administración y finanzas: cuotas por tipo de propiedad, cuentas por cobrar (sin condonar),
  gastos, panel financiero, reportes a Excel/PDF.
- RR. HH. y nómina (AFP, SFS, ISR, TSS), préstamos, activos y depreciación.
- GPS de la flota con geocercas (proveedor Systrack+).
- **Elección de la Directiva:** votación secreta, solo propietarios al día, resultados al cerrar.
- **Recuperación de contraseña** por correo (enlace que caduca en 1 h).
- **Capacitación incrustada en el ERP** (cursos por rol): Administrativas/Directiva, Seguridad,
  Propietarios. Autodidactas, con autoevaluación. Archivos en `client/public/capacitacion*.html`.
- UI: formularios en panel lateral (drawer) y tipografía ampliada (propietarios adultos mayores).

## Cuentas (dónde están las contraseñas, no el valor)

- Usuarios de ejemplo del seed: `admin@lomaslindas.com`, `seguridad@lomaslindas.com`,
  `oficina@lomaslindas.com`. **Pendiente: cambiarlas por contraseñas reales.**
- Cuentas de práctica de la Directiva (por función): `presidencia@…`, `vicepresidencia@…`,
  `secretaria@…`, `tesoreria@…`, `vocal1/2/3@lomaslindas.com`. Se crean con
  `docker compose exec server node src/seed-directiva.js`. Contraseña temporal común.

## Pendientes

1. **Seguridad:** cambiar las contraseñas de ejemplo; volver **privado** el repositorio en GitHub.
2. **Dominio + HTTPS:** cuando haya dominio, activar el candado con Caddy (ver `docs/despliegue-contabo.md`).
   Mejora además la entrega de correos.
3. **Rotar la clave SMTP** de Brevo (apareció una vez en un chat de soporte).

## Decisiones tomadas

- Voto de la Directiva: **secreto**, **solo solventes**, **resultados al cerrar**.
- En Cuentas por cobrar **no se condona ni se descuenta** deuda.
- Idioma del proyecto: **español** (código, commits y comunicación).
- Moneda: **pesos dominicanos (DOP / RD$)**.
