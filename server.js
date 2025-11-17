require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const whatsapp = require('./whatsapp');
const aiAgent = require('./aiAgent');
const pdfGenerator = require('./pdfGenerator');
// Supabase y recordatorios comentados - se usarán cuando se configure webhook de Calendly
// const supabaseClient = require('./supabaseClient');
// const reminderService = require('./reminderService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Store para conversaciones en memoria (en producción usa una BD)
const conversations = new Map();

// Timestamp de inicio del servidor
const serverStartTime = Date.now();

// Set para usuarios notificados sobre reinicio
const notifiedUsers = new Set();

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Error en verificación del webhook');
    res.sendStatus(403);
  }
});

// Webhook para recibir mensajes (POST)
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Verificar que sea una notificación de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    // Extraer información del mensaje
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from; // Número del usuario
    const messageType = message.type;

    console.log(`📨 Mensaje recibido de ${from}:`, message);

    // Ignorar mensajes del sistema de Meta (números que no son del usuario)
    if (from === '16465894168') {
      console.log('⚠️ Ignorando mensaje del sistema de Meta');
      res.sendStatus(200);
      return;
    }

    // Responder rápido a WhatsApp
    res.sendStatus(200);

    // Procesar el mensaje según el tipo
    if (messageType === 'text') {
      const messageBody = message.text?.body;
      await handleTextMessage(from, messageBody);
    } else if (messageType === 'interactive') {
      await handleInteractiveResponse(from, message.interactive);
    } else {
      // Tipo de mensaje no soportado
      console.log(`⚠️ Tipo de mensaje no soportado: ${messageType}`);
      await whatsapp.sendMessage(from, 'Lo siento, solo puedo procesar mensajes de texto y botones interactivos.');
      await sendMainMenu(from);
    }

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    // Intentar notificar al usuario del error
    try {
      const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (from) {
        await sendErrorMenu(from, 'Ocurrió un error procesando tu mensaje.');
      }
    } catch (notifyError) {
      console.error('❌ No se pudo notificar el error al usuario:', notifyError);
    }
    res.sendStatus(500);
  }
});

// Función para enviar el menú principal
async function sendMainMenu(from) {
  await whatsapp.sendInteractiveButtons(
    from,
    '¡Bienvenido! 👋\n\nSoy tu asistente virtual de Digit Deck.\n\n¿En qué puedo ayudarte hoy?',
    [
      { id: 'btn_cotizacion', title: '💰 Cotización' },
      { id: 'btn_agendar_cita', title: '📅 Agendar Cita' },
      { id: 'btn_info', title: 'ℹ️ Información' }
    ],
    'Digit Deck',
    'Selecciona una opción del menú'
  );
}

