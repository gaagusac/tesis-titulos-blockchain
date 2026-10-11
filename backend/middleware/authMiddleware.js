const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_tesis_blockchain_usac_2026';

/**
 * Middleware para validar el JSON Web Token (JWT) en rutas privadas
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token de autenticación no proporcionado.'
    });
  }

  // Formato esperado: "Bearer <token>"
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Utilice el esquema: Bearer <token>'
    });
  }

  const token = partes[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.warn('[AuthMiddleware] Error validando token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'La sesión ha expirado. Por favor inicie sesión nuevamente.'
      });
    }
    return res.status(403).json({
      error: 'Token inválido o corrupto. Acceso denegado.'
    });
  }
}

module.exports = authMiddleware;
