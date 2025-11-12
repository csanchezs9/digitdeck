/**
 * Script para probar el flujo completo sin WhatsApp
 * Simula las respuestas del usuario y genera el PDF
 */

require('dotenv').config();
const aiAgent = require('./aiAgent');
const pdfGenerator = require('./pdfGenerator');

async function testFlujoCotizacion() {
  console.log('🧪 Iniciando prueba del flujo completo de cotización\n');

  // Simular datos del formulario como si el usuario hubiera respondido
  const formData = {
    nombreEmpresa: 'TechStore Colombia',
    actividadEmpresa: 'Venta de productos tecnológicos y electrónicos',
    problemaNecesidad: 'No tenemos presencia digital y queremos vender online',
    tieneEcommerce: 'No',
    tipoPropuesta: 'Desarrollo de tienda en Shopify'
  };

  console.log('📋 Datos del formulario:');
  console.log(JSON.stringify(formData, null, 2));
  console.log('\n⏳ Generando propuesta con Google Gemini...\n');

  try {
    // Generar propuesta con IA
    const propuestaData = await aiAgent.generateQuotationFromForm(formData);

    console.log('✅ Propuesta generada exitosamente!');
    console.log('\n📄 Resumen de la propuesta:');
    console.log(`- ID: ${propuestaData.metadata.id}`);
    console.log(`- Cliente: ${propuestaData.metadata.cliente}`);
    console.log(`- Tipo: ${propuestaData.metadata.tipo}`);
    console.log(`- Inversión: ${propuestaData.inversion.total}`);
    console.log(`- Duración: ${propuestaData.inversion.duracion}`);

    console.log('\n⏳ Generando PDF...\n');

    // Generar PDF
    const pdfPath = await pdfGenerator.createQuotationPDF(propuestaData, 'test_573173745021');

    console.log('\n✅ ¡TODO COMPLETADO EXITOSAMENTE!');
    console.log(`\n📂 PDF generado en: ${pdfPath}`);
    console.log('\n🎉 El flujo completo funciona correctamente!');
    console.log('   Cuando tu número esté en la lista de pruebas,');
    console.log('   recibirás PDFs como este directamente en WhatsApp.\n');

  } catch (error) {
    console.error('\n❌ Error en el flujo:', error.message);
    console.error('\nDetalles del error:', error);
  }
}

// Ejecutar prueba
testFlujoCotizacion();
