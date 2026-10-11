const assert = require('assert');
const http = require('http');
const app = require('./server');

const TEST_PORT = 4005;

async function runTests() {
  const server = app.listen(TEST_PORT, async () => {
    console.log(`[TEST] Servidor de prueba iniciado en el puerto ${TEST_PORT}`);
    try {
      const baseUrl = `http://localhost:${TEST_PORT}/api`;

      // 1. Healthcheck
      console.log('-> 1. Probando GET /api/health...');
      let res = await fetch(`${baseUrl}/health`);
      let data = await res.json();
      assert.strictEqual(res.status, 200, 'Health check debe responder 200');
      assert.strictEqual(data.status, 'ok', 'Status debe ser ok');
      console.log('   OK: Health check exitoso.');

      // 2. Login con credenciales incorrectas (RF-01)
      console.log('-> 2. Probando POST /api/auth/login con credenciales erróneas...');
      res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', password: 'password_incorrecta' })
      });
      data = await res.json();
      assert.strictEqual(res.status, 401, 'Debe denegar acceso con código 401');
      assert.strictEqual(data.error, 'Usuario o contraseña incorrectos', 'Mensaje de error debe coincidir');
      console.log('   OK: Denegación de acceso correcta (401).');

      // 3. Login con credenciales válidas (RF-01 / CU-03)
      console.log('-> 3. Probando POST /api/auth/login con credenciales válidas...');
      res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', password: 'admin123' })
      });
      data = await res.json();
      assert.strictEqual(res.status, 200, 'Debe permitir acceso con código 200');
      assert.ok(data.token, 'Debe devolver un JWT token');
      assert.strictEqual(data.user.usuario, 'admin', 'Usuario retornado debe ser admin');
      const token = data.token;
      console.log('   OK: Autenticación exitosa y JWT emitido.');

      // 4. Verificación de sesión con token JWT
      console.log('-> 4. Probando GET /api/auth/verify con Bearer Token...');
      res = await fetch(`${baseUrl}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      data = await res.json();
      assert.strictEqual(res.status, 200, 'Token válido debe responder 200');
      assert.strictEqual(data.valid, true);
      assert.strictEqual(data.user.usuario, 'admin');
      console.log('   OK: Sesión JWT validada.');

      // 5. Rechazo a ruta protegida sin token
      console.log('-> 5. Probando GET /api/titulos sin token (debe rechazar)...');
      res = await fetch(`${baseUrl}/titulos`);
      assert.strictEqual(res.status, 401, 'Debe devolver 401 al faltar token');
      console.log('   OK: Ruta protegida denegó acceso anónimo.');

      // 6. Emisión de nuevo título académico (CU-01)
      console.log('-> 6. Probando POST /api/titulos con JWT...');
      const testTituloId = `TIT-TEST-${Date.now()}`;
      res = await fetch(`${baseUrl}/titulos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: testTituloId,
          nombre: 'Ing. Gustavo Argueta',
          cui: '2999010100101',
          carrera: 'Ingeniería en Ciencias y Sistemas',
          fecha: '2026-10-08'
        })
      });
      data = await res.json();
      assert.strictEqual(res.status, 201, 'Emisión debe responder 201 Created');
      assert.strictEqual(data.titulo.id, testTituloId);
      assert.ok(data.titulo.qr_imagen && data.titulo.qr_imagen.startsWith('data:image/png;base64,'), 'Debe contener imagen QR en base64');
      assert.ok(data.titulo.titulo_archivo, 'Debe contener documento de título');
      console.log('   OK: Título emitido con imagen QR y documento en SQLite.');

      // 7. Consulta de títulos emitidos (CU-02)
      console.log('-> 7. Probando GET /api/titulos con JWT...');
      res = await fetch(`${baseUrl}/titulos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      data = await res.json();
      assert.strictEqual(res.status, 200, 'Consulta debe responder 200');
      assert.ok(Array.isArray(data.titulos), 'Debe devolver un arreglo de títulos');
      assert.ok(data.titulos.some(t => t.id === testTituloId), 'El título emitido debe estar en el listado');
      console.log(`   OK: Listado recuperado (${data.titulos.length} títulos encontrados).`);

      // 8. Consulta pública de título por ID (CU-04)
      console.log(`-> 8. Probando GET /api/titulos/${testTituloId} público...`);
      res = await fetch(`${baseUrl}/titulos/${testTituloId}`);
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.titulo.id, testTituloId);
      console.log('   OK: Consulta pública por ID completada.');

      // 9. Modalidad 1: Verificación mediante Código QR
      console.log('-> 9. Probando POST /api/verificar/qr con datos de QR...');
      res = await fetch(`${baseUrl}/verificar/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: `http://localhost:5173/verificar?id=${testTituloId}` })
      });
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.valido, true);
      assert.strictEqual(data.titulo.id, testTituloId);
      assert.ok(data.transaccion?.uuid, 'Debe devolver UUID de transacción');
      console.log(`   OK: Verificación por QR exitosa (UUID: ${data.transaccion.uuid}).`);

      // 10. Modalidad 2: Verificación mediante Archivo (Hash SHA-256) - Coincidencia
      console.log('-> 10. Probando POST /api/verificar/archivo con documento auténtico...');
      const archivoBase64Valido = data.titulo.titulo_archivo;
      res = await fetch(`${baseUrl}/verificar/archivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivoBase64: archivoBase64Valido, archivoNombre: 'Titulo_Test.svg' })
      });
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.valido, true);
      assert.ok(data.hashCalculado, 'Debe retornar el hash SHA-256');
      assert.ok(data.transaccion?.uuid, 'Debe registrar UUID de transacción');
      console.log(`   OK: Verificación por archivo auténtico exitosa (Hash: ${data.hashCalculado.slice(0, 12)}...).`);

      // 11. Modalidad 2: Verificación mediante Archivo alterado (Falsificación)
      console.log('-> 11. Probando POST /api/verificar/archivo con documento alterado...');
      const archivoAlterado = Buffer.from('PDF_FALSIFICADO_O_MODIFICADO').toString('base64');
      res = await fetch(`${baseUrl}/verificar/archivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivoBase64: archivoAlterado, archivoNombre: 'Falsificacion.pdf' })
      });
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.valido, false);
      assert.ok(data.transaccion?.uuid, 'Debe registrar UUID de transacción incluso para inválidos');
      console.log(`   OK: Detección correcta de documento alterado (UUID: ${data.transaccion.uuid}).`);

      // 12. Modalidad 3: Verificación mediante CUI y Carrera
      console.log('-> 12. Probando POST /api/verificar/cui-carrera...');
      res = await fetch(`${baseUrl}/verificar/cui-carrera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui: '2999010100101', carrera: 'Ingeniería en Ciencias y Sistemas' })
      });
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.valido, true);
      assert.ok(data.transaccion?.uuid);
      console.log(`   OK: Verificación por CUI y Carrera exitosa.`);

      // 13. Modalidad 4: Escaneo directo / Consulta por URL ID
      console.log(`-> 13. Probando GET /api/verificar/id/${testTituloId} (Escaneo móvil)...`);
      res = await fetch(`${baseUrl}/verificar/id/${testTituloId}`);
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.valido, true);
      assert.strictEqual(data.titulo.id, testTituloId);
      assert.ok(data.transaccion?.uuid);
      console.log(`   OK: Escaneo directo por teléfono verificado.`);

      // 14. Auditoría: Consultar historial de verificaciones en SQLite
      console.log('-> 14. Probando GET /api/verificar/historial...');
      res = await fetch(`${baseUrl}/verificar/historial`);
      data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(data.verificaciones.length >= 4, 'Deben existir las transacciones registradas');
      console.log(`   OK: Tabla de verificaciones verificada (${data.verificaciones.length} registros persistidos).`);

      console.log('\n======================================================');
      console.log(' ¡TODAS LAS PRUEBAS AUTOMATIZADAS PASARON CON ÉXITO! ');
      console.log('======================================================\n');
    } catch (err) {
      console.error('\n[FALLO EN TEST]:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runTests();
