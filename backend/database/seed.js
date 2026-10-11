require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('[Seed] Verificando y poblando datos iniciales...');

const defaultUser = process.env.DEFAULT_ADMIN_USER || 'admin';
const defaultPass = process.env.DEFAULT_ADMIN_PASS || 'admin123';
const defaultName = process.env.DEFAULT_ADMIN_NAME || 'Administrador General Facultad de Ingeniería';

const existingAdmin = db.prepare('SELECT * FROM administradores WHERE usuario = ?').get(defaultUser);

if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(defaultPass, 10);
  db.prepare(`
    INSERT INTO administradores (usuario, password, nombre, rol)
    VALUES (?, ?, ?, 'ADMIN')
  `).run(defaultUser, hashedPassword, defaultName);
  console.log(`[Seed] Usuario '${defaultUser}' creado exitosamente.`);
} else {
  console.log(`[Seed] El usuario administrador '${defaultUser}' ya existe.`);
}

console.log('[Seed] Proceso completado.');
