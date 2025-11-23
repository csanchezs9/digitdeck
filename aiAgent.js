const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Prompt del sistema para el asistente de cotizaciones
const SYSTEM_PROMPT = `Eres un asistente experto en generar cotizaciones profesionales. Tu trabajo es:

1. Hacer preguntas relevantes al cliente para entender sus necesidades
2. Recopilar información sobre productos/servicios, cantidades, especificaciones
3. Cuando tengas suficiente información, generar una cotización estructurada

Sé amigable, profesional y eficiente. Haz preguntas claras y específicas.
Cuando el usuario pida generar el PDF o tengas toda la información necesaria,
indica que estás listo para procesar la cotización.`;

// Prompt para generar la cotización final
const QUOTATION_GENERATION_PROMPT = `Basándote en toda la conversación anterior, genera una cotización estructurada en formato JSON con la siguiente estructura:

{
  "cliente": {
    "nombre": "nombre del cliente si lo mencionó, sino 'Cliente'",
    "empresa": "empresa si la mencionó"
  },
  "fecha": "fecha actual",
  "items": [
    {
      "descripcion": "descripción del producto/servicio",
      "cantidad": número,
      "precioUnitario": número,
      "total": número
    }
  ],
  "subtotal": número,
  "iva": número (16% del subtotal),
  "total": número,
  "notas": "notas adicionales o condiciones de la cotización",
  "validez": "días de validez (ej: 30 días)"
}

Asigna precios realistas y profesionales basados en el mercado actual.
Retorna SOLO el JSON, sin texto adicional.`;

/**
 * Convierte mensajes al formato de Gemini
 */
function convertMessagesToGemini(messages) {
  const history = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  return history;
}

/**
 * Conversa con el usuario para recopilar información
 */
async function chatWithUser(messages) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT
    });

    const history = convertMessagesToGemini(messages.slice(0, -1));
    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error('❌ Error en chat con IA:', error.message);
    throw error;
  }
}

/**
 * Genera la cotización final basada en la conversación
 */
async function generateQuotation(messages) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT
    });

    // Construir historial completo
    const history = convertMessagesToGemini(messages);

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(QUOTATION_GENERATION_PROMPT);
    const response = await result.response;
    const jsonText = response.text();

    // Extraer JSON del texto (en caso de que venga con markdown)
    let jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    }

    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const quotationData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Agregar ID único y fecha
    quotationData.id = `COT-${Date.now()}`;
    quotationData.fecha = new Date().toLocaleDateString('es-ES');

    console.log('✅ Cotización generada:', quotationData.id);
    return quotationData;

  } catch (error) {
    console.error('❌ Error generando cotización:', error.message);

    // Cotización de fallback
    return {
      id: `COT-${Date.now()}`,
      fecha: new Date().toLocaleDateString('es-ES'),
      cliente: {
        nombre: 'Cliente',
        empresa: ''
      },
      items: [
        {
          descripcion: 'Producto/Servicio solicitado',
          cantidad: 1,
          precioUnitario: 1000,
          total: 1000
        }
      ],
      subtotal: 1000,
      iva: 160,
      total: 1160,
      notas: 'Cotización generada automáticamente. Precios sujetos a cambio.',
      validez: '30 días'
    };
  }
}

/**
 * Genera una propuesta profesional basada en datos del formulario
 */
