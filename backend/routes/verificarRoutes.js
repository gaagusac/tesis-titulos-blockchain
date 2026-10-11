const express = require('express');
const router = express.Router();
const verificarController = require('../controllers/verificarController');

// 1. Verificación por subida de imagen de Código QR
router.post('/qr', verificarController.verificarPorQR);

// 2. Verificación por archivo PDF (Hash SHA-256)
router.post('/archivo', verificarController.verificarPorArchivo);

// 3. Verificación por CUI y Carrera
router.post('/cui-carrera', verificarController.verificarPorCuiCarrera);

// 4. Verificación por ID directo (al escanear QR con teléfono)
router.get('/id/:id', verificarController.verificarPorIdDirecto);

// 5. Historial público/auditoría de verificaciones
router.get('/historial', verificarController.consultarHistorialVerificaciones);

module.exports = router;
