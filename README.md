# ERP · Centro de Retiro Lomas Lindas

Sistema de gestión administrativa y de control de seguridad para el Centro de
Retiro Lomas Lindas. Permite gestionar el control de accesos y visitas, el
personal, y las finanzas del centro desde una sola plataforma web.

## Módulos

### 🛡️ Seguridad y control de accesos
- **Registro de visitas**: control de entrada/salida de visitantes con flujo de
  autorización (pendiente → autorizada → dentro → finalizada / rechazada) y
  sellos de tiempo automáticos de entrada y salida.
- **Propietarios**: registro de propietarios y sus propiedades (lote/casa/unidad).
- **Visitantes**: familiares, invitados y proveedores asociados a cada
  propietario, con documento, vehículo y datos de contacto.
- **Incidentes**: bitácora de novedades y eventos de seguridad con tipo,
  gravedad y estado.
- **Rondas de vigilancia**: registro de recorridos y puntos de control del
  personal de seguridad.

- **Credenciales con QR**: cada visitante tiene una credencial imprimible con
  código QR; el guardia puede escanearla con la cámara para registrar la visita.
- **Notificaciones al propietario**: aviso automático (email) cuando se registra
  o ingresa una visita, con bandeja de salida y reintentos.

### 💼 Administración y finanzas
- **Facturas y cuotas**: cuotas de mantenimiento y cobros a propietarios, con
  registro de pagos (totales o parciales) y actualización automática del estado.
- **Gastos**: egresos operativos del centro por categoría.
- **Reportes**: financiero, estado de cuenta, visitas e incidentes, con
  exportación a **Excel** y **PDF**.
- **Panel principal**: indicadores de seguridad, finanzas y actividad reciente.

### 👥 Personal
- **Empleados**: personal del centro por departamento (seguridad,
  administración, mantenimiento, etc.).
- **Turnos**: programación de turnos del personal, en especial de seguridad.

### 🔐 Sistema
- **Usuarios y roles**: `admin`, `seguridad` y `administracion`, con menús y
  permisos diferenciados.

## Arquitectura

```
Centro-de-Retiro-Lomas-Lindas/
├── server/   → API REST en Node.js (Express) + base de datos SQLite
└── client/   → Interfaz web en React (Vite)
```

- **Backend**: Express, autenticación con JWT, contraseñas con bcrypt.
  La base de datos funciona con **SQLite** (por defecto, sin configuración) o
  **PostgreSQL** (recomendado para producción); se elige por variables de entorno.
- **Frontend**: React + React Router, consumo de la API vía `fetch`.
  Es una **PWA** instalable en el teléfono, con soporte offline del shell.

## Requisitos

- Node.js 18 o superior (probado con Node 22).

## Puesta en marcha

### 1. Backend (API)

```bash
cd server
npm install
cp .env.example .env      # ajusta el secreto JWT en producción
npm run seed              # crea la base de datos y usuarios de ejemplo
npm start                 # inicia la API en http://localhost:4000
```

### 2. Frontend (interfaz web)

En otra terminal:

```bash
cd client
npm install
npm run dev               # inicia la interfaz en http://localhost:5173
```

Abre `http://localhost:5173` en el navegador. Las llamadas a `/api` se
redirigen automáticamente al backend en el puerto 4000.

## Despliegue con Docker (PostgreSQL)

La forma recomendada para producción. Incluye base de datos PostgreSQL, API y
frontend servido por nginx.

```bash
cp .env.docker.example .env     # ajusta contraseñas y el secreto JWT
docker compose up -d --build
docker compose exec server npm run seed   # solo la primera vez
```

Abre `http://localhost:8080`. El frontend (nginx) sirve la PWA y redirige
`/api` al backend; el backend crea el esquema automáticamente en PostgreSQL.

### Usar PostgreSQL sin Docker

```bash
createdb lomaslindas
cd server
export DATABASE_URL=postgres://usuario:clave@localhost:5432/lomaslindas
npm run seed && npm start
```

## Usuarios de ejemplo (tras `npm run seed`)

| Rol            | Correo                        | Contraseña      |
|----------------|-------------------------------|-----------------|
| Administrador  | admin@lomaslindas.com         | admin123        |
| Seguridad      | seguridad@lomaslindas.com     | seguridad123    |
| Administración | oficina@lomaslindas.com       | oficina123      |

> ⚠️ **Cambia estas contraseñas y el secreto JWT antes de usar el sistema en
> producción.**

## Roles y permisos

| Módulo                | admin | seguridad | administracion |
|-----------------------|:-----:|:---------:|:--------------:|
| Panel principal       | ✅    | ✅        | ✅             |
| Registro de visitas   | ✅    | ✅        | —              |
| Propietarios          | ✅    | ✅        | ✅             |
| Visitantes            | ✅    | ✅        | ✅             |
| Incidentes / Rondas   | ✅    | ✅        | —              |
| Facturas / Gastos     | ✅    | —         | ✅             |
| Empleados             | ✅    | —         | ✅             |
| Turnos                | ✅    | ✅        | ✅             |
| Usuarios del sistema  | ✅    | —         | —              |

El rol `admin` tiene acceso completo a todos los módulos.

## API (resumen)

Todas las rutas (excepto `POST /api/auth/login`) requieren el encabezado
`Authorization: Bearer <token>`.

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| POST   | `/api/auth/login`             | Iniciar sesión                       |
| GET    | `/api/dashboard`              | Indicadores del panel                |
| CRUD   | `/api/propietarios`           | Propietarios                         |
| CRUD   | `/api/visitantes`             | Visitantes                           |
| GET    | `/api/visitantes/codigo/:codigo` | Buscar visitante por su QR        |
| GET/POST | `/api/visitas`              | Visitas                              |
| PATCH  | `/api/visitas/:id/estado`     | Cambiar estado de una visita         |
| CRUD   | `/api/incidentes`             | Incidentes de seguridad              |
| CRUD   | `/api/rondas`                 | Rondas de vigilancia                 |
| CRUD   | `/api/facturas`               | Facturas / cuotas                    |
| POST   | `/api/facturas/:id/pagos`     | Registrar un pago                    |
| CRUD   | `/api/gastos`                 | Gastos                               |
| GET    | `/api/reportes/*`             | Reportes (financiero, visitas, etc.) |
| GET    | `/api/notificaciones`         | Bandeja de notificaciones            |
| POST   | `/api/notificaciones/:id/reenviar` | Reintentar envío                |
| CRUD   | `/api/empleados`              | Empleados                            |
| CRUD   | `/api/turnos`                 | Turnos                               |
| CRUD   | `/api/auth/usuarios`          | Usuarios (solo admin)                |
