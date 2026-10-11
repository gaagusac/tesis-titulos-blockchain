import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Si ya está autenticado, redirigir al panel de administración
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación local de campos requeridos
    if (!usuario.trim() || !password) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(usuario.trim(), password);
      // Redirección exitosa a la página de administración de títulos
      navigate('/admin', { replace: true });
    } catch (err) {
      // Notificar al usuario y permanecer en la pantalla de login para reintentar
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Cabecera Institucional */}
        <div className="login-header">
          <div className="institution-badge">USAC • INGENIERÍA</div>
          <h1 className="login-title">Portal de Gestión de Títulos</h1>
          <p className="login-subtitle">
            Sistema para la Emisión y Registro Inmutable de Credenciales Académicas
          </p>
        </div>

        {/* Mensaje de Error en caso de credenciales incorrectas */}
        {error && (
          <div className="alert-error" role="alert">
            <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="alert-content">
              <strong>Error de autenticación:</strong>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usuario" className="form-label">
              Usuario o Correo Institucional
            </label>
            <div className="input-with-icon">
              <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                id="usuario"
                type="text"
                className="form-input"
                placeholder="Ej. admin"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setMostrarPassword(!mostrarPassword)}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="input-with-icon">
              <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="password"
                type={mostrarPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading-text">
                <span className="spinner-small"></span>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Panel informativo de credenciales para demostración */}
        <div className="demo-credentials-card">
          <div className="demo-credentials-title">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Credenciales de Administrador en SQLite
          </div>
          <div className="demo-credentials-grid">
            <div>
              <span className="demo-label">Usuario:</span> <code>admin</code>
            </div>
            <div>
              <span className="demo-label">Contraseña:</span> <code>admin123</code>
            </div>
          </div>
        </div>

        <div className="login-footer">
          Facultad de Ingeniería • Universidad de San Carlos de Guatemala • 2026
        </div>
      </div>
    </div>
  );
}
