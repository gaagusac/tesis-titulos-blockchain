import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

// Función para generar un Folio único del sistema
const generarFolioUnico = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  return `TIT-2026-${timestamp}${random}`;
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sección activa: 'emitir' | 'listado'
  const [seccionActiva, setSeccionActiva] = useState('emitir');

  // Estados para el formulario de emisión
  const [formData, setFormData] = useState({
    id: generarFolioUnico(),
    nombre: '',
    cui: '',
    carrera: 'Ingeniería en Ciencias y Sistemas',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [archivoBase64, setArchivoBase64] = useState(null);
  const [mensajeEmision, setMensajeEmision] = useState(null);
  const [loadingEmision, setLoadingEmision] = useState(false);

  // Estados para el listado de títulos
  const [titulos, setTitulos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loadingTitulos, setLoadingTitulos] = useState(false);
  const [errorTitulos, setErrorTitulos] = useState(null);

  // Estados para los Modales / Popups
  const [modalQR, setModalQR] = useState(null);
  const [modalTitulo, setModalTitulo] = useState(null);

  // Acción de cierre de sesión (Logoff)
  const handleLogoff = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Cargar el listado de títulos emitidos
  const cargarTitulos = async () => {
    setLoadingTitulos(true);
    setErrorTitulos(null);
    try {
      const data = await apiService.consultarTitulos();
      setTitulos(data.titulos || []);
    } catch (err) {
      console.error('Error al cargar títulos:', err);
      setErrorTitulos(err.response?.data?.error || 'No se pudieron recuperar los títulos.');
    } finally {
      setLoadingTitulos(false);
    }
  };

  // Cargar títulos al cambiar a la pestaña de listado o al inicio
  useEffect(() => {
    if (seccionActiva === 'listado') {
      cargarTitulos();
    }
  }, [seccionActiva]);

  // Manejador de selección de archivo con conversión a Base64
  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      const reader = new FileReader();
      reader.onload = () => {
        setArchivoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setArchivoSeleccionado(null);
      setArchivoBase64(null);
    }
  };

  // Manejador del formulario de emisión
  const handleSubmitEmision = async (e) => {
    e.preventDefault();
    setMensajeEmision(null);

    if (!formData.nombre.trim() || !formData.cui.trim()) {
      setMensajeEmision({ tipo: 'error', texto: 'Por favor ingrese el nombre del graduando y su CUI.' });
      return;
    }

    setLoadingEmision(true);
    try {
      const payload = {
        id: formData.id,
        nombre: formData.nombre.trim(),
        cui: formData.cui.trim(),
        carrera: formData.carrera,
        fecha: formData.fecha,
        archivoBase64: archivoBase64,
        archivoNombre: archivoSeleccionado ? archivoSeleccionado.name : null,
        archivoTipo: archivoSeleccionado ? archivoSeleccionado.type : null
      };

      const respuesta = await apiService.emitirTitulo(payload);
      setMensajeEmision({
        tipo: 'exito',
        texto: `Título emitido exitosamente con ID: ${respuesta.titulo?.id || formData.id}`
      });

      // Generar nuevo Folio no modificable para la siguiente emisión y limpiar campos
      setFormData({
        ...formData,
        id: generarFolioUnico(),
        nombre: '',
        cui: '',
      });
      setArchivoSeleccionado(null);
      setArchivoBase64(null);

      // Refrescar listado
      cargarTitulos();
    } catch (err) {
      console.error('Error al emitir título:', err);
      setMensajeEmision({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al procesar la emisión del título.'
      });
    } finally {
      setLoadingEmision(false);
    }
  };

  // Función utilitaria para descargar archivos al PC del administrador
  const descargarArchivo = (dataUrl, nombreArchivo) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descarga del Código QR
  const handleDescargarQR = (item) => {
    if (!item?.qr_imagen) return;
    descargarArchivo(item.qr_imagen, `QR_${item.id}.png`);
  };

  // Descarga del Título Académico
  const handleDescargarTitulo = (item) => {
    if (!item?.titulo_archivo) return;
    const extension = item.titulo_archivo_tipo === 'application/pdf' ? '.pdf' : '.svg';
    const nombre = item.titulo_archivo_nombre || `Titulo_${item.id}${extension}`;
    descargarArchivo(item.titulo_archivo, nombre);
  };

  // Filtrado de títulos en tiempo real
  const titulosFiltrados = titulos.filter((t) => {
    const q = filtro.toLowerCase();
    return (
      t.nombre?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q) ||
      t.cui?.toLowerCase().includes(q) ||
      t.carrera?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-layout">
      {/* Barra Superior Institucional con Botón de Logoff */}
      <header className="dashboard-navbar">
        <div className="navbar-brand">
          <div className="navbar-logo-badge">USAC</div>
          <div className="navbar-title-container">
            <span className="navbar-institution">Facultad de Ingeniería • Universidad de San Carlos de Guatemala</span>
            <h1 className="navbar-title">Administración de Credenciales Académicas</h1>
          </div>
        </div>

        <div className="navbar-user-actions">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              {(user?.usuario || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.nombre || user?.usuario || 'Administrador'}</span>
              <span className="user-role">Rol: {user?.rol || 'ADMIN'}</span>
            </div>
          </div>

          {/* Enlace al Portal Público de Verificación */}
          <a
            href="/verificar"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-portal-publico"
            title="Abrir portal público de verificación"
          >
            <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Portal de Verificación</span>
          </a>

          {/* Botón de Logoff del Sistema */}
          <button
            type="button"
            className="btn-logoff"
            onClick={handleLogoff}
            title="Cerrar sesión actual e invalidar token"
          >
            <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="dashboard-main">
        {/* Selector de Secciones Principales */}
        <div className="sections-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${seccionActiva === 'emitir' ? 'active' : ''}`}
            onClick={() => setSeccionActiva('emitir')}
          >
            <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Emitir un nuevo título</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${seccionActiva === 'listado' ? 'active' : ''}`}
            onClick={() => setSeccionActiva('listado')}
          >
            <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Ver listado de títulos emitidos</span>
            {titulos.length > 0 && <span className="tab-count-badge">{titulos.length}</span>}
          </button>
        </div>

        {/* ======================================================== */}
        {/* SECCIÓN 1: EMITIR UN NUEVO TÍTULO                         */}
        {/* ======================================================== */}
        {seccionActiva === 'emitir' && (
          <div className="card-section">
            <div className="card-section-header">
              <div>
                <h2 className="section-title">Emitir un Nuevo Título Académico</h2>
                <p className="section-description">
                  Capture los datos del graduando para registrar y emitir la credencial universitaria en la base de datos.
                </p>
              </div>
              <div className="module-phase-tag">Emisión y QR Automático</div>
            </div>

            {/* Mensajes de resultado */}
            {mensajeEmision && (
              <div className={mensajeEmision.tipo === 'exito' ? 'alert-success' : 'alert-error'}>
                {mensajeEmision.texto}
              </div>
            )}

            {/* Formulario de Emisión */}
            <form onSubmit={handleSubmitEmision} className="emision-form-grid">
              {/* Folio / ID: estrictamente NO modificable por el administrador */}
              <div className="form-field-item">
                <div className="label-with-badge">
                  <label className="form-label" htmlFor="titulo-id">
                    Identificador / Folio del Título
                  </label>
                  <span className="badge-readonly">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    No modificable
                  </span>
                </div>
                <div className="input-with-icon">
                  <svg className="field-icon field-icon-lock" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    id="titulo-id"
                    type="text"
                    className="form-input input-readonly"
                    value={formData.id}
                    readOnly
                    tabIndex={-1}
                    title="Este identificador es generado automáticamente por el sistema y no puede modificarse"
                  />
                </div>
                <span className="field-hint">Generado automáticamente por el protocolo institucional.</span>
              </div>

              <div className="form-field-item">
                <label className="form-label" htmlFor="titulo-carrera">
                  Carrera Profesional
                </label>
                <select
                  id="titulo-carrera"
                  className="form-select"
                  value={formData.carrera}
                  onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                >
                  <option value="Ingeniería en Ciencias y Sistemas">Ingeniería en Ciencias y Sistemas</option>
                  <option value="Ingeniería Civil">Ingeniería Civil</option>
                  <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                  <option value="Ingeniería Mecánica">Ingeniería Mecánica</option>
                  <option value="Ingeniería Química">Ingeniería Química</option>
                  <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                </select>
              </div>

              <div className="form-field-item full-width">
                <label className="form-label" htmlFor="titulo-nombre">
                  Nombre Completo del Graduando
                </label>
                <input
                  id="titulo-nombre"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Gustavo Adolfo Argueta Gudiel"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-field-item">
                <label className="form-label" htmlFor="titulo-cui">
                  Código Único de Identificación (CUI / Carné)
                </label>
                <input
                  id="titulo-cui"
                  type="text"
                  className="form-input"
                  placeholder="Ej. 2999010100101"
                  value={formData.cui}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  required
                />
              </div>

              <div className="form-field-item">
                <label className="form-label" htmlFor="titulo-fecha">
                  Fecha de Graduación / Emisión
                </label>
                <input
                  id="titulo-fecha"
                  type="date"
                  className="form-input"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="form-field-item full-width">
                <label className="form-label">
                  Documento PDF Oficial del Título (Opcional)
                </label>
                <div className="file-upload-box">
                  <input
                    type="file"
                    id="titulo-archivo"
                    accept="application/pdf,image/*"
                    className="file-hidden-input"
                    onChange={handleArchivoChange}
                  />
                  <label htmlFor="titulo-archivo" className="file-upload-label">
                    <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="upload-prompt">
                      {archivoSeleccionado
                        ? `Archivo cargado: ${archivoSeleccionado.name} (${(archivoSeleccionado.size / 1024).toFixed(1)} KB)`
                        : 'Haga clic para adjuntar el archivo PDF del título'}
                    </span>
                    <span className="upload-requirements">
                      Si no adjunta un archivo, el sistema generará automáticamente el certificado digital oficial con QR.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-actions-row full-width">
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={loadingEmision}
                >
                  {loadingEmision ? (
                    <span>Generando QR y Registrando...</span>
                  ) : (
                    <span>Registrar y Emitir Título</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECCIÓN 2: VER LISTADO DE TÍTULOS EMITIDOS                 */}
        {/* ======================================================== */}
        {seccionActiva === 'listado' && (
          <div className="card-section">
            <div className="card-section-header">
              <div>
                <h2 className="section-title">Listado de Títulos Emitidos</h2>
                <p className="section-description">
                  Historial de registros académicos con visualización y descarga de Código QR y Título.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={cargarTitulos}
                disabled={loadingTitulos}
              >
                <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loadingTitulos ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            </div>

            {/* Barra de Filtro / Búsqueda */}
            <div className="search-filter-wrapper">
              <div className="input-with-icon">
                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="Buscar por nombre, CUI, carrera o identificador de título..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
            </div>

            {errorTitulos && (
              <div className="alert-error">
                {errorTitulos}
              </div>
            )}

            {/* Tabla de Resultados */}
            {loadingTitulos ? (
              <div className="table-loading-container">
                <div className="spinner"></div>
                <p>Cargando catálogo de títulos emitidos...</p>
              </div>
            ) : titulosFiltrados.length === 0 ? (
              <div className="empty-state-card">
                <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="empty-state-title">No se encontraron títulos emitidos</h3>
                <p className="empty-state-desc">
                  {filtro
                    ? 'No hay registros que coincidan con el término de búsqueda ingresado.'
                    : 'Aún no se ha registrado ningún título en la plataforma. Puede emitir el primero desde la pestaña "Emitir un nuevo título".'}
                </p>
                {!filtro && (
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => setSeccionActiva('emitir')}
                  >
                    Emitir el Primer Título
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive-container">
                <table className="titulos-table">
                  <thead>
                    <tr>
                      <th>Identificador</th>
                      <th>Graduando</th>
                      <th>CUI / Carné</th>
                      <th>Carrera</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones y Documentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulosFiltrados.map((t) => (
                      <tr key={t.id}>
                        <td className="cell-id">
                          <code>{t.id}</code>
                        </td>
                        <td className="cell-name">
                          <strong>{t.nombre}</strong>
                        </td>
                        <td>{t.cui}</td>
                        <td className="cell-carrera">{t.carrera}</td>
                        <td>{t.fecha}</td>
                        <td>
                          <span className="badge-status-active">
                            {t.estado || 'ACTIVO'}
                          </span>
                        </td>
                        {/* 2 Botones por registro: "Codigo QR" y "Titulo" */}
                        <td className="cell-actions-dual">
                          <button
                            type="button"
                            className="btn-action-qr"
                            onClick={() => setModalQR(t)}
                            title="Ver y descargar el Código QR de verificación"
                          >
                            <svg className="btn-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Código QR</span>
                          </button>

                          <button
                            type="button"
                            className="btn-action-doc"
                            onClick={() => setModalTitulo(t)}
                            title="Ver y descargar el Título Académico"
                          >
                            <svg className="btn-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Título</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* POPUP / MODAL: CÓDIGO QR                                  */}
      {/* ======================================================== */}
      {modalQR && (
        <div className="modal-backdrop" onClick={() => setModalQR(null)}>
          <div className="modal-container modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="modal-subtitle">Verificación Pública</span>
                <h3 className="modal-title">Código QR del Título</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalQR(null)}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body modal-body-center">
              <div className="qr-preview-card">
                {modalQR.qr_imagen ? (
                  <img
                    src={modalQR.qr_imagen}
                    alt={`Código QR para título ${modalQR.id}`}
                    className="modal-qr-image"
                  />
                ) : (
                  <div className="qr-placeholder">Código QR no disponible</div>
                )}
                <div className="qr-tag-folio">
                  Folio: <code>{modalQR.id}</code>
                </div>
              </div>

              <div className="qr-meta-details">
                <p><strong>Graduando:</strong> {modalQR.nombre}</p>
                <p><strong>CUI:</strong> {modalQR.cui}</p>
                <p><strong>Carrera:</strong> {modalQR.carrera}</p>
                <p><strong>Fecha:</strong> {modalQR.fecha}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setModalQR(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="btn-modal-download"
                onClick={() => handleDescargarQR(modalQR)}
                disabled={!modalQR.qr_imagen}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Descargar QR (.png)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP / MODAL: TÍTULO ACADÉMICO                           */}
      {/* ======================================================== */}
      {modalTitulo && (
        <div className="modal-backdrop" onClick={() => setModalTitulo(null)}>
          <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="modal-subtitle">Documento Oficial</span>
                <h3 className="modal-title">Título Académico Universitario</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalTitulo(null)}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="title-preview-header">
                <div>
                  <strong>{modalTitulo.nombre}</strong> — {modalTitulo.carrera}
                </div>
                <div className="badge-folio-modal">
                  Folio: {modalTitulo.id}
                </div>
              </div>

              <div className="doc-preview-wrapper">
                {modalTitulo.titulo_archivo ? (
                  modalTitulo.titulo_archivo_tipo === 'application/pdf' ? (
                    <iframe
                      src={modalTitulo.titulo_archivo}
                      title={`Documento PDF de ${modalTitulo.nombre}`}
                      className="doc-iframe"
                    />
                  ) : (
                    <img
                      src={modalTitulo.titulo_archivo}
                      alt={`Certificado de ${modalTitulo.nombre}`}
                      className="doc-rendered-image"
                    />
                  )
                ) : (
                  <div className="doc-empty-state">
                    No hay documento o imagen cargada para este título.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setModalTitulo(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="btn-modal-download"
                onClick={() => handleDescargarTitulo(modalTitulo)}
                disabled={!modalTitulo.titulo_archivo}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>
                  Descargar Título {modalTitulo.titulo_archivo_tipo === 'application/pdf' ? '(.pdf)' : '(.svg)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer className="dashboard-footer">
        Facultad de Ingeniería • Escuela de Ingeniería en Ciencias y Sistemas • USAC 2026
      </footer>
    </div>
  );
}
