/**
 * Script de prueba para generar un PDF de ejemplo
 * Ejecutar: node test-pdf.js
 */

const pdfGenerator = require('./pdfGenerator');

// Datos de prueba para la cotización
const cotizacionPrueba = {
  id: `COT-${Date.now()}`,
  fecha: new Date().toLocaleDateString('es-ES'),
  cliente: {
    nombre: 'Juan Pérez',
    empresa: 'Empresa Demo S.A. de C.V.'
  },
  items: [
    {
      descripcion: 'Computadora Dell Core i7, 16GB RAM, SSD 512GB',
      cantidad: 10,
      precioUnitario: 15000,
      total: 150000
    },
    {
      descripcion: 'Monitor LG 27" Full HD',
      cantidad: 10,
      precioUnitario: 3500,
      total: 35000
    },
    {
      descripcion: 'Teclado y Mouse Logitech',
      cantidad: 10,
      precioUnitario: 800,
      total: 8000
    }
  ],
  subtotal: 193000,
  iva: 30880,
  total: 223880,
  notas: 'Precios incluyen instalación y configuración. Garantía de 1 año en todos los equipos. Tiempo de entrega: 15 días hábiles.',
  validez: '30 días'
};

async function generarPDFPrueba() {
  try {
    console.log('🔄 Generando PDF de prueba...');

    const filePath = await pdfGenerator.createQuotationPDF(
      cotizacionPrueba,
      'test_12345'
    );

    console.log('✅ PDF generado exitosamente!');
    console.log(`📄 Archivo: ${filePath}`);
    console.log('\nPuedes encontrar el PDF en el directorio ./pdfs/');

  } catch (error) {
    console.error('❌ Error generando PDF:', error.message);
    process.exit(1);
  }
}

generarPDFPrueba();
