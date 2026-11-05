# Costos para publicar el ERP Lomas Lindas en la web

_Centro de Retiro Lomas Lindas · 19 de octubre de 2026_

Para poner el ERP en línea y usarlo desde la web hay que contratar un dominio, alojamiento del backend, base de datos, alojamiento del frontend y envío de correos. Un presupuesto recomendado ronda US$29/mes (~RD$1,740) más el dominio anual; hay una opción económica desde ~US$15/mes y una holgada de ~US$130/mes. Los precios son aproximados y deben confirmarse al contratar (tasa usada: ~RD$60 por US$1).

## Qué necesitas contratar (imprescindible)

Estos son los servicios mínimos para que la aplicación quede pública y se use desde cualquier navegador. Varios tienen plan gratuito suficiente para arrancar.

| Servicio | Para qué sirve | Opción recomendada | Costo mensual (US$) | Costo anual (US$) |
| --- | --- | --- | --- | --- |
| Dominio web | La dirección del sistema (ej. lomaslindas.com / .com.do) | Registrador (Namecheap, Cloudflare) o local para .com.do | — | US$12 (.com) a US$55 (.com.do) |
| Alojamiento del backend (API) | Correr el servidor Node/Express | Render (Starter) o un VPS pequeño | US$7–12 | US$84–144 |
| Base de datos PostgreSQL | Guardar todos los datos con respaldo | Neon/Supabase (gratis al inicio) o Render | US$0–19 | US$0–228 |
| Alojamiento del frontend (PWA) | Servir la app web a los usuarios | Vercel / Netlify / Cloudflare Pages (plan gratis) | US$0 | US$0 |
| Almacenamiento de archivos | Fotos, PDF de normas y credenciales | Cloudflare R2 o Backblaze B2 | US$0–5 | US$0–60 |
| Certificado SSL (HTTPS) | El candado de seguridad del sitio | Incluido (Let's Encrypt) | US$0 | US$0 |
| Envío de correos | Avisos y notificaciones a la Directiva | Brevo (gratis 300/día) o Amazon SES | US$0–15 | US$0–180 |
| Respaldo de la base de datos | Continuidad ante fallos | Incluido en la base administrada | US$0–2 | US$0–24 |

El frontend y el SSL son gratuitos en la práctica. El dominio es el único pago estrictamente anual; el resto se cobra por mes.

## Servicios opcionales y a futuro

No son necesarios para salir al aire, pero conviene tenerlos presupuestados.

| Servicio | Para qué sirve | Opción | Costo aproximado |
| --- | --- | --- | --- |
| Notificaciones por WhatsApp/SMS | Avisar a propietarios y vigilancia | Twilio | SMS ~US$0.13 c/u; WhatsApp útil más barato; ~US$5–20/mes según volumen |
| Monitoreo de errores y disponibilidad | Saber si el sistema falla o se cae | Sentry + UptimeRobot (planes gratis) | US$0 (gratis) a US$26/mes |
| Correo corporativo | Cuentas @lomaslindas (ej. admin@) | Zoho Mail o Google Workspace | US$0–6 por usuario/mes |
| App móvil en las tiendas | Publicar la app en iPhone/Android | Apple Developer / Google Play | Apple US$99/año; Google US$25 (pago único) |
| GPS Systrack+ | Ubicación de los vehículos | Ya contratado por la asociación | Sin costo adicional del ERP |

El ERP ya se integra con Systrack+, así que ese servicio no genera un gasto nuevo.

## Escenarios de presupuesto

Tres niveles según cuánto quieras simplificar el mantenimiento y qué canales uses. Montos mensuales en US$; el total anual incluye el dominio.

| Concepto | Económico | Recomendado | Holgado |
| --- | --- | --- | --- |
| Dominio (prorrateado) | US$1 | US$1 | US$5 (.com.do) |
| Backend (API) | US$12 (VPS todo-en-uno) | US$7 (Render Starter) | US$25 (Render Standard) |
| Base de datos | incluida en el VPS | US$19 (o gratis al inicio) | US$19 |
| Frontend (PWA) | US$0 | US$0 | US$20 (plan Pro) |
| Archivos subidos | incluido en el VPS | US$2 | US$5 |
| Correo | US$0 (Brevo) | US$0–1 | US$15 (Mailgun) |
| WhatsApp/SMS | — | — | US$15 |
| Monitoreo | gratis | gratis | US$26 |
| Respaldo | US$2 | incluido | incluido |
| **Total mensual** | **~US$15** | **~US$29** | **~US$130** |
| **Total mensual (RD$)** | **~RD$900** | **~RD$1,740** | **~RD$7,800** |
| **Total anual (US$)** | **~US$180** | **~US$350** | **~US$1,560** |
| **Total anual (RD$)** | **~RD$10,800** | **~RD$21,000** | **~RD$93,600** |

El **económico** junta todo en un solo servidor (VPS): es lo más barato pero exige más mantenimiento técnico. El **recomendado** usa servicios administrados (menos trabajo, respaldos automáticos). El **holgado** añade WhatsApp/SMS, más capacidad y las apps en tiendas (Apple US$99/año + Google US$25 único, aparte).

## Recomendación

Empezar con el escenario **recomendado**, pero aprovechando los planes gratuitos para arrancar casi sin costo y escalar cuando crezcan los datos y los usuarios.

1. Registrar el dominio (decidir entre `.com`, más barato, o `.com.do`, de identidad local dominicana).
2. Publicar el frontend (PWA) en Vercel o Cloudflare Pages — gratis.
3. Levantar el backend en Render (plan Starter, US$7/mes) para que no se "duerma".
4. Usar una base de datos gratuita al inicio (Neon o Supabase) y pasar a un plan pago (~US$19/mes) cuando el volumen lo pida.
5. Correos con Brevo (gratis hasta 300/día), suficiente para los avisos de la Directiva.
6. Guardar fotos y PDF en Cloudflare R2 (~US$1–2/mes).

Así el arranque puede quedar en **~US$8–10/mes (~RD$500–600)** e ir creciendo solo cuando haga falta. No incluye el tiempo de configuración inicial (puesta en marcha), que podemos hacer nosotros mismos.

## Supuestos, notas y dónde verificar los precios

- **Montos aproximados** (de conocimiento general, a octubre de 2026). Confirmar en cada proveedor antes de contratar; los planes cambian.
- **Tasa de cambio** usada: ~RD$60 por US$1. Ajustar al valor del día.
- **No incluye** el tiempo de configuración inicial ni el mantenimiento técnico recurrente.
- **Respaldos y protección de datos**: con el sistema público conviene activar respaldos automáticos de la base de datos y cuidar los datos personales de propietarios y empleados.
- **Systrack+** ya está contratado por la asociación; el ERP solo se conecta a él.

Páginas oficiales para confirmar precios: [Render](https://render.com/pricing) · [Vercel](https://vercel.com/pricing) · [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) · [Brevo](https://www.brevo.com/pricing/) · [Mailgun](https://www.mailgun.com/pricing/) · [Twilio SMS (RD)](https://www.twilio.com/sms/pricing/do) · [Apple Developer](https://developer.apple.com/programs/) · [Google Play](https://play.google.com/console/signup).
