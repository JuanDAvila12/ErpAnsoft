const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes = require('./src/routes/auth.routes');
const inventarioRoutes = require('./src/routes/inventario.routes');
const ventasRoutes = require('./src/routes/ventas.routes');
const catalogosRoutes = require('./src/routes/catalogos.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/catalogos', catalogosRoutes);

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
