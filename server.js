require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const whatsapp = require('./whatsapp');
const aiAgent = require('./aiAgent');
const pdfGenerator = require('./pdfGenerator');
const supabaseClient = require('./supabaseClient');
const reminderService = require('./reminderService');

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

    case 'btn_confirmar_cita':
      await confirmarYGuardarCita(from);
      break;

    case 'btn_cancelar_cita':
      if (conversations.has(from)) {
        conversations.delete(from);
      }
      await whatsapp.sendMessage(from, '❌ Agendamiento cancelado.');
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
    } else if (conversation.state === 'agendando_cita') {
      // Flujo de agendamiento de cita
      await processAppointmentStep(from, messageBody, conversation);
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
  conversations.set(from, {
    appointmentData: {},
    state: 'agendando_cita',
    step: 'email'
  });

  await whatsapp.sendMessage(from,
    '📅 *Agendar Cita*\n\n' +
    'Perfecto! Voy a ayudarte a agendar una cita.\n\n' +
    '📧 *Paso 1 de 4*\n\n' +
    'Por favor ingresa tu *correo electrónico*:'
  );
}

// Procesar cada paso del agendamiento
async function processAppointmentStep(from, messageBody, conversation) {
  try {
    const step = conversation.step;

    if (!messageBody || messageBody.trim().length === 0) {
      await whatsapp.sendMessage(from, 'Por favor escribe una respuesta válida.');
      return;
    }

    switch (step) {
      case 'email':
        // Validar email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(messageBody.trim())) {
          await whatsapp.sendMessage(from, '❌ Email inválido. Por favor ingresa un correo válido (ej: nombre@ejemplo.com)');
          return;
        }
        conversation.appointmentData.email = messageBody.trim();
        conversation.step = 'nombre';
        await whatsapp.sendMessage(from,
          '✅ Email guardado!\n\n' +
          '👤 *Paso 2 de 4*\n\n' +
          '¿Cuál es tu *nombre completo*?'
        );
        break;

      case 'nombre':
        conversation.appointmentData.nombre_cliente = messageBody.trim();
        conversation.step = 'servicio';
        await whatsapp.sendMessage(from,
          '✅ Perfecto!\n\n' +
          '💼 *Paso 3 de 4*\n\n' +
          '¿Qué servicio te interesa?\n' +
          '(Ej: Desarrollo Shopify, CRO, Consultoría, etc.)'
        );
        break;

      case 'servicio':
        conversation.appointmentData.tipo_servicio = messageBody.trim();
        conversation.step = 'fecha';
        await whatsapp.sendMessage(from,
          '✅ Entendido!\n\n' +
          '📅 *Paso 4 de 4*\n\n' +
          'Ingresa la *fecha y hora* para tu cita:\n\n' +
          '*Formato:* DD/MM/YYYY HH:MM\n' +
          '*Ejemplo:* 25/01/2025 14:30'
        );
        break;

      case 'fecha':
        // Parsear fecha
        const fechaParts = messageBody.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
        if (!fechaParts) {
          await whatsapp.sendMessage(from,
            '❌ Formato de fecha inválido.\n\n' +
            'Por favor usa el formato: DD/MM/YYYY HH:MM\n' +
            'Ejemplo: 25/01/2025 14:30'
          );
          return;
        }

        const [, dia, mes, año, hora, minuto] = fechaParts;
        const fechaCita = new Date(año, mes - 1, dia, hora, minuto);

        // Validar que sea fecha futura
        if (fechaCita <= new Date()) {
          await whatsapp.sendMessage(from, '❌ La fecha debe ser en el futuro. Por favor ingresa una fecha válida.');
          return;
        }

        conversation.appointmentData.fecha_cita = fechaCita.toISOString();
        await mostrarResumenCita(from, conversation.appointmentData);
        break;

      default:
        await sendErrorMenu(from, 'Paso no reconocido.');
    }
  } catch (error) {
    console.error('❌ Error procesando paso de cita:', error);
    await sendErrorMenu(from, 'Ocurrió un error procesando tu respuesta.');
  }
}

// Mostrar resumen de la cita antes de confirmar
async function mostrarResumenCita(from, appointmentData) {
  const fechaCita = new Date(appointmentData.fecha_cita);
  const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const resumen =
    '📋 *Resumen de tu cita:*\n\n' +
    `👤 *Nombre:* ${appointmentData.nombre_cliente}\n\n` +
    `📧 *Email:* ${appointmentData.email}\n\n` +
    `💼 *Servicio:* ${appointmentData.tipo_servicio}\n\n` +
    `📅 *Fecha y hora:* ${fechaFormateada}\n\n` +
    '¿Confirmas esta información?';

  await whatsapp.sendInteractiveButtons(
    from,
    resumen,
    [
      { id: 'btn_confirmar_cita', title: '✅ Confirmar' },
      { id: 'btn_cancelar_cita', title: '❌ Cancelar' }
    ],
    'Confirmar Cita',
    'Revisa la información antes de confirmar'
  );
}

// Confirmar y guardar cita en Supabase
async function confirmarYGuardarCita(from) {
  try {
    const conversation = conversations.get(from);

    if (!conversation || !conversation.appointmentData) {
      await sendErrorMenu(from, 'No hay información de cita para guardar.');
      return;
    }

    await whatsapp.sendMessage(from, '⏳ Guardando tu cita...');

    // Preparar datos para Supabase
    const citaData = {
      whatsapp_number: from,
      email: conversation.appointmentData.email,
      nombre_cliente: conversation.appointmentData.nombre_cliente,
      tipo_servicio: conversation.appointmentData.tipo_servicio,
      fecha_cita: conversation.appointmentData.fecha_cita,
      estado: 'pendiente',
      recordatorio_enviado: false
    };

    // Guardar en Supabase
    const citaGuardada = await supabaseClient.crearCita(citaData);

    const fechaCita = new Date(citaGuardada.fecha_cita);
    const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await whatsapp.sendMessage(from,
      '✅ *¡Cita agendada exitosamente!*\n\n' +
      `📅 Tu cita está programada para:\n${fechaFormateada}\n\n` +
      `📧 Te enviamos confirmación a: ${citaGuardada.email}\n\n` +
      '🔔 Te enviaremos un recordatorio 24 horas antes.\n\n' +
      `ID de tu cita: #${citaGuardada.id}`
    );

    await whatsapp.sendInteractiveButtons(
      from,
      '¿Qué te gustaría hacer ahora?',
      [
        { id: 'btn_agendar_cita', title: '📅 Nueva cita' },
        { id: 'btn_volver_menu', title: '🏠 Menú principal' }
      ],
      null,
      null
    );

    // Limpiar conversación
    conversations.delete(from);

  } catch (error) {
    console.error('❌ Error guardando cita:', error);
    await sendErrorMenu(from, 'Hubo un error al guardar la cita. Por favor intenta de nuevo.');
  }
}

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

  // Iniciar servicio de recordatorios de citas
  reminderService.iniciarServicioRecordatorios();
});
