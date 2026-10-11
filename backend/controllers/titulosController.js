const db = require('../database/db');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { generarCertificadoSVG } = require('../utils/certificateGenerator');

// Migración retroactiva: generar QR y archivo para cualquier registro existente sin QR
async function migrarRegistrosExistentes() {
  try {
    const sinQR = db.prepare("SELECT * FROM titulos WHERE qr_imagen IS NULL OR qr_imagen = ''").all();
    if (sinQR && sinQR.length > 0) {
      console.log(`[Titulos] Generando QR y certificados retroactivos para ${sinQR.length} registros existentes...`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      for (const t of sinQR) {
        const verifyUrl = `${frontendUrl}/verificar?id=${t.id}`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 450,
          margin: 2,
          color: { dark: '#07172b', light: '#ffffff' }
        });

        let docArchivo = t.titulo_archivo;
        let docNombre = t.titulo_archivo_nombre || `Titulo_${t.id}.svg`;
        let docTipo = t.titulo_archivo_tipo || 'image/svg+xml';

        if (!docArchivo) {
          docArchivo = generarCertificadoSVG({
            id: t.id,
            nombre: t.nombre,
            cui: t.cui,
            carrera: t.carrera,
            fecha: t.fecha,
            qrDataUrl
          });
        }

        db.prepare(`
          UPDATE titulos 
          SET qr_imagen = ?, titulo_archivo = ?, titulo_archivo_nombre = ?, titulo_archivo_tipo = ?
          WHERE id = ?
        `).run(qrDataUrl, docArchivo, docNombre, docTipo, t.id);
      }
      console.log('[Titulos] Migración retroactiva de QR y certificados completada.');
    }
  } catch (err) {
    console.warn('[Titulos] Error en migración de registros existentes:', err.message);
  }
}

migrarRegistrosExistentes();

/**
 * Emisión de un nuevo título académico (CU-01)
 * Genera imagen QR y almacena el título y QR en la base de datos SQLite
 * Endpoint: POST /api/titulos (Protegido con JWT)
 */
async function emitirTitulo(req, res) {
  try {
    const {
      id,
      nombre,
      cui,
      carrera,
      fecha,
      archivoBase64,
      archivoNombre,
      archivoTipo
    } = req.body;

    if (!nombre || !cui || !carrera || !fecha) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre, cui, carrera y fecha son requeridos.'
      });
    }

    // Identificador único de folio (generado o proporcionado)
    const tituloId = id ? id.trim() : `TIT-2026-${Date.now().toString().slice(-6)}`;

    // Verificar si el título ya existe
    const existente = db.prepare('SELECT id FROM titulos WHERE id = ?').get(tituloId);
    if (existente) {
      return res.status(409).json({
        error: `Ya existe un título registrado con el identificador ${tituloId}`
      });
    }

// Obtener la URL base pública del frontend (desde .env o inferida de la petición)
function obtenerBaseUrl(req) {
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== '') {
    return process.env.FRONTEND_URL.trim().replace(/\/$/, '');
  }
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return 'http://localhost:5173';
}

    // 1. Generar Código QR con la URL de verificación pública
    const frontendUrl = obtenerBaseUrl(req);
    const verifyUrl = `${frontendUrl}/verificar?id=${encodeURIComponent(tituloId)}`;
    
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: '#07172b',
        light: '#ffffff'
      }
    });

    // 2. Gestionar el documento del título (archivo subido o certificado oficial generado)
    let tituloArchivo = null;
    let tituloArchivoNombre = null;
    let tituloArchivoTipo = null;

    if (archivoBase64) {
      tituloArchivo = archivoBase64;
      tituloArchivoNombre = archivoNombre || `Titulo_${tituloId}.pdf`;
      tituloArchivoTipo = archivoTipo || 'application/pdf';
    } else {
      // Generar diploma / certificado oficial con QR integrado
      tituloArchivo = generarCertificadoSVG({
        id: tituloId,
        nombre: nombre.trim(),
        cui: cui.trim(),
        carrera: carrera.trim(),
        fecha: fecha.trim(),
        qrDataUrl
      });
      tituloArchivoNombre = `Titulo_Oficial_${tituloId}.svg`;
      tituloArchivoTipo = 'image/svg+xml';
    }

    // 3. Calcular hash criptográfico SHA-256 del documento
    let pdfHash = null;
    try {
      const rawDoc = (archivoBase64 || tituloArchivo).includes('base64,')
        ? (archivoBase64 || tituloArchivo).split('base64,')[1]
        : (archivoBase64 || tituloArchivo);
      const bufDoc = Buffer.from(rawDoc, 'base64');
      pdfHash = crypto.createHash('sha256').update(bufDoc).digest('hex');
    } catch (e) {
      console.warn('[Titulos] No se pudo calcular hash del documento:', e.message);
    }

    // Identificadores de registro y seguridad (almacenados en DB)
    const txHash = '0x' + crypto.createHash('sha256').update(`${tituloId}-${cui}-${Date.now()}`).digest('hex');
    const ipfsCid = `bafybei${crypto.randomBytes(16).toString('hex')}`;

    // 4. Guardar en SQLite (incluyendo qr_imagen, titulo_archivo y pdf_hash)
    const insert = db.prepare(`
      INSERT INTO titulos (
        id, nombre, cui, carrera, fecha, qr_imagen,
        titulo_archivo, titulo_archivo_nombre, titulo_archivo_tipo,
        pdf_hash, cid_ipfs, transaccion_hash, estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `);

    insert.run(
      tituloId,
      nombre.trim(),
      cui.trim(),
      carrera.trim(),
      fecha.trim(),
      qrDataUrl,
      tituloArchivo,
      tituloArchivoNombre,
      tituloArchivoTipo,
      pdfHash,
      ipfsCid,
      txHash
    );

    const tituloCreado = db.prepare('SELECT * FROM titulos WHERE id = ?').get(tituloId);

    console.log(`[Titulos] Nuevo título emitido y QR guardado en DB: ${tituloId} para ${nombre}`);

    return res.status(201).json({
      message: 'Título académico emitido y registrado exitosamente con código QR.',
      titulo: tituloCreado
    });

  } catch (error) {
    console.error('[Titulos Error] Error al emitir título:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al emitir el título.'
    });
  }
}

/**
 * Consulta de listado completo de títulos emitidos (CU-02)
 * Endpoint: GET /api/titulos (Protegido con JWT)
 */
function consultarTitulos(req, res) {
  try {
    const titulos = db.prepare('SELECT * FROM titulos ORDER BY created_at DESC').all();
    return res.status(200).json({
      total: titulos.length,
      titulos
    });
  } catch (error) {
    console.error('[Titulos Error] Error al consultar títulos:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar los títulos emitidos.'
    });
  }
}

/**
 * Consulta pública de metadatos de un título por su ID (CU-04)
 * Endpoint: GET /api/titulos/:id (Público)
 */
function consultarTituloPorId(req, res) {
  try {
    const { id } = req.params;
    const titulo = db.prepare('SELECT * FROM titulos WHERE id = ?').get(id);

    if (!titulo) {
      return res.status(404).json({
        error: `No se encontró ningún título registrado con el ID: ${id}`
      });
    }

    return res.status(200).json({
      encontrado: true,
      titulo
    });
  } catch (error) {
    console.error('[Titulos Error] Error al consultar título por ID:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar el título.'
    });
  }
}

module.exports = {
  emitirTitulo,
  consultarTitulos,
  consultarTituloPorId
};
