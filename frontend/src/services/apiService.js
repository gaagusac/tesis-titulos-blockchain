import axios from 'axios';

// Instancia de Axios con URL base para la API
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de peticiones HTTP para adjuntar el JWT de autenticación
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token_jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas para detectar expiración de sesión (401/403)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Si la sesión no es válida y no estamos en la página de login
      if (!window.location.pathname.includes('/login')) {
        console.warn('[API Interceptor] Sesión inválida o expirada. Redirigiendo a /login...');
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Autenticación de Administrador (CU-03)
  login: async (usuario, password) => {
    const response = await API.post('/auth/login', {
      usuario,
      password
    });
    return response.data;
  },

  // Verificación de validez del token y sesión activa
  verifySession: async () => {
    const response = await API.get('/auth/verify');
    return response.data;
  },

  // Consulta de títulos emitidos (CU-02)
  consultarTitulos: async () => {
    const response = await API.get('/titulos');
    return response.data;
  },

  // Emisión de nuevo título (CU-01)
  emitirTitulo: async (datosTitulo) => {
    const response = await API.post('/titulos', datosTitulo);
    return response.data;
  },

  // Consulta pública por ID (CU-04)
  consultarPorId: async (id) => {
    const response = await API.get(`/titulos/${id}`);
    return response.data;
  },

  // Modalidad 1: Verificación mediante Código QR
  verificarPorQR: async ({ qrData, qrImageBase64 }) => {
    const response = await API.post('/verificar/qr', { qrData, qrImageBase64 });
    return response.data;
  },

  // Modalidad 2: Verificación mediante Archivo PDF (Hash SHA-256)
  verificarPorArchivo: async ({ archivoBase64, archivoNombre }) => {
    const response = await API.post('/verificar/archivo', { archivoBase64, archivoNombre });
    return response.data;
  },

  // Modalidad 3: Verificación mediante CUI y Carrera
  verificarPorCuiCarrera: async ({ cui, carrera }) => {
    const response = await API.post('/verificar/cui-carrera', { cui, carrera });
    return response.data;
  },

  // Modalidad 4: Verificación por ID Directo (Escaneo QR móvil o enlace)
  verificarPorIdDirecto: async (id) => {
    const response = await API.get(`/verificar/id/${encodeURIComponent(id)}`);
    return response.data;
  },

  // Historial de auditoría de verificaciones
  consultarHistorialVerificaciones: async () => {
    const response = await API.get('/verificar/historial');
    return response.data;
  }
};

export default apiService;
