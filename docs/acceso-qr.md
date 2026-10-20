# Acceso por QR al proyecto — factibilidad e implementación

_Centro de Retiro Lomas Lindas · 20 de octubre de 2026_

Sí se puede integrar el acceso al proyecto presentando un código QR desde la app, con control de reingreso y a prueba de capturas de pantalla. La parte de software ya está construida y probada (Fase 1); lo único pendiente es conectar la señal física a la barrera del portón (Fase 2), que depende del equipo que tenga instalado.

## Cómo funciona

El acceso por QR se compone de cuatro piezas que trabajan juntas.

1. **QR dinámico (anti-copia).** El propietario ve su pase en la app y el invitado en su credencial. No es un código fijo: es un pase firmado que **se renueva solo cada ~45 segundos**. Una captura de pantalla caduca en segundos y no sirve para entrar.
2. **Un solo uso.** Cada pase se acepta una sola vez; si se vuelve a presentar el mismo, se rechaza.
3. **Antipassback (no reingreso).** El sistema sabe si la persona está **dentro o fuera**. Si ya está dentro, su código **no la deja entrar otra vez** sin registrar primero la salida. Aplica igual a propietarios, invitados y empleados del propietario.
4. **Señal a la barrera.** Cuando el acceso es válido, el sistema envía la orden de **abrir** a un relé/controlador del portón (configurable). El registro de entrada/salida y el aviso al propietario quedan guardados.

En resumen: el propietario presenta su QR en el portón, el sistema valida que sea un pase vivo, de un solo uso, de alguien que está fuera, y abre; una copia de pantalla o un intento de reingreso quedan bloqueados.

## Qué quedó implementado (Fase 1)

Ya está construido y probado de extremo a extremo. Funciona hoy, sin hardware nuevo: registra la entrada/salida con todos los controles; lo único que aún no hace es mover físicamente la barrera (eso es la Fase 2).

| Componente | Qué hace | Estado |
| --- | --- | --- |
| Pase QR del propietario | QR dinámico en "Mi cuenta" que se renueva solo | Listo |
| Credencial del invitado/empleado | Su QR también es dinámico (se renueva solo) | Listo |
| Validación en el portón | El escáner del móvil valida el pase y registra el acceso | Listo |
| Un solo uso | El mismo pase no se acepta dos veces | Listo |
| Antipassback | Bloquea el reingreso si la persona ya está dentro | Listo |
| Registro y bitácora | Entrada/salida con hora, por persona | Listo |
| Señal a la barrera | Envía la orden de abrir a una URL de relé (configurable) | Listo (falta el equipo) |
| Tiempo de vida del pase | Configurable (por defecto 45 s) | Listo |

Se probó: el propietario genera su pase; el guardia lo registra como **entrada** y se dispara la señal de apertura; reintentar el mismo pase se rechaza; estando dentro, un nuevo pase se registra como **salida** (nunca dos entradas seguidas); un pase alterado o vencido se rechaza.

## Qué falta para abrir la barrera (Fase 2)

El sistema ya envía la orden de apertura a una **URL de relé** configurable; solo falta el dispositivo que reciba esa orden y mueva la barrera. Es la única pieza física.

- **Un relé/controlador conectado** en la caseta del portón, con internet o wifi, que al recibir la señal active la apertura. Equipos comunes y económicos (tipo Shelly u otro relé Wi-Fi) sirven; su costo ronda US$15–40 por única vez.
- **Compatibilidad con la barrera actual.** La mayoría de las talanquidas/barreras aceptan un **contacto seco** (un pulso de relé) para abrir. Si la barrera ya trae API de red, se usa esa directamente.
- **Configurar la URL** del relé en el sistema (una sola vez) y probar la apertura.

Opcional, más adelante (Fase 3): un **lector fijo** en el portón para autoservicio sin guardia, y **dos lectores** (entrada y salida) para un control de dirección aún más estricto.

## Seguridad: qué protege y qué no

**Protege contra:**

- **Copia de pantalla.** El QR se renueva cada pocos segundos; una captura caduca y no abre.
- **Reuso del mismo pase.** Cada pase vale una sola vez.
- **Reingreso.** Si la persona ya está dentro, su código no la deja entrar de nuevo sin registrar la salida.
- **Pases falsos o alterados.** El pase va firmado; si se modifica, se rechaza.

**Lo que conviene tener presente:**

- Si alguien comparte el **enlace** de su credencial (no una foto), el que lo reciba podría abrir la página y generar pases. Esto se mitiga con el antipassback (no dos entradas) y, si se requiere, se puede reforzar pidiendo la sesión del propietario o un PIN. Por eso la credencial del propietario vive dentro de su cuenta (requiere su contraseña), no en un enlace público.
- El escáner del portón lo opera el guardia con su sesión; el visitante no valida solo.

## Qué necesitamos de la Directiva

Para conectar la apertura física de la barrera (Fase 2):

1. **Marca y modelo de la barrera/talanquera** del portón, y si acepta contacto seco (relé) o tiene API de red.
2. **Internet o wifi en la caseta** del portón (ya lo requiere el escáner).
3. Decidir el modelo de operación: **asistido** (el guardia escanea y el sistema abre) o **autoservicio** (un lector fijo lee el QR del propietario y abre, sin guardia).

Con esos datos adquirimos el relé adecuado, lo configuramos y dejamos la barrera abriendo con el QR. Mientras tanto, la Fase 1 ya puede usarse para registrar y controlar los accesos.
