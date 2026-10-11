import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Verificar from './pages/Verificar';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas de Verificación de Títulos */}
          <Route path="/verificar" element={<Verificar />} />
          <Route path="/verificar/:id" element={<Verificar />} />

          {/* Ruta pública de Login para Administradores */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas por autenticación JWT */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/verificar" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
