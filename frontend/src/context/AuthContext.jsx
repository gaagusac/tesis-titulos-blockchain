import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token_jwt'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validar el token almacenado al cargar la aplicación
  useEffect(() => {
    const validarTokenExistente = async () => {
      const storedToken = localStorage.getItem('token_jwt');
      if (!storedToken) {
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      try {
        const data = await apiService.verifySession();
        if (data.valid && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } catch (error) {
        console.warn('[AuthProvider] Sesión previa expirada o inválida.');
        logout();
      } finally {
        setLoading(false);
      }
    };

    validarTokenExistente();
  }, []);

  // Función de inicio de sesión
  const login = async (usuario, password) => {
    try {
      const data = await apiService.login(usuario, password);
      if (data.token) {
        localStorage.setItem('token_jwt', data.token);
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true, user: data.user };
      }
      throw new Error('Respuesta del servidor incompleta (no contiene token).');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Error de autenticación';
      throw new Error(errorMsg);
    }
  };

  // Función de cierre de sesión (Logoff)
  const logout = () => {
    localStorage.removeItem('token_jwt');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