// Función para manejar respuestas de botones/listas
async function handleInteractiveResponse(from, interactive) {
  try {
    const buttonId = interactive.button_reply?.id || interactive.list_reply?.id;

    console.log(`🔘 Botón presionado: ${buttonId}`);

    // Verificar si el usuario necesita ser notificado sobre el reinicio
    if (!notifiedUsers.has(from)) {
      notifiedUsers.add(from);
      await whatsapp.sendMessage(from,
        '⚠️ *Sesión Expirada*\n\n' +
        'El servidor se reinició y tu sesión anterior fue cerrada.\n\n' +
        'No te preocupes, puedes continuar desde aquí. 👇'
      );
    }

    const conversation = conversations.get(from);

    switch (buttonId) {
      case 'btn_cotizacion':
        await startQuotationFlow(from);
        break;

      case 'btn_agendar_cita':
        await startAppointmentFlow(from);
        break;

      case 'btn_info':
        await whatsapp.sendMessage(from,
          '📋 *Digit Deck - Información*\n\n' +
          'Somos una empresa especializada en soluciones digitales.\n\n' +
          '✅ Desarrollo web\n' +
          '✅ Aplicaciones móviles\n' +
          '✅ Consultoría IT\n' +
          '✅ Diseño gráfico'
        );
        await whatsapp.sendInteractiveButtons(
          from,
          '¿Qué deseas hacer?',
          [
            { id: 'btn_cotizacion', title: '💰 Cotización' },
            { id: 'btn_volver_menu', title: '🏠 Menú principal' }
          ],
          null,
          null
        );
        break;

      case 'btn_ayuda':
        await whatsapp.sendMessage(from,
          '❓ *Ayuda*\n\n' +
          'Para solicitar una cotización, presiona el botón "Cotización" del menú principal.\n\n' +
          'Te haré algunas preguntas para entender tus necesidades y generaré un PDF personalizado.'
        );
        await whatsapp.sendInteractiveButtons(
          from,
          '¿Qué deseas hacer?',
          [
            { id: 'btn_cotizacion', title: '💰 Cotización' },
            { id: 'btn_volver_menu', title: '🏠 Menú principal' }
          ],
          null,
          null
        );
        break;

    // Respuestas del formulario de cotización
    case 'ecommerce_si':
      if (conversation) {
        conversation.formData.tieneEcommerce = 'Sí';
        conversation.step = 'tipo_propuesta';
        await whatsapp.sendInteractiveButtons(
          from,
          '📝 *Pregunta 5 de 5*\n\n¿La propuesta es para desarrollo de tienda en Shopify, para CRO o para ambas?',
          [
            { id: 'propuesta_shopify', title: 'Desarrollo Shopify' },
            { id: 'propuesta_cro', title: 'CRO' },
            { id: 'propuesta_ambas', title: 'Ambas' }
          ],
          null,
          null
        );
      }
      break;

    case 'ecommerce_no':
      if (conversation) {
        conversation.formData.tieneEcommerce = 'No';
        conversation.step = 'tipo_propuesta';
        await whatsapp.sendInteractiveButtons(
          from,
          '📝 *Pregunta 5 de 5*\n\n¿La propuesta es para desarrollo de tienda en Shopify, para CRO o para ambas?',
          [
            { id: 'propuesta_shopify', title: 'Desarrollo Shopify' },
            { id: 'propuesta_cro', title: 'CRO' },
            { id: 'propuesta_ambas', title: 'Ambas' }
          ],
          null,
          null
        );
      }
      break;

    case 'propuesta_shopify':
      if (conversation) {
        conversation.formData.tipoPropuesta = 'Desarrollo de tienda en Shopify';
        await showFormSummary(from, conversation.formData);
      }
      break;

    case 'propuesta_cro':
      if (conversation) {
        conversation.formData.tipoPropuesta = 'CRO (Optimización de Conversión)';
        await showFormSummary(from, conversation.formData);
      }
      break;

    case 'propuesta_ambas':
      if (conversation) {
        conversation.formData.tipoPropuesta = 'Desarrollo Shopify + CRO';
        await showFormSummary(from, conversation.formData);
      }
      break;

    case 'btn_confirmar_cotizacion':
      await generateAndSendQuotation(from);
      break;

    case 'btn_cancelar':
      if (conversations.has(from)) {
        conversations.delete(from);
      }
      await whatsapp.sendMessage(from, '❌ Cotización cancelada.');
      await sendMainMenu(from);
      break;

    case 'btn_nueva_cotizacion':
      await startQuotationFlow(from);
      break;

    case 'btn_volver_menu':
      if (conversations.has(from)) {
        conversations.delete(from);
      }
      await sendMainMenu(from);
      break;

    default:
      console.log(`⚠️ Botón no reconocido: ${buttonId}`);
      await sendErrorMenu(from, 'Opción no reconocida.');
    }
  } catch (error) {
    console.error('❌ Error manejando respuesta interactiva:', error);
    await sendErrorMenu(from, 'Ocurrió un error procesando tu selección.');
  }
}

// Mostrar resumen del formulario antes de generar
async function showFormSummary(from, formData) {
  const summary =
    '📋 *Resumen de tu información:*\n\n' +
    `🏢 *Empresa:* ${formData.nombreEmpresa}\n\n` +
    `💼 *Actividad:* ${formData.actividadEmpresa}\n\n` +
    `⚠️ *Necesidad:* ${formData.problemaNecesidad}\n\n` +
    `🛒 *Tiene ecommerce:* ${formData.tieneEcommerce}\n\n` +
    `📦 *Tipo de propuesta:* ${formData.tipoPropuesta}\n\n` +
    '¿Deseas generar la cotización con esta información?';

  await whatsapp.sendInteractiveButtons(
    from,
    summary,
    [
      { id: 'btn_confirmar_cotizacion', title: '✅ Generar PDF' },
      { id: 'btn_cancelar', title: '❌ Cancelar' }
    ],
    'Confirmar Información',
    'Con esta información se creará tu propuesta'
  );
}

// Función para iniciar el flujo de cotización
async function startQuotationFlow(from) {
  // Crear nueva conversación
  conversations.set(from, {
    formData: {},
    state: 'gathering_info',
    step: 'nombre_empresa'
  });

  await whatsapp.sendMessage(from,
    '💰 *Perfecto!* 👆\n\n' +
    'Para crear tu cotización o propuesta, necesito algunos datos clave antes de armar el documento listo:\n\n' +
    '📝 *Pregunta 1 de 5*\n\n' +
    '*Nombre de la empresa:*'
  );
}

