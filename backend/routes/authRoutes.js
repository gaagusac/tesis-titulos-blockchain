const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/login - Autenticar administrador y emitir JWT
router.post('/login', authController.login);

// GET /api/auth/verify - Verificar validez del token y obtener sesión actual
router.get('/verify', authMiddleware, authController.verifySession);

module.exports = router;
