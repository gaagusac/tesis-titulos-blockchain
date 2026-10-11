const express = require('express');
const router = express.Router();
const titulosController = require('../controllers/titulosController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/titulos - Emitir nuevo título (Protegido con JWT)
router.post('/', authMiddleware, titulosController.emitirTitulo);

// GET /api/titulos - Consultar todos los títulos emitidos (Protegido con JWT)
router.get('/', authMiddleware, titulosController.consultarTitulos);

// GET /api/titulos/:id - Consultar título por ID (Público)
router.get('/:id', titulosController.consultarTituloPorId);

module.exports = router;
