const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Directorio y ruta de la base de datos SQLite
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH 
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(dataDir, 'credenciales.db');

console.log(`[SQLite] Conectando a la base de datos en: ${dbPath}`);
const db = new DatabaseSync(dbPath);

// Habilitar claves foráneas
db.exec('PRAGMA foreign_keys = ON;');

// Inicialización del esquema
function inicializarBaseDeDatos() {
  // 1. Tabla de administradores para autenticación con JWT
  db.exec(`
    CREATE TABLE IF NOT EXISTS administradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Tabla para el catálogo de títulos académicos
  db.exec(`
    CREATE TABLE IF NOT EXISTS titulos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      cui TEXT NOT NULL,
      carrera TEXT NOT NULL,
      fecha TEXT NOT NULL,
      qr_imagen TEXT,
      titulo_archivo TEXT,
      titulo_archivo_nombre TEXT,
      titulo_archivo_tipo TEXT,
      pdf_hash TEXT,
      cid_ipfs TEXT,
      transaccion_hash TEXT,
      estado TEXT DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Tabla para el registro y auditoría de transacciones de verificación
  db.exec(`
    CREATE TABLE IF NOT EXISTS verificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      titulo_id TEXT,
      metodo TEXT NOT NULL,
      resultado TEXT NOT NULL,
      hash_cotejado TEXT,
      detalles TEXT,
      ip_origen TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (titulo_id) REFERENCES titulos(id)
    );
  `);

  // Asegurar compatibilidad y migración de columnas en bases de datos existentes
  const columnasRequeridasTitulos = [
    { nombre: 'qr_imagen', tipo: 'TEXT' },
    { nombre: 'titulo_archivo', tipo: 'TEXT' },
    { nombre: 'titulo_archivo_nombre', tipo: 'TEXT' },
    { nombre: 'titulo_archivo_tipo', tipo: 'TEXT' },
    { nombre: 'pdf_hash', tipo: 'TEXT' }
  ];

  for (const col of columnasRequeridasTitulos) {
    try {
      db.exec(`ALTER TABLE titulos ADD COLUMN ${col.nombre} ${col.tipo};`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }
  }

  // Poblar pdf_hash para registros existentes que no lo tengan
  try {
    const titulosSinHash = db.prepare("SELECT id, titulo_archivo FROM titulos WHERE pdf_hash IS NULL OR pdf_hash = ''").all();
    if (titulosSinHash && titulosSinHash.length > 0) {
      console.log(`[SQLite] Generando hash criptográfico para ${titulosSinHash.length} títulos existentes...`);
      for (const t of titulosSinHash) {
        if (t.titulo_archivo) {
          const raw = t.titulo_archivo.includes('base64,') ? t.titulo_archivo.split('base64,')[1] : t.titulo_archivo;
          const buf = Buffer.from(raw, 'base64');
          const hash = crypto.createHash('sha256').update(buf).digest('hex');
          db.prepare('UPDATE titulos SET pdf_hash = ? WHERE id = ?').run(hash, t.id);
        }
      }
    }
  } catch (err) {
    console.warn('[SQLite] Error migrando hashes:', err.message);
  }

  // Verificar si ya existe al menos un administrador, si no, crear el usuario por defecto
  const queryAdmin = db.prepare('SELECT COUNT(*) as count FROM administradores');
  const result = queryAdmin.get();

  if (result.count === 0) {
    const defaultUser = process.env.DEFAULT_ADMIN_USER || 'admin';
    const defaultPass = process.env.DEFAULT_ADMIN_PASS || 'admin123';
    const defaultName = process.env.DEFAULT_ADMIN_NAME || 'Administrador General Facultad de Ingeniería';
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(defaultPass, saltRounds);

    const insertAdmin = db.prepare(`
      INSERT INTO administradores (usuario, password, nombre, rol)
      VALUES (?, ?, ?, 'ADMIN')
    `);
    insertAdmin.run(defaultUser, hashedPassword, defaultName);

    console.log(`[SQLite] Administrador por defecto inicializado:`);
    console.log(`         Usuario: ${defaultUser}`);
    console.log(`         Contraseña: ${defaultPass}`);
  }
}

inicializarBaseDeDatos();

module.exports = db;
