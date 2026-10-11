import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente Guardián de Ruta Protegida (ProtectedRoute)
 * Evalúa la presencia y vigencia del JWT antes de renderizar la vista de gestión.
 * Si el usuario no está autenticado, lo redirige a la pantalla de login.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#475569', fontWeight: 500 }}>
          Verificando credenciales de acceso...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
