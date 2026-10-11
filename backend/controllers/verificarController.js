const db = require('../database/db');
const crypto = require('crypto');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');

/**
 * Función auxiliar para registrar una transacción de verificación en la base de datos
 */
function registrarTransaccionVerificacion({ tituloId, metodo, resultado, hashCotejado, detalles, req }) {
  try {
    const uuid = crypto.randomUUID();
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';

    const insert = db.prepare(`
      INSERT INTO verificaciones (
        uuid, titulo_id, metodo, resultado, hash_cotejado, detalles, ip_origen, fecha, hora
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      uuid,
      tituloId || null,
      metodo,
      resultado,
      hashCotejado || null,
      detalles ? JSON.stringify(detalles) : null,
      ip,
      fecha,
      hora
    );

    return {
      uuid,
      fecha,
      hora,
      metodo,
      resultado,
      hashCotejado
    };
  } catch (err) {
    console.error('[Verificar Error] Falla al registrar transacción en DB:', err);
    return {
      uuid: crypto.randomUUID(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0],
      metodo,
      resultado
    };
  }
}

/**
 * Modalidad 1: Verificación mediante subida de imagen de Código QR
 * Endpoint: POST /api/verificar/qr
 */
async function verificarPorQR(req, res) {
  try {
    const { qrData, qrImageBase64 } = req.body;
    let decodedText = qrData;

    // Si se envía la imagen en Base64 y no viene el texto predecodificado
    if (!decodedText && qrImageBase64) {
      try {
        const rawBase64 = qrImageBase64.includes('base64,') ? qrImageBase64.split('base64,')[1] : qrImageBase64;
        const imgBuffer = Buffer.from(rawBase64, 'base64');
        const png = PNG.sync.read(imgBuffer);
        const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
        if (code && code.data) {
          decodedText = code.data;
        }
      } catch (err) {
        console.warn('[Verificar QR] Error decodificando imagen en backend:', err.message);
      }
    }

    if (!decodedText) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: null,
        metodo: 'CARGA_QR',
        resultado: 'INVALIDO',
        detalles: { motivo: 'No se pudo leer ningún código QR válido en la imagen' },
        req
      });

      return res.status(400).json({
        valido: false,
        error: 'No se pudo decodificar el código QR de la imagen provista.',
        transaccion
      });
    }

    // Extraer el identificador del título desde la URL o texto del QR
    let tituloId = null;
    try {
      if (decodedText.includes('id=')) {
        const urlObj = new URL(decodedText.startsWith('http') ? decodedText : `http://localhost/${decodedText}`);
        tituloId = urlObj.searchParams.get('id');
      } else if (decodedText.includes('/verificar/')) {
        tituloId = decodedText.split('/verificar/').pop().split('?')[0];
      } else {
        tituloId = decodedText.trim();
      }
    } catch (e) {
      tituloId = decodedText.trim();
    }

    if (!tituloId) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: null,
        metodo: 'CARGA_QR',
        resultado: 'INVALIDO',
        detalles: { decodedText },
        req
      });

      return res.status(200).json({
        valido: false,
        mensaje: 'Título Inválido: La información del código QR no contiene un folio reconocido.',
        transaccion
      });
    }

    // Buscar en la base de datos
    const titulo = db.prepare('SELECT * FROM titulos WHERE id = ?').get(tituloId);

    if (titulo) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: titulo.id,
        metodo: 'CARGA_QR',
        resultado: 'VALIDO',
        detalles: { decodedText },
        req
      });

      return res.status(200).json({
        valido: true,
        mensaje: 'Título Válido: Credencial académica verificada con éxito.',
        titulo,
        transaccion
      });
    } else {
      const transaccion = registrarTransaccionVerificacion({
        tituloId,
        metodo: 'CARGA_QR',
        resultado: 'INVALIDO',
        detalles: { decodedText },
        req
      });

      return res.status(200).json({
        valido: false,
        mensaje: `Título Inválido: El folio "${tituloId}" contenido en el QR no existe en el registro institucional.`,
        transaccion
      });
    }

  } catch (error) {
    console.error('[Verificar Error] Error en verificarPorQR:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar el código QR.'
    });
  }
}

/**
 * Modalidad 2: Verificación mediante archivo PDF del título (Cotejo de Hash SHA-256)
 * Endpoint: POST /api/verificar/archivo
 */