async function generateQuotationFromForm(formData) {
  try {
    const PROPUESTA_PROMPT = `Eres un estratega senior de Digit Deck Agency SAS, especializado en crear propuestas comerciales profesionales para proyectos de desarrollo web, Shopify y CRO (Optimización de Conversión).

INFORMACIÓN DEL CLIENTE:
- Empresa: ${formData.nombreEmpresa}
- Actividad: ${formData.actividadEmpresa}
- Problema/Necesidad: ${formData.problemaNecesidad}
- Tiene eCommerce: ${formData.tieneEcommerce}
- Tipo de propuesta solicitada: ${formData.tipoPropuesta}

CONTEXTO DE DIGIT DECK AGENCY:
Digit Deck Agency SAS es una agencia Growth Partner especializada en diseño estratégico, desarrollo web de alto rendimiento y optimización de conversión (CRO). Hemos acompañado a más de 60 marcas en su transición digital, con casos de éxito como:
- Rimo Plásticas: Incremento de conversión superior al 200%
- Experience Prime: +62% en tasa de conversión del funnel
- Saint Theory: Conversión mejorada de 0.4% a más del 4%
- seizAM: Empresa con más de 80.000 ventas

Tu tarea es generar una propuesta profesional COMPLETA en formato JSON con la siguiente estructura EXACTA:

{
  "portada": {
    "subtitulo": "Descripción breve del proyecto (2-3 líneas) adaptada a la empresa"
  },
  "objetivoDelProyecto": {
    "objetivoPrincipal": "Párrafo de 4-5 líneas describiendo el objetivo principal",
    "objetivosEspecificos": [
      "Lista de 4-5 objetivos específicos",
      "Cada uno debe ser concreto y medible"
    ],
    "resumen": "Frase final resumiendo el propósito (1 línea)"
  },
  "equipoResponsable": {
    "introduccion": "Párrafo sobre el equipo (2 líneas)",
    "miembros": [
      {
        "rol": "Nombre del rol",
        "descripcion": "Descripción de responsabilidades"
      }
    ],
    "cierre": "Párrafo sobre metodología de trabajo"
  },
  "porQueDigitDeck": {
    "parrafos": [
      "3-4 párrafos vendiendo los diferenciadores de Digit Deck",
      "Enfocados en experiencia, casos de éxito y visión estratégica"
    ]
  },
  "entregables": {
    "items": [
      "Lista detallada de 6-12 entregables",
      "Cada uno con descripción específica",
      "Adaptados al tipo de proyecto"
    ]
  },
  "inversion": {
    "total": "Monto en COP o USD según el proyecto",
    "duracion": "Duración del proyecto (ej: '6 semanas', '3 meses')",
    "cronograma": [
      {
        "fase": "Nombre de la fase",
        "descripcion": "Descripción de actividades"
      }
    ],
    "incluye": [
      "Lista de 3-5 items incluidos en la inversión"
    ]
  }
}

REGLAS IMPORTANTES:
1. Adapta TODO el contenido específicamente al cliente y su necesidad
2. Si es "Desarrollo Shopify": enfócate en crear tienda desde cero, arquitectura escalable, diseño moderno
3. Si es "CRO": enfócate en optimización continua, pruebas A/B, landing pages, incremento de conversión
4. Si es "Ambas": combina ambos enfoques con visión integral
5. Los precios deben ser realistas:
   - Desarrollo Shopify completo: $5.000.000 - $8.000.000 COP
   - CRO (3 meses): USD $2.500 - $4.000
   - Proyectos combinados: USD $5.000 - $8.000
6. La duración debe ser realista:
   - Desarrollo web: 4-8 semanas
   - CRO: 3-6 meses (trabajo continuo)
7. USA un tono profesional, persuasivo y orientado a resultados
8. MENCIONA casos de éxito relevantes cuando sea apropiado
9. El equipo debe incluir 3-4 roles específicos según el proyecto
10. IMPORTANTE: Cuando uses siglas/acrónimos en el texto, SIEMPRE incluye su significado entre paréntesis la PRIMERA vez que aparecen en cada sección. Ejemplos:
    - "CRO (Optimización de Tasa de Conversión)" o "CRO (Conversion Rate Optimization)"
    - "CRM (Gestión de Relaciones con el Cliente)" o "CRM (Customer Relationship Management)"
    - "SEO (Optimización para Motores de Búsqueda)" o "SEO (Search Engine Optimization)"
    - "UX (Experiencia de Usuario)" o "UX (User Experience)"
    - "UI (Interfaz de Usuario)" o "UI (User Interface)"
    - Cualquier otra sigla técnica debe explicarse entre paréntesis

Retorna ÚNICAMENTE el JSON, sin texto adicional, sin markdown, sin explicaciones.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: PROPUESTA_PROMPT
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000
    });

    const jsonText = completion.choices[0]?.message?.content || '';

    // Extraer JSON
    let jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
      jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    }

    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const propuestaData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Agregar metadata
    propuestaData.metadata = {
      id: `PROP-${Date.now()}`,
      fecha: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      cliente: formData.nombreEmpresa,
      tipo: formData.tipoPropuesta
    };

    console.log('✅ Propuesta generada:', propuestaData.metadata.id);
    return propuestaData;

  } catch (error) {
    console.error('❌ Error generando propuesta:', error.message);
    throw error;
  }
}

module.exports = {
  chatWithUser,
  generateQuotation,
  generateQuotationFromForm
};
