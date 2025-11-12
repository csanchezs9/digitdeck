const puppeteer = require('puppeteer');
const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');

/**
 * Convierte una imagen a base64 para embedear en HTML
 */
function imageToBase64(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️ Imagen no encontrada: ${imagePath}`);
      return null;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error(`❌ Error convirtiendo imagen ${imagePath}:`, error);
    return null;
  }
}

/**
 * Carga las imágenes del carrusel como base64
 */
function loadCarouselImages() {
  const imageDir = path.join(__dirname, 'imagenes');
  const images = [];

  for (let i = 1; i <= 6; i++) {
    const imagePath = path.join(imageDir, `carousel${i}.png`);
    const base64 = imageToBase64(imagePath);
    if (base64) {
      images.push(base64);
    }
  }

  console.log(`✅ ${images.length} imágenes del carrusel cargadas`);
  return images;
}

/**
 * Crea un PDF de propuesta profesional usando Puppeteer
 */
async function createQuotationPDF(propuestaData, customerPhone) {
  let browser;

  try {
    // Usar directorio temporal del sistema
    const os = require('os');
    const outputDir = path.join(os.tmpdir(), 'digitdeck-pdfs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `Propuesta_${propuestaData.metadata.cliente.replace(/\s/g, '_')}_${propuestaData.metadata.id}.pdf`;
    const filePath = path.join(outputDir, fileName);

    // Generar HTML para el PDF
    const htmlContent = generateProposalHTML(propuestaData);

    // Detectar si estamos en producción (Render) o desarrollo local
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    // Iniciar Puppeteer con configuración según el entorno
    if (isProduction) {
      // En producción (Render) usar chromium
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      });
    } else {
      // En desarrollo local usar puppeteer normal
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();

    // Cargar el HTML
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generar el PDF
    await page.pdf({
      path: filePath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    await browser.close();

    console.log(`✅ PDF de propuesta generado: ${fileName}`);
    return filePath;

  } catch (error) {
    console.error('❌ Error creando PDF:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Genera el HTML para la propuesta profesional
 */
function generateProposalHTML(data) {
  // Cargar imágenes del carrusel
  const carouselImages = loadCarouselImages();

  // Generar secciones HTML
  const objetivosEspecificosHTML = data.objetivoDelProyecto.objetivosEspecificos
    .map((obj, i) => `<li>${i + 1}. ${obj}</li>`)
    .join('\n');

  const equipoMiembrosHTML = data.equipoResponsable.miembros
    .map(miembro => `
      <div class="equipo-miembro">
        <h4>${miembro.rol}:</h4>
        <p>${miembro.descripcion}</p>
      </div>
    `)
    .join('\n');

  const porQueParrafosHTML = data.porQueDigitDeck.parrafos
    .map(parrafo => `<p>${parrafo}</p>`)
    .join('\n\n');

  const entregablesHTML = data.entregables.items
    .map((item, i) => `<li>${i + 1}. ${item}</li>`)
    .join('\n');

  const cronogramaHTML = data.inversion.cronograma
    .map((fase, i) => `<li>${i + 1}. ${fase.fase} – ${fase.descripcion}</li>`)
    .join('\n');

  const incluyeHTML = data.inversion.incluye
    .map(item => `<li>${item}</li>`)
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Propuesta ${data.metadata.cliente}</title>
  <style>
    @page {
      size: Letter;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .page {
      width: 8.5in;
      min-height: 11in;
      padding: 50px 60px;
      page-break-after: always;
      position: relative;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 50px;
      padding-bottom: 15px;
      border-bottom: 2px solid #7c3aed;
    }

    .logo {
      font-size: 28px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .logo-d {
      color: #000;
      font-size: 36px;
    }

    .logo-dot {
      color: #7c3aed;
      font-size: 36px;
    }

    .company-name {
      font-size: 11px;
      color: #333;
      letter-spacing: 1.5px;
      font-weight: normal;
    }

    .section-title {
      font-size: 28px;
      font-weight: bold;
      color: #000;
      margin-bottom: 30px;
      margin-top: 0;
      padding-left: 20px;
      border-left: 6px solid #7c3aed;
      text-transform: uppercase;
    }

    .portada {
      min-height: 11in;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding-left: 0;
    }

    .portada .header {
      position: absolute;
      top: 50px;
      left: 60px;
      right: 60px;
      margin-bottom: 0;
    }

    .portada-content {
      z-index: 2;
      position: relative;
      padding-left: 30px;
      border-left: 6px solid #7c3aed;
      max-width: 600px;
    }

    .portada h1 {
      font-size: 24px;
      color: #666;
      margin-bottom: 15px;
      letter-spacing: 3px;
      font-weight: normal;
      text-transform: uppercase;
    }

    .portada h2 {
      font-size: 72px;
      font-weight: 900;
      color: #000;
      margin-bottom: 50px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: -1px;
    }

    .portada-descripcion {
      font-size: 14px;
      color: #333;
      line-height: 1.8;
      max-width: 500px;
      text-align: left;
    }

    .icon-section {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .icon-section svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .decorative-lines {
      position: absolute;
      right: -50px;
      top: 0;
      height: 100%;
      width: 300px;
      opacity: 0.7;
    }

    .decorative-lines svg {
      height: 100%;
      width: 100%;
    }

    p {
      margin-bottom: 15px;
      text-align: left;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
    }

    ul, ol {
      margin-left: 20px;
      margin-bottom: 20px;
    }

    li {
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 1.7;
      color: #333;
    }

    .equipo-miembro {
      margin-bottom: 20px;
    }

    .equipo-miembro h4 {
      font-size: 15px;
      font-weight: bold;
      color: #000;
      margin-bottom: 8px;
    }

    .equipo-miembro p {
      font-size: 14px;
      color: #333;
      margin-left: 10px;
      text-align: left;
    }

    .inversion-box {
      background: transparent;
      padding: 0;
      border-radius: 0;
      margin: 30px 0;
    }

    .inversion-total {
      font-size: 18px;
      font-weight: bold;
      color: #000;
      margin-bottom: 5px;
    }

    .inversion-duracion {
      font-size: 14px;
      color: #333;
      margin-bottom: 30px;
    }

    h3 {
      font-size: 16px;
      font-weight: bold;
      color: #000;
      margin: 20px 0 15px 0;
    }

    .image-gallery {
      display: none;
    }

    .image-gallery img {
      display: none;
    }

    .hero-image {
      width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 0;
      margin: 30px 0;
      box-shadow: none;
    }

    .page-number {
      position: absolute;
      bottom: 20px;
      right: 50px;
      font-size: 10px;
      color: #999;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="page portada">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="portada-content">
      <h1>PROPUESTA</h1>
      <h2>PROYECTO</h2>
      <div class="portada-descripcion">
        ${data.portada.subtitulo}
      </div>
    </div>

    <div class="decorative-lines">
      <svg viewBox="0 0 300 800" preserveAspectRatio="none">
        ${Array.from({length: 15}, (_, i) =>
          `<path d="M ${50 + i * 15} 0 Q ${150 + i * 15} 400 ${50 + i * 15} 800"
                 stroke="#7c3aed" stroke-width="2" fill="none" opacity="${0.3 + i * 0.05}"/>`
        ).join('')}
      </svg>
    </div>
  </div>

  <!-- OBJETIVO DEL PROYECTO -->
  <div class="page">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="icon-section">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-11h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    </div>
    <div class="section-title">OBJETIVO DEL PROYECTO</div>

    <p>${data.objetivoDelProyecto.objetivoPrincipal}</p>

    <h3>Los objetivos específicos incluyen:</h3>
    <ol>
      ${objetivosEspecificosHTML}
    </ol>

    <p>${data.objetivoDelProyecto.resumen}</p>
  </div>

  <!-- EQUIPO RESPONSABLE -->
  <div class="page">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="section-title">EQUIPO RESPONSABLE DEL PROYECTO</div>

    <p>${data.equipoResponsable.introduccion}</p>

    ${equipoMiembrosHTML}

    <p>${data.equipoResponsable.cierre}</p>
  </div>

  <!-- POR QUÉ DIGIT DECK -->
  <div class="page">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="section-title">¿POR QUÉ DIGIT DECK AGENCY SAS?</div>

    ${porQueParrafosHTML}
  </div>

  <!-- ENTREGABLES -->
  <div class="page">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="section-title">ENTREGABLES</div>

    <ol>
      ${entregablesHTML}
    </ol>
  </div>

  <!-- INVERSIÓN -->
  <div class="page">
    <div class="header">
      <div class="logo">
        <span class="logo-d">D</span><span class="logo-dot">.</span>
        <span class="company-name">DIGIT DECK AGENCY SAS</span>
      </div>
    </div>

    <div class="section-title">INVERSIÓN</div>

    <div class="inversion-box">
      <div class="inversion-total">Inversión total: ${data.inversion.total}</div>
      <div class="inversion-duracion">Duración total del proyecto: ${data.inversion.duracion}</div>

      <h3>Cronograma:</h3>
      <ol>
        ${cronogramaHTML}
      </ol>

      <h3>Incluye:</h3>
      <ul>
        ${incluyeHTML}
      </ul>
    </div>
  </div>

</body>
</html>
  `;
}

module.exports = {
  createQuotationPDF
};