// Función para manejar mensajes de texto
async function handleTextMessage(from, messageBody) {
  try {
    const lowerMessage = messageBody.toLowerCase().trim();

    // Verificar si el usuario necesita ser notificado sobre el reinicio
    if (!notifiedUsers.has(from)) {
      notifiedUsers.add(from);
      await whatsapp.sendMessage(from,
        '⚠️ *Sesión Expirada*\n\n' +
        'El servidor se reinició y tu sesión anterior fue cerrada.\n\n' +
        'No te preocupes, puedes continuar desde aquí. 👇'
      );
    }

    // Si no hay conversación activa, mostrar menú
    if (!conversations.has(from)) {
      await sendMainMenu(from);
      return;
    }

    const conversation = conversations.get(from);

    // Si está en proceso de recopilación de información con formulario estructurado
    if (conversation.state === 'gathering_info') {
      // Ignorar mensajes de texto para pasos que requieren botones interactivos
      if (conversation.step === 'tiene_ecommerce' || conversation.step === 'tipo_propuesta') {
        await whatsapp.sendMessage(from, 'Por favor selecciona una de las opciones usando los botones.');
        return;
      }
      await processFormStep(from, messageBody, conversation);
    } else {
      // Si no está en ningún flujo, mostrar menú
      await sendMainMenu(from);
    }

  } catch (error) {
    console.error('❌ Error manejando mensaje:', error);
    await sendErrorMenu(from, 'Ocurrió un error procesando tu mensaje.');
  }
}

// Procesar cada paso del formulario
async function processFormStep(from, messageBody, conversation) {
  try {
    const step = conversation.step;

    // Validar que el mensaje no esté vacío
    if (!messageBody || messageBody.trim().length === 0) {
      await whatsapp.sendMessage(from, 'Por favor escribe una respuesta válida.');
      return;
    }

    switch (step) {
      case 'nombre_empresa':
        conversation.formData.nombreEmpresa = messageBody.trim();
        conversation.step = 'actividad_empresa';
        await whatsapp.sendMessage(from,
          '✅ Perfecto!\n\n' +
          '📝 *Pregunta 2 de 5*\n\n' +
          '*¿A qué se dedica la empresa?*'
        );
        break;

      case 'actividad_empresa':
        conversation.formData.actividadEmpresa = messageBody.trim();
        conversation.step = 'problema_necesidad';
        await whatsapp.sendMessage(from,
          '✅ Entendido!\n\n' +
          '📝 *Pregunta 3 de 5*\n\n' +
          '*¿Cuál es su problema principal o necesidad?*'
        );
        break;

      case 'problema_necesidad':
        conversation.formData.problemaNecesidad = messageBody.trim();
        conversation.step = 'tiene_ecommerce';
        await whatsapp.sendInteractiveButtons(
          from,
          '📝 *Pregunta 4 de 5*\n\n¿Tiene tienda ecommerce?',
          [
            { id: 'ecommerce_si', title: '✅ Sí' },
            { id: 'ecommerce_no', title: '❌ No' }
          ],
          null,
          null
        );
        break;

      case 'tiene_ecommerce':
        // Este caso se maneja en handleInteractiveResponse
        break;

      case 'tipo_propuesta':
        // Este caso se maneja en handleInteractiveResponse
        break;

      default:
        await sendErrorMenu(from, 'Paso no reconocido en el formulario.');
    }
  } catch (error) {
    console.error('❌ Error procesando paso del formulario:', error);
    await sendErrorMenu(from, 'Ocurrió un error procesando tu respuesta.');
  }
}

