const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validación crítica: JWT_SECRET debe estar definida en producción
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definida en el entorno. El servidor no puede iniciar de forma segura.');
  process.exit(1);
}

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes = require('./src/routes/auth.routes');
const inventarioRoutes = require('./src/routes/inventario.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const catalogosRoutes = require('./src/routes/catalogos.routes');
const auditoriaRoutes = require('./src/routes/auditoria.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/catalogos', catalogosRoutes);
app.use('/api/v1/auditoria', auditoriaRoutes);

// Ruta de salud / health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'api-node',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    entorno: process.env.NODE_ENV || 'development',
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[API-Node] Servidor corriendo en puerto ${PORT}`);
});
