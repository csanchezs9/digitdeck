const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;

/**
 * Envía un mensaje de texto por WhatsApp
 */
async function sendMessage(to, message) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mensaje enviado a ${to}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Envía un documento (PDF) por WhatsApp
 */
async function sendDocument(to, filePath) {
  try {
    // Paso 1: Subir el archivo a los servidores de WhatsApp
    const mediaId = await uploadMedia(filePath);

    // Paso 2: Enviar el documento usando el media_id
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'document',
        document: {
          id: mediaId,
          filename: `cotizacion_${Date.now()}.pdf`,
          caption: 'Tu cotización personalizada'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Documento enviado a ${to}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error enviando documento:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Sube un archivo a los servidores de WhatsApp y retorna el media_id
 */
async function uploadMedia(filePath) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          ...form.getHeaders()
        }
      }
    );

    console.log(`✅ Archivo subido, media_id: ${response.data.id}`);
    return response.data.id;

  } catch (error) {
    console.error('❌ Error subiendo archivo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Marca un mensaje como leído
 */
async function markAsRead(messageId) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('❌ Error marcando mensaje como leído:', error.message);
  }
}

/**
 * Envía un mensaje interactivo con botones
 * @param {string} to - Número de teléfono del destinatario
 * @param {string} bodyText - Texto del mensaje
 * @param {Array} buttons - Array de objetos con {id, title}
 * @param {string} headerText - Texto del encabezado (opcional)
 * @param {string} footerText - Texto del pie (opcional)
 */
async function sendInteractiveButtons(to, bodyText, buttons, headerText = null, footerText = null) {
  try {
    const interactive = {
      type: 'button',
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    };

    if (headerText) {
      interactive.header = {
        type: 'text',
        text: headerText
      };
    }

    if (footerText) {
      interactive.footer = {
        text: footerText
      };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: interactive
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Botones interactivos enviados a ${to}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error enviando botones:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Envía un mensaje interactivo con lista de opciones
 * @param {string} to - Número de teléfono del destinatario
 * @param {string} bodyText - Texto del mensaje
 * @param {string} buttonText - Texto del botón para abrir la lista
 * @param {Array} sections - Array de secciones con {title, rows: [{id, title, description}]}
 * @param {string} headerText - Texto del encabezado (opcional)
 * @param {string} footerText - Texto del pie (opcional)
 */
async function sendInteractiveList(to, bodyText, buttonText, sections, headerText = null, footerText = null) {
  try {
    const interactive = {
      type: 'list',
      body: {
        text: bodyText
      },
      action: {
        button: buttonText,
        sections: sections
      }
    };

    if (headerText) {
      interactive.header = {
        type: 'text',
        text: headerText
      };
    }

    if (footerText) {
      interactive.footer = {
        text: footerText
      };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: interactive
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Lista interactiva enviada a ${to}`);
    return response.data;

  } catch (error) {
    console.error('❌ Error enviando lista:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendMessage,
  sendDocument,
  uploadMedia,
  markAsRead,
  sendInteractiveButtons,
  sendInteractiveList
};
