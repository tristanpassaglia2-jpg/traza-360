// =========================================================
// TRAZA 360 — Cliente Supabase
// Versión: 3.0 · Abril 2026
// =========================================================
// Funciones: Auth + Contactos + Terceros + Zonas + Alertas
// =========================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    '⚠️ ERROR: Faltan variables de entorno de Supabase. ' +
    'Verificá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.'
  );
}

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

// =========================================================
// AUTENTICACIÓN
// =========================================================

export async function signUp(email, password, nombre) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Error en signUp Auth:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario.' };
    }

    const { error: profileError } = await supabase
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        nombre: nombre,
        email: email,
        plan: 'gratis',
        modo: 'me_protejo',
      });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
    }

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Error inesperado en signUp:', error);
    return { success: false, error: error.message };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error en signIn:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error inesperado en signIn:', error);
    return { success: false, error: error.message };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error en signOut:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error inesperado en signOut:', error);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

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
    console.error('Error inesperado en getCurrentUser:', error);
    return null;
  }
}

export async function updateUserProfile(updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('auth_user_id', user.id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =========================================================
// CONTACTOS DE CONFIANZA
// =========================================================

// Obtener todos los contactos del usuario
export async function getContactos() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Primero obtener el ID del usuario en tabla usuarios
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return [];

    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', perfil.id)
      .order('prioridad', { ascending: true });

    if (error) {
      console.error('Error obteniendo contactos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado en getContactos:', error);
    return [];
  }
}

// Agregar un contacto
export async function addContacto(contacto) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return { success: false, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
      .from('contactos')
      .insert({
        usuario_id: perfil.id,
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        relacion: contacto.relacion || null,
        prioridad: contacto.prioridad || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error agregando contacto:', error);
      return { success: false, error: error.message };
    }

    return { success: true, contacto: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Eliminar un contacto
export async function deleteContacto(contactoId) {
  try {
    const { error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', contactoId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =========================================================
// TERCEROS REMOTOS
// =========================================================

// Obtener terceros del usuario
export async function getTerceros() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return [];

    const { data, error } = await supabase
      .from('terceros_remotos')
      .select('*')
      .eq('usuario_id', perfil.id)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error obteniendo terceros:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado en getTerceros:', error);
    return [];
  }
}

// Agregar un tercero remoto
export async function addTercero(tercero) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return { success: false, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
      .from('terceros_remotos')
      .insert({
        usuario_id: perfil.id,
        nombre: tercero.nombre,
        telefono: tercero.telefono,
        codigo_vinculacion: tercero.codigo,
        duracion_key: tercero.duracionKey,
        expira_en: tercero.expira ? new Date(tercero.expira).toISOString() : null,
        activo: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error agregando tercero:', error);
      return { success: false, error: error.message };
    }

    return { success: true, tercero: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Eliminar un tercero
export async function deleteTercero(terceroId) {
  try {
    const { error } = await supabase
      .from('terceros_remotos')
      .delete()
      .eq('id', terceroId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =========================================================
// ZONAS DE GEOFENCING
// =========================================================

// Obtener zonas del usuario para un módulo
export async function getZonas(modulo) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return [];

    let query = supabase
      .from('zonas_geofencing')
      .select('*')
      .eq('usuario_id', perfil.id);

    if (modulo) {
      query = query.eq('modulo', modulo);
    }

    const { data, error } = await query.order('creado_en', { ascending: false });

    if (error) {
      console.error('Error obteniendo zonas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado en getZonas:', error);
    return [];
  }
}

// Agregar una zona
export async function addZona(zona) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return { success: false, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
      .from('zonas_geofencing')
      .insert({
        usuario_id: perfil.id,
        modulo: zona.modulo,
        nombre: zona.nombre,
        direccion: zona.direccion,
        lat: zona.lat,
        lng: zona.lng,
        radio: zona.radio,
        activa: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error agregando zona:', error);
      return { success: false, error: error.message };
    }

    return { success: true, zona: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Eliminar una zona
export async function deleteZona(zonaId) {
  try {
    const { error } = await supabase
      .from('zonas_geofencing')
      .delete()
      .eq('id', zonaId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =========================================================
// ALERTAS
// =========================================================

// Registrar una alerta
export async function registrarAlerta(alerta) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return { success: false, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
      .from('alertas')
      .insert({
        usuario_id: perfil.id,
        tipo: alerta.tipo,
        modulo: alerta.modulo || null,
        mensaje: alerta.mensaje,
        lat: alerta.lat || null,
        lng: alerta.lng || null,
        link_mapa: alerta.linkMapa || null,
        enviado_a: alerta.enviadoA || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error registrando alerta:', error);
      return { success: false, error: error.message };
    }

    return { success: true, alerta: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtener historial de alertas
export async function getAlertas(limite = 50) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return [];

    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .eq('usuario_id', perfil.id)
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Error obteniendo alertas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado en getAlertas:', error);
    return [];
  }
}

// =========================================================
// UBICACIONES (Realtime)
// =========================================================

export async function saveUbicacion(lat, lng, precision) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!perfil) return { success: false, error: 'Perfil no encontrado' };

    const { data, error } = await supabase
      .from('ubicaciones')
      .insert({
        usuario_id: perfil.id,
        latitud: lat,
        longitud: lng,
        precision_metros: precision || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, ubicacion: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Suscribirse a cambios de ubicación en tiempo real
export function subscribeToUbicaciones(usuarioId, callback) {
  return supabase
    .channel(`ubicaciones_${usuarioId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ubicaciones', filter: `usuario_id=eq.${usuarioId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// Suscribirse a alertas en tiempo real
export function subscribeToAlertas(usuarioId, callback) {
  return supabase
    .channel(`alertas_${usuarioId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alertas', filter: `usuario_id=eq.${usuarioId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
