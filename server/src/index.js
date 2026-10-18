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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'ERP Lomas Lindas' }));

// Autenticación (login es público; el resto protegido dentro del router)
app.use('/api/auth', authRoutes);

// Todas las rutas siguientes requieren sesión iniciada.
app.use('/api/dashboard', requiereAuth, dashboardRoutes);
app.use('/api/empleados', requiereAuth, empleadosRoutes);
app.use('/api/turnos', requiereAuth, turnosRoutes);
app.use('/api/propietarios', requiereAuth, propietariosRoutes);
app.use('/api/visitantes', requiereAuth, visitantesRoutes);
app.use('/api/visitas', requiereAuth, visitasRoutes);
app.use('/api/incidentes', requiereAuth, incidentesRoutes);
app.use('/api/rondas', requiereAuth, rondasRoutes);
app.use('/api/facturas', requiereAuth, facturasRoutes);
app.use('/api/gastos', requiereAuth, gastosRoutes);
app.use('/api/reportes', requiereAuth, reportesRoutes);

// Manejo de errores no capturados.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ API del ERP Lomas Lindas escuchando en http://localhost:${PORT}`);
});
