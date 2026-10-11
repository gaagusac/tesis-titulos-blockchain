/**
 * Script para actualizar el dominio o IP de los códigos QR existentes en SQLite
 * Uso:
 *   node scripts/actualizarDominioQR.js <NUEVA_URL_O_IP>
 * Ejemplo:
 *   node scripts/actualizarDominioQR.js https://titulos.ingenieria.usac.edu.gt
 *   node scripts/actualizarDominioQR.js http://192.168.1.50
 */

require('dotenv').config();
const db = require('../database/db');
const QRCode = require('qrcode');
const { generarCertificadoSVG } = require('../utils/certificateGenerator');

// Obtener nueva URL desde argumento de línea de comandos o variable FRONTEND_URL de .env
const nuevaUrlBase = (process.argv[2] || process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');

if (!nuevaUrlBase) {
  console.error('Error: Debe especificar la nueva URL base o configurar FRONTEND_URL en el archivo .env');
  console.log('Uso: node scripts/actualizarDominioQR.js <NUEVA_URL>');
  console.log('Ejemplo: node scripts/actualizarDominioQR.js http://192.168.1.50:5173');
  process.exit(1);
}

console.log(`[Actualizador QR] Nueva URL base objetivo: ${nuevaUrlBase}`);

async function actualizarTodosLosQRs() {
  const titulos = db.prepare('SELECT * FROM titulos').all();
  console.log(`[Actualizador QR] Se encontraron ${titulos.length} títulos para actualizar.`);

  let actualizados = 0;

  for (const t of titulos) {
    const verifyUrl = `${nuevaUrlBase}/verificar?id=${encodeURIComponent(t.id)}`;
    
    // Generar nuevo código QR con el nuevo dominio/IP
    const nuevoQrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: '#07172b',
        light: '#ffffff'
      }
    });

    let docArchivo = t.titulo_archivo;

    // Si el título tenía certificado SVG generado por el sistema, actualizar también el QR incrustado
    if (t.titulo_archivo_tipo === 'image/svg+xml') {
      docArchivo = generarCertificadoSVG({
        id: t.id,
        nombre: t.nombre,
        cui: t.cui,
        carrera: t.carrera,
        fecha: t.fecha,
        qrDataUrl: nuevoQrDataUrl
      });
    }

    db.prepare(`
      UPDATE titulos 
      SET qr_imagen = ?, titulo_archivo = ?
      WHERE id = ?
    `).run(nuevoQrDataUrl, docArchivo, t.id);

    actualizados++;
    console.log(` -> Actualizado [${t.id}] con URL: ${verifyUrl}`);
  }

  console.log(`\n[Éxito] Se actualizaron exitosamente ${actualizados} códigos QR con la nueva URL.`);
}

actualizarTodosLosQRs().catch(err => {
  console.error('[Error] Falla al actualizar códigos QR:', err);
  process.exit(1);
});
