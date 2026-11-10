# App móvil · Lomas Lindas (React Native / Expo)

Aplicación móvil nativa para el personal de seguridad del Centro de Retiro
Lomas Lindas. Reutiliza la misma API del backend (`../server`).

## Funcionalidades

- **Inicio de sesión** con los mismos usuarios/roles del ERP.
- **Panel** con indicadores de seguridad y visitas recientes.
- **Registro de visitas**: lista con filtros por estado y acciones de acceso
  (autorizar, registrar entrada/salida, rechazar).
- **Escáner QR con la cámara**: lee la credencial del visitante y precarga el
  registro de la visita (ideal para el portón).
- **Incidentes**: reportar y consultar la bitácora de seguridad.
- **Rondas de vigilancia**: registrar puntos de control.

## Requisitos

- Node.js 18+ y la app **Expo Go** en tu teléfono (Android/iOS), o un emulador.
- El **backend** (`../server`) corriendo y accesible desde el teléfono.

## Configuración

Edita `src/config.js` y pon la URL del backend:

```js
// Para el teléfono físico usa la IP de tu PC en la red local, NO localhost:
export const API_URL = 'http://192.168.1.50:4000';
```

> `localhost` dentro del teléfono apunta al teléfono, no a tu computadora.
> Usa la IP de tu PC (p. ej. `ipconfig` / `ifconfig`) o la URL pública en
> producción (`https://...`).

## Ejecutar en desarrollo

```bash
cd mobile
npm install
npm start        # abre Expo; escanea el QR con Expo Go
```

También: `npm run android` o `npm run ios` (requiere emulador o, para iOS, macOS).

## Generar instalables (APK / IPA)

Con [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas build --platform android   # genera APK/AAB
eas build --platform ios       # requiere cuenta de Apple Developer
```

## Notas

- La app consume la API REST del backend; no accede directamente a la base de datos.
- El escaneo de QR usa `expo-camera`; en el primer uso pedirá permiso de cámara.
