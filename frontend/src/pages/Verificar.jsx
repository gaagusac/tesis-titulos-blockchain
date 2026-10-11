import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import jsQR from 'jsqr';
import apiService from '../services/apiService';

export default function Verificar() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

  // Modalidad seleccionada: 'qr' | 'pdf' | 'cui'
  const [modalidad, setModalidad] = useState('qr');

  // Estados para Carga de QR
  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);
  const [qrDecodedText, setQrDecodedText] = useState(null);

  // Estados para Carga de PDF
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);

  // Estados para CUI y Carrera
  const [cuiInput, setCuiInput] = useState('');
  const [carreraInput, setCarreraInput] = useState('Ingeniería en Ciencias y Sistemas');

  // Estados de Verificación y Resultados
  const [loading, setLoading] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState(null);

  // Modal para ver el documento oficial verificado
  const [mostrarDocModal, setMostrarDocModal] = useState(false);

  // Canvas oculto para decodificar QR en cliente
  const canvasRef = useRef(null);

  // =========================================================================
  // MODALIDAD 4: ESCANEO DIRECTO POR TELÉFONO / PARÁMETRO EN URL
  // =========================================================================
  useEffect(() => {
    const idUrl = searchParams.get('id') || routeParams.id;
    if (idUrl) {
      ejecutarVerificacionPorId(idUrl);
    }
  }, [searchParams, routeParams]);

  const ejecutarVerificacionPorId = async (id) => {
    setLoading(true);
    setErrorGlobal(null);
    setResultadoVerificacion(null);

    try {
      const data = await apiService.verificarPorIdDirecto(id);
      setResultadoVerificacion(data);
    } catch (err) {
      console.error('Error verificando por ID:', err);
      setResultadoVerificacion({
        valido: false,
        mensaje: err.response?.data?.mensaje || `No se pudo verificar el título con folio "${id}".`,
        transaccion: err.response?.data?.transaccion || null
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE SUBIDA Y DECODIFICACIÓN DE IMAGEN QR
  // =========================================================================
  const handleQrImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setQrFile(file);
    setQrDecodedText(null);
    setErrorGlobal(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setQrBase64(base64Data);
      setQrPreviewUrl(base64Data);

      // Decodificación mediante HTML5 Canvas + jsQR
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setQrDecodedText(code.data);
        }
      };
      img.src = base64Data;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitQR = async (e) => {
    e.preventDefault();
    if (!qrBase64 && !qrDecodedText) {
      setErrorGlobal('Por favor seleccione una imagen con el código QR del título.');
      return;
    }

    setLoading(true);
    setErrorGlobal(null);
    setResultadoVerificacion(null);

    try {
      const data = await apiService.verificarPorQR({
        qrData: qrDecodedText,
        qrImageBase64: qrBase64
      });
      setResultadoVerificacion(data);
    } catch (err) {
      console.error('Error al verificar QR:', err);
      setResultadoVerificacion({
        valido: false,
        mensaje: err.response?.data?.mensaje || err.response?.data?.error || 'Error al procesar la imagen del código QR.',
        transaccion: err.response?.data?.transaccion || null
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE SUBIDA Y COTEJO DE ARCHIVO PDF
  // =========================================================================
  const handlePdfFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfFile(file);
    setErrorGlobal(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPdfBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPDF = async (e) => {
    e.preventDefault();
    if (!pdfBase64) {
      setErrorGlobal('Por favor adjunte el archivo PDF del título a verificar.');
      return;
    }

    setLoading(true);
    setErrorGlobal(null);
    setResultadoVerificacion(null);

    try {
      const data = await apiService.verificarPorArchivo({
        archivoBase64: pdfBase64,
        archivoNombre: pdfFile?.name
      });
      setResultadoVerificacion(data);
    } catch (err) {
      console.error('Error al verificar PDF:', err);
      setResultadoVerificacion({
        valido: false,
        mensaje: err.response?.data?.mensaje || err.response?.data?.error || 'Error al procesar el archivo PDF.',
        transaccion: err.response?.data?.transaccion || null
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // GESTIÓN DE CONSULTA POR CUI Y CARRERA
  // =========================================================================
  const handleSubmitCuiCarrera = async (e) => {
    e.preventDefault();
    if (!cuiInput.trim()) {
      setErrorGlobal('Por favor ingrese el CUI del graduando.');
      return;
    }

    setLoading(true);
    setErrorGlobal(null);
    setResultadoVerificacion(null);

    try {
      const data = await apiService.verificarPorCuiCarrera({
        cui: cuiInput.trim(),
        carrera: carreraInput.trim()
      });
      setResultadoVerificacion(data);
    } catch (err) {
      console.error('Error al verificar por CUI y carrera:', err);
      setResultadoVerificacion({
        valido: false,
        mensaje: err.response?.data?.mensaje || err.response?.data?.error || 'No se encontró el registro.',
        transaccion: err.response?.data?.transaccion || null
      });
    } finally {
      setLoading(false);
    }
  };

  // Restablecer formulario para nueva consulta
  const reiniciarVerificacion = () => {
    setResultadoVerificacion(null);
    setErrorGlobal(null);
    setQrFile(null);
    setQrPreviewUrl(null);
    setQrBase64(null);
    setQrDecodedText(null);
    setPdfFile(null);
    setPdfBase64(null);
    setCuiInput('');
  };

  return (
    <div className="verificar-page-layout">
      {/* Canvas oculto para decodificación */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Cabecera Pública Institucional */}
      <header className="verificar-navbar">
        <div className="verificar-navbar-brand">
          <div className="navbar-logo-badge">USAC</div>
          <div className="verificar-brand-text">
            <span className="verificar-institution-tag">
              Universidad de San Carlos de Guatemala • Facultad de Ingeniería
            </span>
            <h1 className="verificar-main-title">
              Portal Público de Verificación de Títulos
            </h1>
          </div>
        </div>

        <div className="verificar-nav-actions">
          <Link to="/login" className="btn-admin-access">
            <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span>Acceso Administrativo</span>
          </Link>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="verificar-main-container">
        {/* Banner de Bienvenida y Explicación */}
        <section className="verificar-hero-banner">
          <h2 className="hero-title">Cotejo y Verificación Inmutable de Credenciales</h2>
          <p className="hero-description">
            Verifique la autenticidad e integridad de títulos universitarios emitidos por la Facultad de Ingeniería.
            Cualquier empleador, institución o persona puede auditar la validez mediante múltiples mecanismos seguros.
          </p>
        </section>

        {/* ALERTA DE ERROR GENERAL */}
        {errorGlobal && (
          <div className="alert-error" role="alert">
            <strong>Error:</strong> {errorGlobal}
          </div>
        )}

        {/* =================================================================== */}
        {/* RESULTADO DE LA VERIFICACIÓN (SI YA HAY RESPUESTA)                   */}
        {/* =================================================================== */}
        {resultadoVerificacion ? (
          <div className={`resultado-card ${resultadoVerificacion.valido ? 'resultado-valido' : 'resultado-invalido'}`}>
            <div className="resultado-header">
              <div className="resultado-badge-status">
                {resultadoVerificacion.valido ? (
                  <>
                    <svg className="status-icon success" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>TÍTULO VÁLIDO</span>
                  </>
                ) : (
                  <>
                    <svg className="status-icon danger" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>TÍTULO INVÁLIDO O NO ENCONTRADO</span>
                  </>
                )}
              </div>
              <p className="resultado-mensaje-principal">
                {resultadoVerificacion.mensaje}
              </p>
            </div>

            {/* Si el título es válido, desplegar información del graduando */}
            {resultadoVerificacion.valido && resultadoVerificacion.titulo && (
              <div className="graduando-info-section">
                <h3 className="section-subtitle">Información Oficial del Graduando</h3>
                <div className="graduando-grid">
                  <div className="info-block">
                    <span className="info-label">Nombre del Egresado:</span>
                    <strong className="info-value-name">{resultadoVerificacion.titulo.nombre}</strong>
                  </div>

                  <div className="info-block">
                    <span className="info-label">CUI / Carné Universitario:</span>
                    <strong className="info-value">{resultadoVerificacion.titulo.cui}</strong>
                  </div>

                  <div className="info-block">
                    <span className="info-label">Carrera Profesional:</span>
                    <strong className="info-value">{resultadoVerificacion.titulo.carrera}</strong>
                  </div>

                  <div className="info-block">
                    <span className="info-label">Fecha Oficial de Emisión:</span>
                    <strong className="info-value">{resultadoVerificacion.titulo.fecha}</strong>
                  </div>

                  <div className="info-block">
                    <span className="info-label">Folio / Identificador Único:</span>
                    <code className="info-folio">{resultadoVerificacion.titulo.id}</code>
                  </div>

                  <div className="info-block">
                    <span className="info-label">Estado de la Credencial:</span>
                    <span className="badge-status-vigente">
                      {resultadoVerificacion.titulo.estado || 'ACTIVO / VIGENTE'}
                    </span>
                  </div>
                </div>

                {/* Botón para ver documento oficial si existe */}
                {resultadoVerificacion.titulo.titulo_archivo && (
                  <div className="doc-view-action">
                    <button
                      type="button"
                      className="btn-ver-documento"
                      onClick={() => setMostrarDocModal(true)}
                    >
                      <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Visualizar Documento de Título Registrado</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Información de Transacción y Auditoría Guardada en SQLite */}
            {resultadoVerificacion.transaccion && (
              <div className="transaccion-audit-card">
                <div className="audit-header">
                  <svg className="audit-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" clipRule="evenodd" />
                  </svg>
                  <span>Registro de Transacción de Verificación (Persistido en DB)</span>
                </div>
                <div className="audit-grid">
                  <div>
                    <span className="audit-label">UUID de Transacción:</span>
                    <code className="audit-uuid">{resultadoVerificacion.transaccion.uuid}</code>
                  </div>
                  <div>
                    <span className="audit-label">Método de Cotejo:</span>
                    <strong className="audit-method">
                      {resultadoVerificacion.transaccion.metodo === 'CARGA_QR' && 'Lectura de Código QR'}
                      {resultadoVerificacion.transaccion.metodo === 'PDF_HASH' && 'Cotejo Criptográfico de Hash PDF'}
                      {resultadoVerificacion.transaccion.metodo === 'CUI_CARRERA' && 'Consulta por CUI y Carrera'}
                      {resultadoVerificacion.transaccion.metodo === 'ESCANEO_DIRECTO' && 'Escaneo QR / Consulta Directa'}
                    </strong>
                  </div>
                  <div>
                    <span className="audit-label">Fecha y Hora de Cotejo:</span>
                    <span>{resultadoVerificacion.transaccion.fecha} a las {resultadoVerificacion.transaccion.hora}</span>
                  </div>
                  {resultadoVerificacion.hashCalculado && (
                    <div className="full-width">
                      <span className="audit-label">Hash SHA-256 Calculado:</span>
                      <code className="audit-hash">{resultadoVerificacion.hashCalculado}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="resultado-actions">
              <button
                type="button"
                className="btn-nueva-consulta"
                onClick={reiniciarVerificacion}
              >
                ← Realizar otra verificación
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* SELECTOR Y FORMULARIOS DE LAS 3 MODALIDADES                       */
          /* ================================================================= */
          <div className="verificar-tabs-wrapper">
            <div className="modalidades-tabs">
              <button
                type="button"
                className={`modalidad-tab-btn ${modalidad === 'qr' ? 'active' : ''}`}
                onClick={() => { setModalidad('qr'); setErrorGlobal(null); }}
              >
                <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" />
                  <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" />
                  <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" />
                  <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>1. Carga de Código QR</span>
              </button>

              <button
                type="button"
                className={`modalidad-tab-btn ${modalidad === 'pdf' ? 'active' : ''}`}
                onClick={() => { setModalidad('pdf'); setErrorGlobal(null); }}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>2. Archivo PDF del Título</span>
              </button>

              <button
                type="button"
                className={`modalidad-tab-btn ${modalidad === 'cui' ? 'active' : ''}`}
                onClick={() => { setModalidad('cui'); setErrorGlobal(null); }}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>3. CUI y Carrera</span>
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FORMULARIO 1: SUBIDA DE CÓDIGO QR                             */}
            {/* ------------------------------------------------------------- */}
            {modalidad === 'qr' && (
              <form onSubmit={handleSubmitQR} className="verificacion-card-body">
                <div className="modalidad-desc-banner">
                  <strong>Verificación por Imagen QR:</strong> Suba una foto o captura de la imagen del código QR impreso en el título. El sistema extraerá los datos y comprobará su validez en la base de datos.
                </div>

                <div className="file-upload-box">
                  <input
                    type="file"
                    id="qr-file-input"
                    accept="image/*"
                    className="file-hidden-input"
                    onChange={handleQrImageSelect}
                  />
                  <label htmlFor="qr-file-input" className="file-upload-label">
                    {qrPreviewUrl ? (
                      <div className="preview-container">
                        <img src={qrPreviewUrl} alt="Vista previa QR" className="qr-user-preview-img" />
                        <span className="upload-prompt">
                          Archivo: {qrFile?.name} {qrDecodedText && '• (Código QR reconocido ✓)'}
                        </span>
                        <span className="upload-requirements">Haga clic si desea cambiar la imagen</span>
                      </div>
                    ) : (
                      <>
                        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                          <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                          <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h3v3m0 0h3v3m-3-3v3m0-3h-3" />
                        </svg>
                        <span className="upload-prompt">
                          Haga clic para subir la imagen del Código QR
                        </span>
                        <span className="upload-requirements">Soporta PNG, JPG, JPEG, WEBP</span>
                      </>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-verificar-submit"
                  disabled={loading || !qrFile}
                >
                  {loading ? 'Decodificando y verificando...' : 'Verificar Código QR'}
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMULARIO 2: COTEJO DE ARCHIVO PDF                           */}
            {/* ------------------------------------------------------------- */}
            {modalidad === 'pdf' && (
              <form onSubmit={handleSubmitPDF} className="verificacion-card-body">
                <div className="modalidad-desc-banner">
                  <strong>Verificación por Documento PDF:</strong> Cargue el archivo PDF oficial del título. El sistema generará su huella digital criptográfica (SHA-256) y confirmará si es 100% idéntico al emitido.
                </div>

                <div className="file-upload-box">
                  <input
                    type="file"
                    id="pdf-file-input"
                    accept="application/pdf"
                    className="file-hidden-input"
                    onChange={handlePdfFileSelect}
                  />
                  <label htmlFor="pdf-file-input" className="file-upload-label">
                    <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="upload-prompt">
                      {pdfFile
                        ? `PDF seleccionado: ${pdfFile.name} (${(pdfFile.size / 1024).toFixed(1)} KB)`
                        : 'Haga clic para adjuntar el documento PDF oficial'}
                    </span>
                    <span className="upload-requirements">
                      Formato requerido: documento digital en formato .pdf
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-verificar-submit"
                  disabled={loading || !pdfFile}
                >
                  {loading ? 'Calculando hash y cotejando...' : 'Verificar Documento PDF'}
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMULARIO 3: CONSULTA POR CUI Y CARRERA                      */}
            {/* ------------------------------------------------------------- */}
            {modalidad === 'cui' && (
              <form onSubmit={handleSubmitCuiCarrera} className="verificacion-card-body">
                <div className="modalidad-desc-banner">
                  <strong>Verificación por CUI y Carrera:</strong> Ingrese el Código Único de Identificación (DPI/Carné) y la carrera del graduando para consultar directamente en el registro oficial.
                </div>

                <div className="form-group-cui-grid">
                  <div className="form-group">
                    <label htmlFor="input-cui" className="form-label">
                      Código Único de Identificación (CUI / Carné)
                    </label>
                    <input
                      id="input-cui"
                      type="text"
                      className="form-input"
                      placeholder="Ej. 2999010100101"
                      value={cuiInput}
                      onChange={(e) => setCuiInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="select-carrera" className="form-label">
                      Carrera Profesional
                    </label>
                    <select
                      id="select-carrera"
                      className="form-select"
                      value={carreraInput}
                      onChange={(e) => setCarreraInput(e.target.value)}
                    >
                      <option value="Ingeniería en Ciencias y Sistemas">Ingeniería en Ciencias y Sistemas</option>
                      <option value="Ingeniería Civil">Ingeniería Civil</option>
                      <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                      <option value="Ingeniería Mecánica">Ingeniería Mecánica</option>
                      <option value="Ingeniería Química">Ingeniería Química</option>
                      <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-verificar-submit"
                  disabled={loading || !cuiInput.trim()}
                >
                  {loading ? 'Consultando registro...' : 'Consultar Registro Académico'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL PARA VISUALIZAR DOCUMENTO DEL TÍTULO VERIFICADO               */}
      {/* =================================================================== */}
      {mostrarDocModal && resultadoVerificacion?.titulo && (
        <div className="modal-backdrop" onClick={() => setMostrarDocModal(false)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="modal-subtitle">Documento Autenticado</span>
                <h3 className="modal-title">{resultadoVerificacion.titulo.nombre} — {resultadoVerificacion.titulo.carrera}</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setMostrarDocModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="doc-preview-wrapper">
                {resultadoVerificacion.titulo.titulo_archivo_tipo === 'application/pdf' ? (
                  <iframe
                    src={resultadoVerificacion.titulo.titulo_archivo}
                    title="Documento PDF Verificado"
                    className="doc-iframe"
                  />
                ) : (
                  <img
                    src={resultadoVerificacion.titulo.titulo_archivo}
                    alt="Título Oficial"
                    className="doc-rendered-image"
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setMostrarDocModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer className="verificar-footer">
        Facultad de Ingeniería • Escuela de Ingeniería en Ciencias y Sistemas • Universidad de San Carlos de Guatemala • 2026
      </footer>
    </div>
  );
}
