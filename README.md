# Chatbot de WhatsApp - Generador de Cotizaciones en PDF

Bot de WhatsApp que utiliza Google Gemini AI para conversar con clientes y generar cotizaciones profesionales en formato PDF usando Puppeteer.

## Características

- Integración con WhatsApp Business API de Meta
- Conversación inteligente usando Google Gemini
- Generación automática de cotizaciones en PDF con diseño profesional
- Webhooks para recibir y responder mensajes en tiempo real

## Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **Cuenta de WhatsApp Business** con API configurada en Meta Developer
3. **API Key de Google Gemini** ([Obtener aquí](https://makersuite.google.com/app/apikey))
4. **ngrok** (para exponer el servidor local durante desarrollo)

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

3. Editar el archivo `.env` con tus credenciales:
```env
# WhatsApp Business API
WHATSAPP_TOKEN=tu_token_de_acceso
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
VERIFY_TOKEN=un_token_secreto_que_tu_elijas

# Google Gemini
GEMINI_API_KEY=tu_api_key_de_gemini

# Servidor
PORT=3000
BASE_URL=https://tu-dominio.ngrok.io
```

## Configuración de WhatsApp Business API

### 1. Obtener credenciales de Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una app de tipo "Business"
3. Agrega el producto "WhatsApp"
4. En la sección de WhatsApp > Configuración:
   - Copia el `PHONE_NUMBER_ID`
   - Genera un token de acceso (ACCESS_TOKEN)

### 2. Configurar Webhook

1. Inicia el servidor local:
```bash
npm start
```

2. Expón el servidor con ngrok:
```bash
ngrok http 3000
```

3. En Meta Developer Console > WhatsApp > Configuración:
   - URL del webhook: `https://tu-url-ngrok.ngrok.io/webhook`
   - Token de verificación: el mismo que pusiste en `VERIFY_TOKEN`
   - Suscríbete a: `messages`

4. Verifica el webhook (debe aparecer con check verde)

### 3. Número de prueba

Meta te proporciona un número de prueba automáticamente. Puedes:
- Agregar hasta 5 números de teléfono para probar
- Enviar mensajes desde esos números al número de prueba

## Uso

### Iniciar el servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

### Probar el bot

1. Agrega tu número de teléfono a la lista de pruebas en Meta Developer Console
2. Envía un mensaje de WhatsApp al número de prueba
3. El bot responderá y comenzará a recopilar información para la cotización
4. Cuando tengas la información necesaria, escribe "generar pdf" o "cotización"
5. El bot generará y enviará el PDF automáticamente

## Flujo de Conversación

```
Usuario: Hola
Bot: ¡Hola! 👋 Soy tu asistente de cotizaciones...

Usuario: Necesito 10 computadoras
Bot: Perfecto, ¿qué especificaciones necesitas?

Usuario: Core i7, 16GB RAM
Bot: Entendido. ¿Algo más que necesites cotizar?

Usuario: No, generar pdf
Bot: ⏳ Perfecto, estoy generando tu cotización...
Bot: ✅ [Envía el PDF]
```

## Estructura del Proyecto

```
PDFdigitdeck/
├── server.js           # Servidor Express y lógica principal
├── whatsapp.js         # Funciones para API de WhatsApp
├── aiAgent.js          # Integración con Google Gemini
├── pdfGenerator.js     # Generación de PDFs con Puppeteer
├── package.json
├── .env
├── .env.example
└── pdfs/              # Directorio donde se guardan los PDFs
```

## Personalización

### Modificar el diseño del PDF

Edita la función `generateQuotationHTML()` en `pdfGenerator.js` para cambiar:
- Colores y estilos CSS
- Logo de la empresa
- Información de contacto
- Estructura del documento

### Ajustar el comportamiento de la IA

Modifica el `SYSTEM_PROMPT` en `aiAgent.js` para:
- Cambiar el tono de la conversación
- Ajustar qué información recopilar
- Personalizar las preguntas

### Cambiar triggers de generación

En `server.js`, línea ~72, modifica las condiciones:
```javascript
if (messageBody.toLowerCase().includes('generar') ||
    messageBody.toLowerCase().includes('pdf'))
```

## Troubleshooting

### El webhook no se verifica
- Asegúrate que el servidor esté corriendo
- Verifica que ngrok esté activo
- Confirma que el VERIFY_TOKEN coincida

### No recibo mensajes
- Verifica que tu número esté en la lista de pruebas
- Revisa que el webhook esté suscrito a "messages"
- Checa los logs del servidor

### Error generando PDFs
- Asegúrate que Puppeteer esté instalado correctamente
- En algunos sistemas necesitas dependencias adicionales para Chromium
- Verifica que el directorio `pdfs/` tenga permisos de escritura

### Error de Gemini API
- Verifica que tu API key sea válida
- Asegúrate de tener cuota disponible
- Revisa la conexión a internet

## Producción

Para llevar a producción:

1. Usa un servidor con IP pública o servicio como:
   - Heroku
   - Railway
   - DigitalOcean
   - AWS EC2

2. Configura variables de entorno en el servidor

3. Actualiza el webhook en Meta con la URL de producción

4. Considera usar:
   - PM2 para mantener el proceso activo
   - Una base de datos para almacenar conversaciones
   - Redis para sesiones
   - Sistema de logging

## Licencia

ISC

## Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio.
