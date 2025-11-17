const supabaseClient = require('./supabaseClient');
const whatsapp = require('./whatsapp');

/**
 * Servicio de recordatorios de citas
 * Revisa cada hora si hay citas próximas (en las próximas 24 horas)
 * y envía recordatorios por WhatsApp
 */

// Intervalo de revisión (cada 1 hora)
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hora en milisegundos

/**
 * Enviar recordatorio de cita por WhatsApp
 */
async function enviarRecordatorioCita(cita) {
  try {
    const fechaCita = new Date(cita.fecha_cita);
    const fechaFormateada = fechaCita.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mensaje =
      '🔔 *RECORDATORIO DE CITA*\n\n' +
      `Hola ${cita.nombre_cliente}! 👋\n\n` +
      'Este es un recordatorio de tu cita con Digit Deck:\n\n' +
      `📅 *Fecha:* ${fechaFormateada}\n` +
      `💼 *Servicio:* ${cita.tipo_servicio}\n` +
      `📧 *Email:* ${cita.email}\n\n` +
      `🆔 ID de cita: #${cita.id}\n\n` +
      '¿Necesitas reprogramar? Escríbenos y te ayudamos. 😊';

    await whatsapp.sendMessage(cita.whatsapp_number, mensaje);

    // Marcar recordatorio como enviado
    await supabaseClient.marcarRecordatorioEnviado(cita.id);

    console.log(`✅ Recordatorio enviado para cita #${cita.id}`);
    return true;

  } catch (error) {
    console.error(`❌ Error enviando recordatorio para cita #${cita.id}:`, error.message);
    return false;
  }
}

/**
 * Revisar citas próximas y enviar recordatorios
 */
async function revisarYEnviarRecordatorios() {
  try {
    console.log('🔍 Revisando citas próximas...');

    // Obtener citas en las próximas 24 horas que no han recibido recordatorio
    const citasProximas = await supabaseClient.obtenerCitasProximas();

    if (citasProximas.length === 0) {
      console.log('✅ No hay citas próximas que requieran recordatorio');
      return;
    }

    console.log(`📋 Se encontraron ${citasProximas.length} cita(s) próxima(s)`);

    // Enviar recordatorio para cada cita
    for (const cita of citasProximas) {
      await enviarRecordatorioCita(cita);
      // Esperar 2 segundos entre mensajes para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('✅ Proceso de recordatorios completado');

  } catch (error) {
    console.error('❌ Error en el proceso de recordatorios:', error.message);
  }
}

/**
 * Iniciar servicio de recordatorios
 */
function iniciarServicioRecordatorios() {
  console.log('🔔 Servicio de recordatorios iniciado');
  console.log(`⏰ Revisión cada ${CHECK_INTERVAL / 60000} minutos`);

  // Ejecutar inmediatamente al iniciar
  revisarYEnviarRecordatorios();

  // Programar ejecución periódica
  setInterval(revisarYEnviarRecordatorios, CHECK_INTERVAL);
}

module.exports = {
  iniciarServicioRecordatorios,
  revisarYEnviarRecordatorios,
  enviarRecordatorioCita
};
