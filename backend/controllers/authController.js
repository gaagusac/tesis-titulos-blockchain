const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_tesis_blockchain_usac_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Autenticación de Administrador (CU-03)
 * Endpoint: POST /api/auth/login
 */
function login(req, res) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        error: 'Debe ingresar el usuario y la contraseña.'
      });
    }

    const usuarioTrim = usuario.trim();

    // Consultar el administrador por nombre de usuario
    const stmt = db.prepare('SELECT id, usuario, password, nombre, rol FROM administradores WHERE usuario = ?');
    const admin = stmt.get(usuarioTrim);

    if (!admin) {
      console.warn(`[Auth] Intento de login fallido: Usuario '${usuarioTrim}' no encontrado.`);
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos'
      });
    }

    // Verificar contraseña encriptada con bcrypt
    const passwordValida = bcrypt.compareSync(password, admin.password);
    if (!passwordValida) {
      console.warn(`[Auth] Intento de login fallido: Contraseña errónea para usuario '${usuarioTrim}'.`);
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos'
      });
    }

    // Generar token JWT firmado
    const payload = {
      id: admin.id,
      usuario: admin.usuario,
      nombre: admin.nombre,
      rol: admin.rol
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    console.log(`[Auth] Sesión iniciada con éxito para administrador: ${admin.usuario}`);

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: payload
    });

  } catch (error) {
    console.error('[Auth Error] Error interno en inicio de sesión:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar la autenticación.'
    });
  }
}

/**
 * Verificación de token y datos de la sesión activa
 * Endpoint: GET /api/auth/verify
 */
function verifySession(req, res) {
  // El usuario ya fue validado e inyectado por el middleware
  return res.status(200).json({
    valid: true,
    user: req.user
  });
}

module.exports = {
  login,
  verifySession
};
