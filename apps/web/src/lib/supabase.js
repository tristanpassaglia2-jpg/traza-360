import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── AUTH ────────────────────────────────────
export async function signUp(email, password, nombre) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      await supabase.from("usuarios").insert({
        auth_user_id: data.user.id, nombre, email, plan: "gratis", modo: "me_protejo",
      });
    }
    return { success: true, user: data.user };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function signOut() { await supabase.auth.signOut(); }

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("usuarios").select("*").eq("auth_user_id", user.id).single();
    return { authUser: user, profile };
  } catch (e) { return null; }
}

export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase.from("usuarios").update(updates).eq("id", userId).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─── CONTACTOS ───────────────────────────────
export async function getContactos() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const { data } = await supabase.from("contactos").select("*").eq("usuario_id", user.profile.id).order("prioridad");
    return data || [];
  } catch (e) { return []; }
}

export async function addContacto(contacto) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("contactos").insert({ ...contacto, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function deleteContacto(id) {
  try {
    const { error } = await supabase.from("contactos").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─── TERCEROS ────────────────────────────────
export async function getTerceros() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const { data } = await supabase.from("terceros_remotos").select("*").eq("usuario_id", user.profile.id);
    return data || [];
  } catch (e) { return []; }
}

export async function addTercero(tercero) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("terceros_remotos").insert({ ...tercero, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function deleteTercero(id) {
  try {
    const { error } = await supabase.from("terceros_remotos").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─── ZONAS ───────────────────────────────────
export async function getZonas() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const { data } = await supabase.from("zonas_geofencing").select("*").eq("usuario_id", user.profile.id);
    return data || [];
  } catch (e) { return []; }
}

export async function addZona(zona) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("zonas_geofencing").insert({ ...zona, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function deleteZona(id) {
  try {
    const { error } = await supabase.from("zonas_geofencing").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ─── ALERTAS ─────────────────────────────────
export async function registrarAlerta(alerta) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("alertas").insert({ ...alerta, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getAlertas() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const { data } = await supabase.from("alertas").select("*").eq("usuario_id", user.profile.id).order("creado_en", { ascending: false }).limit(50);
    return data || [];
  } catch (e) { return []; }
}

// ─── UBICACIONES ─────────────────────────────
export async function saveUbicacion(ubicacion) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("ubicaciones").insert({ ...ubicacion, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export function subscribeToUbicaciones(userId, callback) {
  return supabase.channel("ubicaciones_" + userId).on("postgres_changes", { event: "*", schema: "public", table: "ubicaciones", filter: `usuario_id=eq.${userId}` }, callback).subscribe();
}

export function subscribeToAlertas(userId, callback) {
  return supabase.channel("alertas_" + userId).on("postgres_changes", { event: "*", schema: "public", table: "alertas", filter: `usuario_id=eq.${userId}` }, callback).subscribe();
}

// ═══════════════════════════════════════════════
// MEDICAMENTOS (v4)
// ═══════════════════════════════════════════════

export async function getMedicamentos() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const { data } = await supabase.from("medicamentos").select("*").eq("usuario_id", user.profile.id).eq("activo", true).order("creado_en");
    return data || [];
  } catch (e) { return []; }
}

export async function addMedicamento(med) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase.from("medicamentos").insert({ ...med, usuario_id: user.profile.id }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateMedicamento(id, updates) {
  try {
    const { data, error } = await supabase.from("medicamentos").update(updates).eq("id", id).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function deleteMedicamento(id) {
  try {
    const { error } = await supabase.from("medicamentos").update({ activo: false }).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getTomasHoy() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const hoy = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("tomas_medicamento").select("*, medicamentos(nombre, dosis, color)").eq("usuario_id", user.profile.id).eq("fecha", hoy).order("horario_programado");
    return data || [];
  } catch (e) { return []; }
}

export async function getTomasSemana() {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return [];
    const hoy = new Date();
    const hace7 = new Date(hoy);
    hace7.setDate(hace7.getDate() - 6);
    const { data } = await supabase.from("tomas_medicamento").select("*, medicamentos(nombre, dosis, color)").eq("usuario_id", user.profile.id).gte("fecha", hace7.toISOString().split("T")[0]).lte("fecha", hoy.toISOString().split("T")[0]).order("fecha").order("horario_programado");
    return data || [];
  } catch (e) { return []; }
}

export async function marcarTomado(tomaId) {
  try {
    const { data, error } = await supabase.from("tomas_medicamento").update({ tomado: true, tomado_en: new Date().toISOString() }).eq("id", tomaId).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function crearTomasDelDia(medicamentos) {
  try {
    const user = await getCurrentUser();
    if (!user?.profile) return;
    const hoy = new Date().toISOString().split("T")[0];
    const diaHoy = new Date().getDay() || 7;

    for (const med of medicamentos) {
      if (!med.dias_semana.includes(diaHoy)) continue;
      const { data: existentes } = await supabase.from("tomas_medicamento")
        .select("id").eq("medicamento_id", med.id).eq("fecha", hoy);
      if (existentes && existentes.length > 0) continue;

      const inserts = (med.horarios || []).map(h => ({
        usuario_id: user.profile.id,
        medicamento_id: med.id,
        horario_programado: h,
        fecha: hoy,
        tomado: false,
      }));
      if (inserts.length > 0) await supabase.from("tomas_medicamento").insert(inserts);
    }
  } catch (e) { console.error("Error creando tomas:", e); }
}
