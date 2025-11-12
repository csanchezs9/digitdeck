/**
 * Script para probar solo la generación del PDF sin usar la IA
 * Usa datos de ejemplo para verificar que el PDF se genera correctamente
 */

const pdfGenerator = require('./pdfGenerator');

async function testPDFGeneration() {
  console.log('🧪 Iniciando prueba de generación de PDF solamente\n');

  // Datos de ejemplo simulando lo que la IA generaría
  const propuestaData = {
    metadata: {
      id: 'PROP-TEST-001',
      fecha: '11 de noviembre de 2025',
      cliente: 'TechStore Colombia',
      tipo: 'Desarrollo de tienda en Shopify'
    },
    portada: {
      subtitulo: 'Desarrollo de tienda eCommerce en Shopify para TechStore Colombia, especializada en productos tecnológicos y electrónicos.'
    },
    objetivoDelProyecto: {
      objetivoPrincipal: 'Desarrollar una tienda eCommerce profesional en Shopify que permita a TechStore Colombia establecer una presencia digital sólida y comenzar a vender sus productos tecnológicos y electrónicos en línea.',
      objetivosEspecificos: [
        'Diseñar una interfaz moderna y atractiva que refleje la identidad de marca de TechStore',
        'Implementar un catálogo de productos completo con categorías y filtros de búsqueda',
        'Integrar pasarelas de pago seguras para Colombia',
        'Configurar opciones de envío y logística',
        'Optimizar la tienda para conversión y experiencia de usuario'
      ],
      resumen: 'Este proyecto permitirá a TechStore Colombia transformar su negocio con una plataforma eCommerce robusta y escalable.'
    },
    equipoResponsable: {
      introduccion: 'Para este proyecto, asignaremos un equipo multidisciplinario con experiencia en desarrollo Shopify y eCommerce.',
      miembros: [
        {
          rol: 'Líder de Proyecto',
          descripcion: 'Coordinará todas las fases del proyecto, garantizando cumplimiento de plazos y comunicación constante con el cliente.'
        },
        {
          rol: 'Diseñador UX/UI',
          descripcion: 'Creará el diseño visual de la tienda, enfocado en conversión y experiencia de usuario óptima.'
        },
        {
          rol: 'Desarrollador Shopify',
          descripcion: 'Implementará todas las funcionalidades técnicas, integraciones y personalizaciones necesarias.'
        },
        {
          rol: 'Especialista en CRO',
          descripcion: 'Optimizará la tienda para maximizar la conversión de visitantes en clientes.'
        }
      ],
      cierre: 'Trabajamos con metodología ágil, con entregas semanales y retroalimentación constante para asegurar que el resultado final supere las expectativas.'
    },
    porQueDigitDeck: {
      parrafos: [
        'Digit Deck Agency SAS es una agencia Growth Partner especializada en diseño estratégico, desarrollo web de alto rendimiento y optimización de conversión (CRO). No solo creamos tiendas hermosas, creamos máquinas de vender.',
        'Hemos acompañado a más de 60 marcas en su transformación digital, con casos de éxito comprobados como Rimo Plásticas (incremento de conversión superior al 200%), Experience Prime (+62% en tasa de conversión del funnel) y Saint Theory (conversión mejorada de 0.4% a más del 4%).',
        'Nuestra experiencia en la plataforma Shopify nos permite crear soluciones escalables, modernas y optimizadas para el mercado colombiano, integrando las mejores prácticas de UX/UI y arquitectura eCommerce.',
        'Trabajamos como partners de nuestros clientes, no solo como proveedores. Nos importa el éxito de tu negocio tanto como a ti.'
      ]
    },
    entregables: {
      items: [
        'Tienda Shopify completamente funcional con diseño personalizado responsive',
        'Tema customizado optimizado para conversión y velocidad de carga',
        'Integración completa de catálogo de productos con variantes, imágenes y descripciones',
        'Configuración de pasarelas de pago (Wompi, PayU, PSE, etc.)',
        'Sistema de envíos configurado con integración a operadores logísticos',
        'Páginas institucionales (Nosotros, Contacto, Políticas, FAQ)',
        'Optimización SEO básica (meta tags, estructura de URLs, sitemap)',
        'Integración con Google Analytics y Meta Pixel',
        'Panel de administración configurado con capacitación',
        'Migración de productos existentes (si aplica)',
        'Certificado SSL y dominio configurado',
        'Documentación técnica y manual de uso'
      ]
    },
    inversion: {
      total: '$6.500.000 COP',
      duracion: '6 semanas',
      cronograma: [
        {
          fase: 'Semana 1-2: Diseño y Planificación',
          descripcion: 'Wireframes, diseño UI/UX, arquitectura de información y aprobación del cliente'
        },
        {
          fase: 'Semana 3-4: Desarrollo',
          descripcion: 'Implementación del tema, configuración de funcionalidades y carga de productos'
        },
        {
          fase: 'Semana 5: Integraciones',
          descripcion: 'Pasarelas de pago, envíos, analytics y otras integraciones necesarias'
        },
        {
          fase: 'Semana 6: Testing y Lanzamiento',
          descripcion: 'Pruebas de calidad, ajustes finales, capacitación y puesta en producción'
        }
      ],
      incluye: [
        'Soporte post-lanzamiento de 30 días',
        'Capacitación al equipo de TechStore',
        'Hosting en Shopify (primer mes incluido)',
        '2 rondas de ajustes y cambios menores'
      ]
    }
  };

  console.log('📄 Datos de la propuesta:');
  console.log(`- ID: ${propuestaData.metadata.id}`);
  console.log(`- Cliente: ${propuestaData.metadata.cliente}`);
  console.log(`- Tipo: ${propuestaData.metadata.tipo}`);
  console.log(`- Inversión: ${propuestaData.inversion.total}`);
  console.log(`- Duración: ${propuestaData.inversion.duracion}`);

  console.log('\n⏳ Generando PDF con Puppeteer...\n');

  try {
    // Generar PDF
    const pdfPath = await pdfGenerator.createQuotationPDF(propuestaData, 'test_573173745021');

    console.log('\n✅ ¡PDF GENERADO EXITOSAMENTE!');
    console.log(`\n📂 PDF generado en: ${pdfPath}`);
    console.log('\n🎉 La generación de PDF funciona correctamente!');
    console.log('   Ahora solo necesitas esperar que se restablezca la cuota de Gemini API');
    console.log('   o usar un API key diferente.\n');

  } catch (error) {
    console.error('\n❌ Error generando PDF:', error.message);
    console.error('\nDetalles del error:', error);
  }
}

// Ejecutar prueba
testPDFGeneration();
