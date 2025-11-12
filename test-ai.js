/**
 * Script de prueba para verificar que Google Gemini funciona
 * Ejecutar: node test-ai.js
 */

require('dotenv').config();
const aiAgent = require('./aiAgent');

async function probarIA() {
  try {
    console.log('🤖 Probando Google Gemini AI...\n');

    // Simular una conversación
    const mensajes = [
      {
        role: 'user',
        content: 'Hola, necesito cotizar 5 laptops empresariales'
      }
    ];

    console.log('Usuario: Hola, necesito cotizar 5 laptops empresariales\n');

    // Primera respuesta del agente
    const respuesta1 = await aiAgent.chatWithUser(mensajes);
    console.log('Asistente:', respuesta1);
    console.log('\n---\n');

    // Agregar respuesta al historial
    mensajes.push({
      role: 'assistant',
      content: respuesta1
    });

    // Segunda interacción
    mensajes.push({
      role: 'user',
      content: 'Core i7, 16GB RAM, y un monitor de 27 pulgadas para cada una'
    });

    console.log('Usuario: Core i7, 16GB RAM, y un monitor de 27 pulgadas para cada una\n');

    const respuesta2 = await aiAgent.chatWithUser(mensajes);
    console.log('Asistente:', respuesta2);
    console.log('\n---\n');

    // Agregar al historial
    mensajes.push({
      role: 'assistant',
      content: respuesta2
    });

    // Generar cotización
    console.log('🔄 Generando cotización final...\n');

    const cotizacion = await aiAgent.generateQuotation(mensajes);

    console.log('✅ Cotización generada:');
    console.log(JSON.stringify(cotizacion, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('API key')) {
      console.log('\n💡 Asegúrate de configurar tu GEMINI_API_KEY en el archivo .env');
      console.log('   Puedes obtener una en: https://makersuite.google.com/app/apikey');
    }

    process.exit(1);
  }
}

// Verificar que existe la API key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: No se encontró GEMINI_API_KEY en el archivo .env');
  console.log('\n💡 Pasos para configurar:');
  console.log('1. Abre el archivo .env');
  console.log('2. Agrega tu API key: GEMINI_API_KEY=tu_api_key_aqui');
  console.log('3. Obtén tu API key en: https://makersuite.google.com/app/apikey');
  process.exit(1);
}

probarIA();
