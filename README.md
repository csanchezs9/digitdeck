# Chatbot WhatsApp - Generador de Propuestas PDF

Bot de WhatsApp con IA (Groq/Llama 3.3) para generar propuestas comerciales profesionales en PDF.

## Características

- WhatsApp Business API con menús interactivos
- IA Groq (Llama 3.3 70B) para generar propuestas personalizadas
- PDFs profesionales con Puppeteer
- Formulario guiado de 5 preguntas
- Propuestas adaptadas a Desarrollo Shopify, CRO o ambos

## Instalación

```bash
npm install
cp .env.example .env
```

Configurar `.env`:
```env
WHATSAPP_TOKEN=tu_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
VERIFY_TOKEN=tu_token_secreto
GROQ_API_KEY=tu_api_key_de_groq
PORT=3000
```

## Configuración

1. **Groq API**: Obtén tu key en [console.groq.com](https://console.groq.com)
2. **WhatsApp Business**:
   - Ve a [Meta Developers](https://developers.facebook.com/)
   - Crea app Business → Agregar WhatsApp
   - Copia `PHONE_NUMBER_ID` y token de acceso
3. **Webhook**:
   ```bash
   npm start
   ngrok http 3000
   ```
   - En Meta Console: `https://tu-url.ngrok.io/webhook`
   - Suscribirse a `messages`

## Uso

```bash
npm start       # Producción
npm run dev     # Desarrollo con nodemon
```

El bot guía al usuario con un formulario de 5 preguntas:
1. Nombre de la empresa
2. Actividad de la empresa
3. Problema/necesidad principal
4. ¿Tiene ecommerce?
5. Tipo de propuesta (Shopify / CRO / Ambas)

## Estructura

```
PDFdigitdeck/
├── server.js          # API Express + lógica de WhatsApp
├── aiAgent.js         # Integración con Groq
├── pdfGenerator.js    # Generación de PDFs
├── whatsapp.js        # Funciones de WhatsApp API
└── pdfs/             # PDFs generados (temporal)
```

## Personalización

- **Prompt IA**: `PROPUESTA_PROMPT` en `aiAgent.js:156`
- **Diseño PDF**: `generateQuotationHTML()` en `pdfGenerator.js`
- **Flujo formulario**: `processFormStep()` en `server.js:353`
