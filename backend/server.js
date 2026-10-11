require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Inicializar y verificar conexión a la base de datos SQLite
require('./database/db');

const authRoutes = require('./routes/authRoutes');
const titulosRoutes = require('./routes/titulosRoutes');
const verificarRoutes = require('./routes/verificarRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de middlewares globales
app.use(cors({
  origin: '*', // Permitir peticiones desde el frontend (e.g. Vite en http://localhost:5173 o 3000)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Ruta de comprobación de salud del servicio (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    servicio: 'API Backend - Emisión y Registro de Títulos Académicos',
    tiempo: new Date().toISOString()
  });
});

// Montaje de rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/titulos', titulosRoutes);
app.use('/api/verificar', verificarRoutes);

// Manejador para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Error No Controlado]:', err);
  res.status(500).json({
    error: 'Ocurrió un error inesperado en el servidor.'
  });
});

// Iniciar servidor solo si se ejecuta directamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('========================================================');
    console.log(` Servidor Backend ejecutándose en: http://localhost:${PORT}`);
    console.log(` Endpoint Login:  http://localhost:${PORT}/api/auth/login`);
    console.log(` Endpoint Títulos: http://localhost:${PORT}/api/titulos`);
    console.log(` Base de datos:   SQLite inicializada correctamente`);
    console.log('========================================================');
  });
}

module.exports = app;
