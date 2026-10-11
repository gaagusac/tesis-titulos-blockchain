/**
 * Generador de diseño de Título / Diploma Académico Oficial en formato SVG
 * Universidad de San Carlos de Guatemala - Facultad de Ingeniería
 */

function generarCertificadoSVG({ id, nombre, cui, carrera, fecha, qrDataUrl }) {
  const fechaFormateada = fecha || new Date().toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 640" width="900" height="640">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d4af37" />
      <stop offset="50%" stop-color="#aa7c11" />
      <stop offset="100%" stop-color="#ffd700" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Fondo Pergamino / Papel de Seguridad -->
  <rect width="900" height="640" fill="#fdfbf7" />

  <!-- Marco Exterior Dorado -->
  <rect x="20" y="20" width="860" height="600" fill="none" stroke="url(#goldGrad)" stroke-width="12" rx="10" />
  
  <!-- Marco Interior Azul Institucional -->
  <rect x="36" y="36" width="828" height="568" fill="none" stroke="#0b2545" stroke-width="3" rx="6" />
  <rect x="42" y="42" width="816" height="556" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="6,4" />

  <!-- Encabezado Institucional -->
  <text x="450" y="90" font-family="'Times New Roman', Times, serif" font-size="24" font-weight="bold" fill="#07172b" text-anchor="middle" letter-spacing="1">
    UNIVERSIDAD DE SAN CARLOS DE GUATEMALA
  </text>
  
  <text x="450" y="120" font-family="'Helvetica Neue', Arial, sans-serif" font-size="16" font-weight="700" fill="#aa7c11" text-anchor="middle" letter-spacing="3">
    FACULTAD DE INGENIERÍA
  </text>

  <line x1="280" y1="135" x2="620" y2="135" stroke="url(#goldGrad)" stroke-width="2.5" />

  <!-- Texto de Certificación -->
  <text x="450" y="180" font-family="'Times New Roman', Times, serif" font-size="16" font-style="italic" fill="#475569" text-anchor="middle">
    La Junta Directiva de la Facultad de Ingeniería hace constar que:
  </text>

  <!-- Nombre del Graduando -->
  <text x="450" y="235" font-family="'Times New Roman', Times, serif" font-size="30" font-weight="bold" fill="#0b2545" text-anchor="middle">
    ${nombre}
  </text>

  <text x="450" y="268" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="600" fill="#64748b" text-anchor="middle">
    CUI / Carné: ${cui}
  </text>

  <text x="450" y="312" font-family="'Times New Roman', Times, serif" font-size="16" font-style="italic" fill="#475569" text-anchor="middle">
    Ha cumplido con todos los requisitos académicos para ostentar el grado y título profesional de:
  </text>

  <!-- Carrera Profesional -->
  <text x="450" y="360" font-family="'Times New Roman', Times, serif" font-size="26" font-weight="bold" fill="#07172b" text-anchor="middle">
    ${carrera}
  </text>

  <text x="450" y="400" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" fill="#334155" text-anchor="middle">
    Emitido el: ${fechaFormateada}
  </text>

  <!-- Código QR de Verificación Integrado -->
  ${qrDataUrl ? `
  <g transform="translate(385, 420)">
    <rect width="130" height="130" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6" filter="url(#shadow)" />
    <image x="5" y="5" width="120" height="120" href="${qrDataUrl}" />
  </g>
  <text x="450" y="565" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">
    Escanear para Verificación Pública
  </text>
  ` : ''}

  <!-- Firmas Institucionales -->
  <g transform="translate(110, 480)">
    <line x1="0" y1="40" x2="200" y2="40" stroke="#0b2545" stroke-width="1.5" />
    <text x="100" y="58" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" fill="#0b2545" text-anchor="middle">Decano</text>
    <text x="100" y="72" font-family="'Helvetica Neue', Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Facultad de Ingeniería</text>
  </g>

  <g transform="translate(590, 480)">
    <line x1="0" y1="40" x2="200" y2="40" stroke="#0b2545" stroke-width="1.5" />
    <text x="100" y="58" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" fill="#0b2545" text-anchor="middle">Secretario Académico</text>
    <text x="100" y="72" font-family="'Helvetica Neue', Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Facultad de Ingeniería</text>
  </g>

  <!-- Pie de página con Folio -->
  <text x="450" y="598" font-family="monospace" font-size="12" font-weight="bold" fill="#aa7c11" text-anchor="middle">
    Folio de Registro Oficial: ${id} • USAC INGENIERÍA
  </text>
</svg>
`.trim();

  return 'data:image/svg+xml;base64,' + Buffer.from(svgContent, 'utf-8').toString('base64');
}

module.exports = {
  generarCertificadoSVG
};
