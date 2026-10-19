import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requiereAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import empleadosRoutes from './routes/empleados.js';
import turnosRoutes from './routes/turnos.js';
import propietariosRoutes from './routes/propietarios.js';
import visitantesRoutes from './routes/visitantes.js';
import visitasRoutes from './routes/visitas.js';
import incidentesRoutes from './routes/incidentes.js';
import rondasRoutes from './routes/rondas.js';
import facturasRoutes from './routes/facturas.js';
import gastosRoutes from './routes/gastos.js';
import dashboardRoutes from './routes/dashboard.js';
import reportesRoutes from './routes/reportes.js';
import notificacionesRoutes from './routes/notificaciones.js';
import tiposIncidenciaRoutes from './routes/tiposIncidencia.js';
import configuracionRoutes from './routes/configuracion.js';
import viajesVertederoRoutes from './routes/viajesVertedero.js';
import vehiculosRoutes from './routes/vehiculos.js';
import geocercasRoutes from './routes/geocercas.js';
import gpsRoutes from './routes/gps.js';
import miCuentaRoutes from './routes/miCuenta.js';
import empleadosPropietarioRoutes from './routes/empleadosPropietario.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '10mb' })); // permite fotos de evidencia en base64

// Archivos subidos (fotos de incidentes).
import { UPLOADS_DIR } from './fotos.js';
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'ERP Lomas Lindas' }));

// Página pública de la credencial del visitante (para compartir por enlace/WhatsApp).
app.get('/credencial/:codigo', async (req, res) => {
  try {
    const { default: db } = await import('./db.js');
    const { generarQrDataUrl, paginaCredencialHTML } = await import('./credencial.js');
    let v = await db.get(
      `SELECT v.*, p.nombre AS propietario_nombre FROM visitantes v
       LEFT JOIN propietarios p ON p.id = v.propietario_id WHERE v.codigo = ?`,
      [req.params.codigo]
    );
    // Si no es un visitante, puede ser un empleado del propietario.
    if (!v) {
      const e = await db.get(
        `SELECT e.*, p.nombre AS propietario_nombre FROM empleados_propietario e
         LEFT JOIN propietarios p ON p.id = e.propietario_id WHERE e.codigo = ?`,
        [req.params.codigo]
      );
      if (e) v = { ...e, tipo: e.puesto || 'empleado' };
    }
    if (!v) return res.status(404).send('<h1>Credencial no encontrada</h1>');
    const qr = await generarQrDataUrl(v.codigo);
    res.type('html').send(paginaCredencialHTML(v, qr));
  } catch (e) {
    res.status(500).send('Error al generar la credencial');
  }
});

// Página pública del estado de cuenta del propietario (enlace privado por token).
app.get('/cuenta/:token', async (req, res) => {
  try {
    const { default: db } = await import('./db.js');
    const { datosCuenta, paginaCuentaHTML } = await import('./cuenta.js');
    const p = await db.get('SELECT * FROM propietarios WHERE token_cuenta = ?', [req.params.token]);
    if (!p) return res.status(404).send('<h1>Estado de cuenta no encontrado</h1>');
    const datos = await datosCuenta(p.id);
    res.type('html').send(paginaCuentaHTML(p, datos));
  } catch (e) {
    res.status(500).send('Error al generar el estado de cuenta');
  }
});

// Autenticación (login es público; el resto protegido dentro del router)
app.use('/api/auth', authRoutes);

// Todas las rutas siguientes requieren sesión iniciada.
app.use('/api/dashboard', requiereAuth, dashboardRoutes);
app.use('/api/empleados', requiereAuth, empleadosRoutes);
app.use('/api/turnos', requiereAuth, turnosRoutes);
app.use('/api/propietarios', requiereAuth, propietariosRoutes);
app.use('/api/empleados-propietario', requiereAuth, empleadosPropietarioRoutes);
app.use('/api/mi-cuenta', requiereAuth, miCuentaRoutes);
app.use('/api/visitantes', requiereAuth, visitantesRoutes);
app.use('/api/visitas', requiereAuth, visitasRoutes);
app.use('/api/incidentes', requiereAuth, incidentesRoutes);
app.use('/api/tipos-incidencia', requiereAuth, tiposIncidenciaRoutes);
app.use('/api/configuracion', requiereAuth, configuracionRoutes);
app.use('/api/viajes-vertedero', requiereAuth, viajesVertederoRoutes);
app.use('/api/vehiculos', requiereAuth, vehiculosRoutes);
app.use('/api/geocercas', requiereAuth, geocercasRoutes);
// GPS: la ingesta es pública (autenticada por token); el router gestiona su propia auth.
app.use('/api/gps', gpsRoutes);
app.use('/api/rondas', requiereAuth, rondasRoutes);
app.use('/api/facturas', requiereAuth, facturasRoutes);
app.use('/api/gastos', requiereAuth, gastosRoutes);
app.use('/api/reportes', requiereAuth, reportesRoutes);
app.use('/api/notificaciones', requiereAuth, notificacionesRoutes);

// Manejo de errores no capturados.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ API del ERP Lomas Lindas escuchando en http://localhost:${PORT}`);
  // Inicia la sincronización periódica con el proveedor de GPS (si está activada).
  import('./gpsSync.js')
    .then((m) => m.iniciarSincronizacionAutomatica())
    .catch((e) => console.warn('No se pudo iniciar la sincronización de GPS:', e.message));
});
