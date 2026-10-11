# Sistema para la Emisión y Registro de Credenciales Académicas

Sistema web desarrollado para la emisión, registro y verificación de títulos universitarios de la **Facultad de Ingeniería, Universidad de San Carlos de Guatemala (USAC)**.

El sistema se estructura en dos componentes principales desacoplados:
- **`backend/`**: API RESTful construida con Express.js, autenticación basada en JSON Web Tokens (JWT), base de datos embebida SQLite y endpoints para el ciclo de vida de los títulos.
- **`chaincode/`**: Contrato inteligente(chaincode) para la emision y verificaion de titulos en la blockchain.
- **`network/`**: Scripts para el condicionamiento y ejecucion de la Blockchain.
- **`frontend/`**: Aplicación de Página Única (Single Page Application - SPA) con React, React Router y estilos institucionales responsivos.

---

## 📁 Estructura del Proyecto

```text
tesis-blockchain/
├── chaincode/                      # Contrato inteligente
├── network/                        # Red Blockchain
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Lógica de login, emisión de JWT y verificación
│   │   └── titulosController.js    # Emisión y consulta de títulos académicos
│   ├── database/
│   │   ├── db.js                   # Inicialización de SQLite y schema
│   │   └── seed.js                 # Script para sembrado de usuarios
│   ├── middleware/
│   │   └── authMiddleware.js       # Validación de token Bearer JWT
│   ├── routes/
│   │   ├── authRoutes.js           # Rutas /api/auth
│   │   └── titulosRoutes.js        # Rutas /api/titulos
│   ├── test_api.js                 # Suite de pruebas automatizadas de integración
│   ├── server.js                   # Servidor Express principal
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── ProtectedRoute.jsx  # Guardián de rutas autenticadas (JWT)
    │   ├── context/
    │   │   └── AuthContext.jsx     # Estado global de sesión y autenticación
    │   ├── pages/
    │   │   ├── Login.jsx           # Pantalla de inicio de sesión de administradores
    │   │   └── AdminDashboard.jsx  # Panel con "Emitir nuevo título" y "Ver listado"
    │   ├── services/
    │   │   └── apiService.js       # Cliente Axios con interceptor de JWT
    │   ├── App.jsx                 # Configuración de enrutamiento
    │   ├── App.css                 # Estilos institucionales
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🔐 Seguridad y Autenticación

- **Base de Datos SQLite**: Almacena a los administradores autorizados en la tabla `administradores`.
- **Cifrado de Contraseñas**: Las contraseñas se almacenan mediante hash irreversible (`bcryptjs` con salt rounds = 10).
- **Tokens JWT**: Al autenticarse correctamente, el servidor firma un token JWT (`HS256`) con una vigencia de 24 horas.
- **Credenciales iniciales por defecto**:
  - **Usuario:** `admin`
  - **Contraseña:** `admin123`
- **Configuración de Dominio / IP Pública para Códigos QR**:
  - En `backend/.env`, la variable `FRONTEND_URL` define el prefijo de la URL de verificación que se codifica en los códigos QR.
  - En desarrollo: `FRONTEND_URL=http://localhost:5173`
  - En producción: `FRONTEND_URL=http://tu-ip-o-dominio` (ej. `http://203.0.113.195` o `https://titulos.ingenieria.usac.edu.gt`)
  - Para actualizar masivamente todos los códigos QR ya existentes en la base de datos a un nuevo dominio/IP:
    ```bash
    cd backend
    npm run actualizar-qr http://tu-nueva-ip-o-dominio
    ```

---

## 🚀 Instrucciones para Iniciar el Sistema

### 1. Iniciar el Backend (API)
Abra una terminal en la carpeta `backend`:
```bash
cd backend
npm install
npm run dev
```
El servidor backend se ejecutará en: **`http://localhost:4000`**

Para ejecutar la suite de pruebas automatizadas del backend:
```bash
npm test
```

### 2. Iniciar el Frontend (Interfaz Web)
Abra una segunda terminal en la carpeta `frontend`:
```bash
cd frontend
npm install
npm run dev
```
La aplicación web se ejecutará en: **`http://localhost:5173`**

---

## 🖥️ Flujo de Navegación y Pantallas

1. **Pantalla de Inicio de Sesión (`/login`)**:
   - Si un usuario no autenticado intenta entrar a cualquier ruta de gestión, es redirigido automáticamente aquí.
   - Si ingresa credenciales erróneas, se le muestra una notificación de error en pantalla para que vuelva a intentarlo.
   - Si ingresa las credenciales válidas, recibe su token JWT y es redirigido al panel de administración.

2. **Página de Administración de Títulos (`/admin`)**:
   - **Emitir un nuevo título:** Formulario para registrar credenciales académicas con **Folio / ID no modificable** (generado automáticamente por el sistema). Al emitir, el backend genera un código QR de verificación oficial y lo almacena junto al documento en SQLite.
   - **Ver listado de títulos emitidos:** Tabla interactiva con búsqueda en tiempo real. Cada registro dispone de **dos botones de acción**:
     - **Botón "Código QR":** Despliega un popup con la imagen del código QR y los metadatos del egresado, además de un botón para **descargar la imagen del QR (.png) al PC**.
     - **Botón "Título":** Despliega un popup con la visualización del documento del título (PDF o certificado oficial), además de un botón para **descargar el archivo del título al PC**.
   - **Botón de Cerrar Sesión (Logoff):** Ubicado en la barra superior. Invalida la sesión eliminando el token JWT y redirige de inmediato a la pantalla de login.

3. **Portal Público de Verificación (`/verificar`)**:
   - **Modalidad 1 (Subida de Imagen QR):** Permite subir una imagen del código QR; extrae los datos y valida el título en la base de datos.
   - **Modalidad 2 (Carga de Documento PDF):** Calcula la huella digital criptográfica (SHA-256) del PDF cargado y la coteja contra el hash original emitido para certificar integridad y detectar falsificaciones.
   - **Modalidad 3 (CUI y Carrera):** Consulta directa por el documento de identificación y carrera del graduando.
   - **Modalidad 4 (Escaneo Directo por Teléfono Móvil):** Al escanear el código QR con cualquier teléfono inteligente, la URL (`/verificar?id=...`) detecta el folio automáticamente y despliega de inmediato la validación oficial.
   - **Auditoría con UUID:** Toda consulta exitosa o fallida genera un identificador único **UUID v4 de transacción**, el cual se persiste en la tabla SQLite `verificaciones` con su fecha, hora, método y resultado.
