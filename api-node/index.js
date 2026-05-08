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

// Ruta de salud / health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'api-node',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    entorno: process.env.NODE_ENV || 'development',
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[API-Node] Servidor corriendo en puerto ${PORT}`);
});
