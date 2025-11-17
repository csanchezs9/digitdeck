# Chatbot de WhatsApp - Generador de Cotizaciones PDF

Bot de WhatsApp con IA (Google Gemini) que genera cotizaciones profesionales en PDF.

## Características

- WhatsApp Business API + Google Gemini AI
- Generación automática de PDFs con Puppeteer
- Webhooks en tiempo real

## Instalación

```bash
npm install
cp .env.example .env
```

Configurar `.env`:
```env
WHATSAPP_TOKEN=tu_token
WHATSAPP_PHONE_NUMBER_ID=tu_id
VERIFY_TOKEN=tu_token_secreto
GEMINI_API_KEY=tu_api_key
PORT=3000
BASE_URL=https://tu-dominio.ngrok.io
```

## Configuración WhatsApp

1. [Meta Developers](https://developers.facebook.com/) → Crear app Business → Agregar WhatsApp
2. Copiar `PHONE_NUMBER_ID` y generar token de acceso
3. Configurar webhook:
   ```bash
   npm start
   ngrok http 3000
   ```
4. En Meta Console: URL webhook + token de verificación + suscribirse a `messages`

## Uso

```bash
npm start  # o npm run dev
```

Envía "generar pdf" después de conversar con el bot para recibir la cotización.

## Troubleshooting

- **Webhook no verifica**: Revisar servidor activo, ngrok funcionando y VERIFY_TOKEN correcto
- **No recibe mensajes**: Número en lista de pruebas y webhook suscrito a "messages"
- **Error PDF**: Instalar Puppeteer correctamente y verificar permisos en directorio `pdfs/`

## Personalización

- **PDF**: Editar `generateQuotationHTML()` en `pdfGenerator.js`
- **IA**: Modificar `SYSTEM_PROMPT` en `aiAgent.js`
- **Triggers**: Cambiar condiciones en `server.js:72`
