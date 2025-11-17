const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Faltan credenciales de Supabase en .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Crear una nueva cita
 */
async function crearCita(citaData) {
  try {
    const { data, error } = await supabase
      .from('citas')
      .insert([citaData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Cita creada:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creando cita:', error.message);
    throw error;
  }
}

/**
 * Obtener citas de un usuario por WhatsApp
 */
async function obtenerCitasUsuario(whatsappNumber) {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('whatsapp_number', whatsappNumber)
      .order('fecha_cita', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error obteniendo citas:', error.message);
    throw error;
  }
}

/**
 * Obtener citas pendientes próximas (próximas 24 horas)
 */
async function obtenerCitasProximas() {
  try {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('estado', 'pendiente')
      .eq('recordatorio_enviado', false)
      .gte('fecha_cita', ahora.toISOString())
      .lte('fecha_cita', en24Horas.toISOString());

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error obteniendo citas próximas:', error.message);
    throw error;
  }
}

/**
 * Marcar recordatorio como enviado
 */
async function marcarRecordatorioEnviado(citaId) {
  try {
    const { error } = await supabase
      .from('citas')
      .update({ recordatorio_enviado: true })
      .eq('id', citaId);

    if (error) throw error;

    console.log('✅ Recordatorio marcado para cita:', citaId);
    return true;
  } catch (error) {
    console.error('❌ Error marcando recordatorio:', error.message);
    throw error;
  }
}

/**
 * Actualizar estado de una cita
 */
async function actualizarEstadoCita(citaId, nuevoEstado) {
  try {
    const { data, error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', citaId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Estado de cita actualizado:', citaId, nuevoEstado);
    return data;
  } catch (error) {
    console.error('❌ Error actualizando estado:', error.message);
    throw error;
  }
}

/**
 * Cancelar una cita
 */
async function cancelarCita(citaId) {
  return actualizarEstadoCita(citaId, 'cancelada');
}

module.exports = {
  supabase,
  crearCita,
  obtenerCitasUsuario,
  obtenerCitasProximas,
  marcarRecordatorioEnviado,
  actualizarEstadoCita,
  cancelarCita
};