// Función para generar y enviar la cotización
async function generateAndSendQuotation(from) {
  try {
    const conversation = conversations.get(from);

    if (!conversation || !conversation.formData) {
      await sendErrorMenu(from, 'No hay información para generar la cotización.');
      return;
    }

    // Validar que tengamos todos los datos necesarios
    const { nombreEmpresa, actividadEmpresa, problemaNecesidad, tieneEcommerce, tipoPropuesta } = conversation.formData;

    if (!nombreEmpresa || !actividadEmpresa || !problemaNecesidad || !tieneEcommerce || !tipoPropuesta) {
      await sendErrorMenu(from, 'Falta información en el formulario. Por favor inicia de nuevo.');
      conversations.delete(from);
      return;
    }

    await whatsapp.sendMessage(from,
      '⏳ *Generando cotización...*\n\nPor favor espera un momento mientras proceso la información y creo tu propuesta personalizada.'
    );

    // Generar cotización con IA usando los datos del formulario
    const quotationData = await aiAgent.generateQuotationFromForm(conversation.formData);

    console.log('📄 Datos de cotización:', quotationData);

    // Generar PDF
    const pdfPath = await pdfGenerator.createQuotationPDF(quotationData, from);

    // Enviar PDF por WhatsApp
    await whatsapp.sendDocument(from, pdfPath);

    // Eliminar el PDF después de enviarlo
    const fs = require('fs');
    try {
      fs.unlinkSync(pdfPath);
      console.log('🗑️ PDF eliminado después de enviar:', pdfPath);
    } catch (err) {
      console.error('⚠️ Error eliminando PDF:', err);
    }

    await whatsapp.sendMessage(from,
      '✅ *¡Cotización generada exitosamente!*\n\n' +
      'Te he enviado tu cotización en formato PDF.\n\n' +
      '¿Necesitas algo más?'
    );

    // Mostrar opciones finales
    await whatsapp.sendInteractiveButtons(
      from,
      '¿Qué te gustaría hacer ahora?',
      [
        { id: 'btn_nueva_cotizacion', title: '🔄 Nueva cotización' },
        { id: 'btn_volver_menu', title: '🏠 Menú principal' }
      ],
      null,
      null
    );

    // Limpiar conversación
    conversation.state = 'completed';

  } catch (error) {
    console.error('❌ Error generando cotización:', error);
    await sendErrorMenu(from, 'Hubo un error al generar la cotización.');
  }
}

// Función de menú de error con botones para recuperación
async function sendErrorMenu(from, errorMessage) {
  try {
    // Limpiar conversación problemática
    if (conversations.has(from)) {
      conversations.delete(from);
    }

    await whatsapp.sendMessage(from,
      `⚠️ *${errorMessage}*\n\n` +
      'No te preocupes, puedes reintentar:'
    );

    await whatsapp.sendInteractiveButtons(
      from,
      'Selecciona una opción para continuar:',
      [
        { id: 'btn_cotizacion', title: '💰 Nueva cotización' },
        { id: 'btn_volver_menu', title: '🏠 Menú principal' }
      ],
      null,
      null
    );
  } catch (err) {
    console.error('❌ Error crítico en sendErrorMenu:', err);
    // Fallback final
    try {
      await whatsapp.sendMessage(from, 'Ocurrió un error. Por favor escribe cualquier mensaje para reiniciar.');
    } catch (finalErr) {
      console.error('❌ Error crítico enviando mensaje de fallback:', finalErr);
    }
  }
}

// ============================================
// FUNCIONES DE AGENDAMIENTO DE CITAS
// ============================================

// Función para iniciar el flujo de agendamiento
async function startAppointmentFlow(from) {
  // URL de Google Calendar booking
  const googleCalendarUrl = process.env.GOOGLE_CALENDAR_URL || 'https://calendar.google.com';

  await whatsapp.sendMessage(from,
    '📅 *Agendar Cita con Digit Deck*\n\n' +
    '¡Perfecto! Para agendar tu cita, sigue estos pasos:\n\n' +
    '1️⃣ Haz clic en el siguiente enlace:\n' +
    `${googleCalendarUrl}\n\n` +
    '2️⃣ Selecciona la fecha y hora que mejor te convenga\n\n' +
    '3️⃣ Completa tus datos de contacto\n\n' +
    '✅ *Beneficios:*\n' +
    '• Calendario visual fácil de usar\n' +
    '• Sincronización con Google Calendar\n' +
    '• Recordatorios automáticos\n' +
    '• Confirmación por email\n\n' +
    '📧 Recibirás un correo con todos los detalles de tu cita.\n\n' +
    '💬 Si tienes dudas, escríbeme por aquí.'
  );

  await whatsapp.sendInteractiveButtons(
    from,
    '¿Qué deseas hacer ahora?',
    [
      { id: 'btn_cotizacion', title: '💰 Cotización' },
      { id: 'btn_volver_menu', title: '🏠 Menú principal' }
    ],
    null,
    null
  );
}

// Las citas se gestionan directamente desde Google Calendar
// No necesitamos procesar pasos de agendamiento manualmente

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    conversations: conversations.size
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📱 WhatsApp Phone ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
  console.log(`🔐 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📅 Google Calendar URL: ${process.env.GOOGLE_CALENDAR_URL || 'No configurado'}`);
});