async function verificarPorArchivo(req, res) {
  try {
    const { archivoBase64, archivoNombre } = req.body;

    if (!archivoBase64) {
      return res.status(400).json({
        error: 'Debe adjuntar el archivo PDF para verificar su autenticidad.'
      });
    }

    // Extraer buffer y calcular el hash criptográfico SHA-256 del archivo cargado
    const rawData = archivoBase64.includes('base64,') ? archivoBase64.split('base64,')[1] : archivoBase64;
    const fileBuffer = Buffer.from(rawData, 'base64');
    const hashCalculado = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Buscar coincidencia en la base de datos por pdf_hash o por transaccion_hash
    const titulo = db.prepare(`
      SELECT * FROM titulos 
      WHERE pdf_hash = ? OR LOWER(transaccion_hash) = LOWER(?) OR LOWER(transaccion_hash) = LOWER(?)
    `).get(hashCalculado, hashCalculado, '0x' + hashCalculado);

    if (titulo) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: titulo.id,
        metodo: 'PDF_HASH',
        resultado: 'VALIDO',
        hashCotejado: hashCalculado,
        detalles: { archivoNombre },
        req
      });

      return res.status(200).json({
        valido: true,
        mensaje: 'Título Válido: Integridad criptográfica verificada. El documento PDF es idéntico al registrado originalmente.',
        hashCalculado,
        titulo,
        transaccion
      });
    } else {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: null,
        metodo: 'PDF_HASH',
        resultado: 'INVALIDO',
        hashCotejado: hashCalculado,
        detalles: { archivoNombre },
        req
      });

      return res.status(200).json({
        valido: false,
        mensaje: 'Título Inválido: La huella digital criptográfica (SHA-256) no coincide con ningún título registrado. El documento pudo haber sido alterado o no existe.',
        hashCalculado,
        transaccion
      });
    }

  } catch (error) {
    console.error('[Verificar Error] Error en verificarPorArchivo:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al verificar el archivo.'
    });
  }
}

/**
 * Modalidad 3: Verificación mediante CUI y Carrera del graduando
 * Endpoint: POST /api/verificar/cui-carrera
 */
async function verificarPorCuiCarrera(req, res) {
  try {
    const { cui, carrera } = req.body;

    if (!cui || !carrera) {
      return res.status(400).json({
        error: 'Debe ingresar tanto el CUI como la carrera profesional para realizar la consulta.'
      });
    }

    const cuiClean = cui.trim();
    const carreraClean = carrera.trim().toLowerCase();

    // Consulta en SQLite insensible a mayúsculas
    const titulo = db.prepare(`
      SELECT * FROM titulos 
      WHERE cui = ? AND LOWER(TRIM(carrera)) = ?
    `).get(cuiClean, carreraClean);

    if (titulo) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: titulo.id,
        metodo: 'CUI_CARRERA',
        resultado: 'VALIDO',
        detalles: { cui: cuiClean, carrera: carreraClean },
        req
      });

      return res.status(200).json({
        valido: true,
        mensaje: 'Título Válido: Registro académico confirmado en la base de datos de la facultad.',
        titulo,
        transaccion
      });
    } else {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: null,
        metodo: 'CUI_CARRERA',
        resultado: 'INVALIDO',
        detalles: { cui: cuiClean, carrera: carreraClean },
        req
      });

      return res.status(200).json({
        valido: false,
        mensaje: `Título No Encontrado: No existe registro para el CUI "${cuiClean}" en la carrera "${carrera}".`,
        transaccion
      });
    }

  } catch (error) {
    console.error('[Verificar Error] Error en verificarPorCuiCarrera:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al consultar por CUI y carrera.'
    });
  }
}

/**
 * Modalidad 4: Escaneo directo por teléfono / Consulta directa por ID de URL
 * Endpoint: GET /api/verificar/id/:id
 */
async function verificarPorIdDirecto(req, res) {
  try {
    const { id } = req.params;
    const tituloId = id ? id.trim() : '';

    if (!tituloId) {
      return res.status(400).json({
        error: 'Debe proporcionar un identificador de título válido.'
      });
    }

    const titulo = db.prepare('SELECT * FROM titulos WHERE id = ?').get(tituloId);

    if (titulo) {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: titulo.id,
        metodo: 'ESCANEO_DIRECTO',
        resultado: 'VALIDO',
        detalles: { idConsultado: tituloId },
        req
      });

      return res.status(200).json({
        valido: true,
        mensaje: 'Título Válido: El folio consultado corresponde a una credencial universitaria legalmente emitida.',
        titulo,
        transaccion
      });
    } else {
      const transaccion = registrarTransaccionVerificacion({
        tituloId: tituloId,
        metodo: 'ESCANEO_DIRECTO',
        resultado: 'INVALIDO',
        detalles: { idConsultado: tituloId },
        req
      });

      return res.status(200).json({
        valido: false,
        mensaje: `Título Inválido: No existe ninguna credencial emitida con el folio "${tituloId}".`,
        transaccion
      });
    }

  } catch (error) {
    console.error('[Verificar Error] Error en verificarPorIdDirecto:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al verificar por identificador.'
    });
  }
}

/**
 * Consulta del historial de auditoría de verificaciones realizadas
 * Endpoint: GET /api/verificar/historial
 */
function consultarHistorialVerificaciones(req, res) {
  try {
    const registros = db.prepare(`
      SELECT v.*, t.nombre as graduando_nombre, t.carrera as graduando_carrera
      FROM verificaciones v
      LEFT JOIN titulos t ON v.titulo_id = t.id
      ORDER BY v.created_at DESC
      LIMIT 100
    `).all();

    return res.status(200).json({
      total: registros.length,
      verificaciones: registros
    });
  } catch (error) {
    console.error('[Verificar Error] Error al consultar historial:', error);
    return res.status(500).json({
      error: 'Error al consultar el historial de verificaciones.'
    });
  }
}

module.exports = {
  verificarPorQR,
  verificarPorArchivo,
  verificarPorCuiCarrera,
  verificarPorIdDirecto,
  consultarHistorialVerificaciones
};
