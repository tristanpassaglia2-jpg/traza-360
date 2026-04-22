// ═══════════════════════════════════════════════════════════════
// TRAZA 360 — Cliente Supabase
// Versión: 1.0 · Abril 2026
// ═══════════════════════════════════════════════════════════════
// Este archivo conecta Traza 360 con la base de datos en Supabase.
// Usa variables de entorno configuradas en Vercel (más seguro).
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// Credenciales leídas desde variables de entorno (Vercel)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validación: si faltan las variables, mostrar error claro
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    '⚠️ ERROR: Faltan variables de entorno de Supabase. ' +
    'Verificá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.'
  );
}

// Cliente de Supabase listo para usar
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

// Registrar un nuevo usuario
export async function signUp(email, password, nombre) {
  try {
    // 1. Crear cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    // 2. Crear perfil en tabla usuarios
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: authData.user.id,
          nombre,
          email,
          plan: 'gratis',
          modo: 'me_protejo',
        });
      if (profileError) throw profileError;
    }

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Error en registro:', error);
    return { success: false, error: error.message };
  }
}

// Iniciar sesión
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: error.message };
  }
}

// Cerrar sesión
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    return { success: false, error: error.message };
  }
}

// Obtener el usuario actual (si está logueado)
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return null;

    // Obtener también el perfil de la tabla usuarios
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError);
      return { authUser: user, profile: null };
    }

    return { authUser: user, profile };
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE DATOS
// ═══════════════════════════════════════════════════════════════

// Guardar/actualizar perfil de usuario
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('auth_user_id', userId)
    .select()
    .single();
  return { data, error };
}

// Obtener contactos del usuario
export async function getContactos(usuarioId) {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('prioridad', { ascending: true });
  return { data, error };
}

// Agregar contacto
export async function addContacto(usuarioId, contacto) {
  const { data, error } = await supabase
    .from('contactos')
    .insert({ ...contacto, usuario_id: usuarioId })
    .select()
    .single();
  return { data, error };
}

// Eliminar contacto
export async function deleteContacto(contactoId) {
  const { error } = await supabase
    .from('contactos')
    .delete()
    .eq('id', contactoId);
  return { error };
}

// Obtener terceros remotos del usuario
export async function getTerceros(usuarioId) {
  const { data, error } = await supabase
    .from('terceros_remotos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false });
  return { data, error };
}

// Agregar tercero remoto
export async function addTercero(usuarioId, tercero) {
  const { data, error } = await supabase
    .from('terceros_remotos')
    .insert({ ...tercero, usuario_id: usuarioId })
    .select()
    .single();
  return { data, error };
}

// Eliminar tercero
export async function deleteTercero(terceroId) {
  const { error } = await supabase
    .from('terceros_remotos')
    .delete()
    .eq('id', terceroId);
  return { error };
}

// Obtener zonas de geofencing del usuario
export async function getZonas(usuarioId, modulo = null) {
  let query = supabase
    .from('zonas_geofencing')
    .select('*')
    .eq('usuario_id', usuarioId);
  if (modulo) query = query.eq('modulo', modulo);
  const { data, error } = await query.order('creado_en', { ascending: false });
  return { data, error };
}

// Agregar zona de geofencing
export async function addZona(usuarioId, zona) {
  const { data, error } = await supabase
    .from('zonas_geofencing')
    .insert({ ...zona, usuario_id: usuarioId })
    .select()
    .single();
  return { data, error };
}

// Eliminar zona
export async function deleteZona(zonaId) {
  const { error } = await supabase
    .from('zonas_geofencing')
    .delete()
    .eq('id', zonaId);
  return { error };
}

// Guardar ubicación del usuario (para Tercero Remoto)
export async function saveUbicacion(usuarioId, lat, lng, precision = null) {
  const { data, error } = await supabase
    .from('ubicaciones')
    .insert({
      usuario_id: usuarioId,
      latitud: lat,
      longitud: lng,
      precision_metros: precision,
    });
  return { data, error };
}

// Registrar alerta disparada
export async function registrarAlerta(usuarioId, alerta) {
  const { data, error } = await supabase
    .from('alertas')
    .insert({ ...alerta, usuario_id: usuarioId })
    .select()
    .single();
  return { data, error };
}

// Obtener historial de alertas
export async function getAlertas(usuarioId, limit = 50) {
  const { data, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })
    .limit(limit);
  return { data, error };
}

// ═══════════════════════════════════════════════════════════════
// REALTIME: Ubicaciones en vivo (para Tercero Remoto)
// ═══════════════════════════════════════════════════════════════

// El tercero se suscribe a las ubicaciones de un usuario
export function subscribeToUbicaciones(usuarioId, callback) {
  const channel = supabase
    .channel(`ubicaciones_${usuarioId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ubicaciones',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  // Retorna función para cancelar la suscripción
  return () => {
    supabase.removeChannel(channel);
  };
}

// El tercero se suscribe a las alertas de un usuario
export function subscribeToAlertas(usuarioId, callback) {
  const channel = supabase
    .channel(`alertas_${usuarioId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alertas',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export default supabase;
