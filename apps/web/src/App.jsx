import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase, getContactos, addContacto, deleteContacto, getMedicamentos, addMedicamento, deleteMedicamento, getTomasHoy, getTomasSemana, marcarTomado, crearTomasDelDia } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa v19.11
   Versión: 19.11 · Mayo 2026
   ═══════════════════════════════════════════════════════════════
   CAMBIOS v19.11:
   1. Modo Testigo (audio + fotos + nube al activar pánico)
   2. Ruta Segura en Vivo (link público /live/:token)
   3. Geocercas Emocionales (zonas seguras con alertas horarias)
   4. Panel público /live/:token para contactos
   5. Hero landing: "Si algo pasa, alguien ya sabe."
   6. Privacidad + T&C reales, checkbox obligatorio al registrar
   7. Borrar cuenta funcional, recuperar contraseña
   8. Tour Demo onboarding (5 pasos)
   9. Modal GPS explicativo
   10. PIN de acceso rápido
   11. Email soporte centralizado (SUPPORT_EMAIL)
   12. Sobre nosotros, disclaimer visible, responsable legal
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER_DEFAULT = "5493513956879";
const PIN_DEFAULT = "1234";
const HOME_ADDRESS_DEFAULT = "Mi casa";

// v19.7: Email de soporte centralizado (cambialo acá para que se actualice en TODA la app)
const SUPPORT_EMAIL = "traza360.app@gmail.com"; // ⚠️ Tristan: cambiá este string por tu Gmail nuevo cuando lo crees
const RESPONSABLE_NAME = "Tristan Passaglia";
const RESPONSABLE_LOCATION = "Córdoba, Argentina";
const APP_VERSION = "19.7";

// ─── PALETA DE MARCA TRAZA 360 (v19) ────────
// Según logo oficial: pin dorado + ojo central rojo sobre negro
const BRAND = {
  // Paleta DGR-inspired — dorado envejecido, negro profundo, cálido
  gold:        "#C9A84C",
  goldLite:    "#E8C96A",
  goldDark:    "#8B6914",
  goldWarm:    "#D4A843",
  red:         "#C0392B",
  redDark:     "#922B21",
  black:       "#000000",
  blackBg:     "#080808",
  blackCard:   "#0F0F0F",
  blackWarm:   "#141210",
  white:       "#F5F0E8",
  cream:       "#E8DCC8",
  textLight:   "rgba(245,240,232,0.88)",  // Blanco cálido legible — reemplaza textMute
  textMute:    "rgba(232,220,200,0.65)",  // Muted cálido — reemplaza textDim
  textDim:     "rgba(232,220,200,0.4)",   // Muy sutil
  border:      "rgba(201,168,76,0.2)",
  borderStrong:"rgba(201,168,76,0.55)",
  goldGradient: "linear-gradient(135deg, #8B6914 0%, #C9A84C 30%, #E8C96A 50%, #C9A84C 70%, #8B6914 100%)",
  cardBg:      "linear-gradient(145deg, #111008, #080808)",
  // Colores por módulo
  modViolencia:  { bg: "rgba(192,57,43,0.12)",  border: "rgba(192,57,43,0.4)",  accent: "#E74C3C", label: "Violencia de Género" },
  modNoche:      { bg: "rgba(52,73,94,0.18)",   border: "rgba(93,173,226,0.3)", accent: "#5DADE2", label: "Noche Segura" },
  modAdolescente:{ bg: "rgba(39,174,96,0.12)",  border: "rgba(39,174,96,0.35)", accent: "#2ECC71", label: "Adolescente Seguro" },
};
const TAGLINE = "Alguien cuida de vos.";

// Fuente premium estilo DGR — serif para títulos, tracking amplio
const FONT_DISPLAY = "'Georgia', 'Times New Roman', serif";
const FONT_BODY    = "'system-ui', '-apple-system', sans-serif";

const PLAN_LIMITS = {
  gratis: { contactos: 2, terceros: 0, zonas: 1, medicamentos: 0, audioMax: 0, storage: "0", modulos: 1 },
  plus: { contactos: 5, terceros: 1, zonas: 3, medicamentos: 3, audioMax: 1800, storage: "1 GB", modulos: 3 },
  premium: { contactos: 10, terceros: 5, zonas: -1, medicamentos: -1, audioMax: -1, storage: "10 GB", modulos: -1 },
};

const PLAN_PRICES = {
  gratis: { name: "Gratis", price: "US$0", priceARS: "$0", monthly: 0, features: ["1 módulo activo", "2 contactos", "Alertas básicas WhatsApp", "Sin grabación"] },
  plus: { name: "Plus", price: "US$2.99/mes", priceARS: "$2.500/mes", monthly: 2.99, features: ["3 módulos activos", "5 contactos", "Grabación de audio", "Botón de ingreso temporizado", "Historial 30 días"] },
  premium: { name: "Premium", price: "US$5.99/mes", priceARS: "$5.000/mes", monthly: 5.99, features: ["TODOS los módulos", "10 contactos", "Audio + Video", "Te Cuido (remoto)", "Almacenamiento ilimitado", "Soporte prioritario"] },
  anual: { name: "Premium Anual", price: "US$49.99/año", priceARS: "$42.000/año", monthly: 4.17, features: ["Todo lo del Premium", "Ahorrás 30%", "2 meses gratis"] },
};

// ─── PAÍSES ─────────────────────────────────
const PAISES = [
  { code: "AR", flag: "\u{1F1E6}\u{1F1F7}", prefix: "54",  label: "+54 Argentina" },
  { code: "MX", flag: "\u{1F1F2}\u{1F1FD}", prefix: "52",  label: "+52 México" },
  { code: "CO", flag: "\u{1F1E8}\u{1F1F4}", prefix: "57",  label: "+57 Colombia" },
  { code: "CL", flag: "\u{1F1E8}\u{1F1F1}", prefix: "56",  label: "+56 Chile" },
  { code: "UY", flag: "\u{1F1FA}\u{1F1FE}", prefix: "598", label: "+598 Uruguay" },
  { code: "PY", flag: "\u{1F1F5}\u{1F1FE}", prefix: "595", label: "+595 Paraguay" },
  { code: "BO", flag: "\u{1F1E7}\u{1F1F4}", prefix: "591", label: "+591 Bolivia" },
  { code: "PE", flag: "\u{1F1F5}\u{1F1EA}", prefix: "51",  label: "+51 Perú" },
  { code: "BR", flag: "\u{1F1E7}\u{1F1F7}", prefix: "55",  label: "+55 Brasil" },
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}", prefix: "1",   label: "+1 USA" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}", prefix: "34",  label: "+34 España" },
];

const RELACIONES = ["Madre", "Padre", "Hermana", "Hermano", "Pareja", "Amigo/a", "Hija", "Hijo", "Vecino/a", "Otro"];

const COLORES_MED = [
  { key: "blue", bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-300", dot: "bg-blue-400" },
  { key: "green", bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  { key: "red", bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-300", dot: "bg-red-400" },
  { key: "purple", bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-300", dot: "bg-purple-400" },
  { key: "orange", bg: "bg-slate-500/20", border: "border-slate-500/40", text: "text-gray-300", dot: "bg-slate-400" },
  { key: "pink", bg: "bg-pink-500/20", border: "border-pink-500/40", text: "text-pink-300", dot: "bg-pink-400" },
];

const DIAS_SEMANA = [
  { num: 1, short: "Lun" }, { num: 2, short: "Mar" }, { num: 3, short: "Mié" },
  { num: 4, short: "Jue" }, { num: 5, short: "Vie" }, { num: 6, short: "Sáb" }, { num: 7, short: "Dom" },
];

// ─── PhoneInput ─────────────────────────────
function PhoneInput({ value, onChange, prefix, onPrefixChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const pais = PAISES.find((p) => p.prefix === prefix) || PAISES[0];
  return (
    <div className="relative">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white whitespace-nowrap hover:bg-white/10 shrink-0">
          <span>{pais.flag}</span><span className="text-slate-300">+{pais.prefix}</span><span className="text-slate-400 text-sm">{"\u25BC"}</span>
        </button>
        <input type="tel" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Número sin 0 ni 15"}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-400/50 min-w-0" />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#08080c] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {PAISES.map((p) => (
            <button key={p.code} type="button" onClick={() => { onPrefixChange(p.prefix); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 text-left ${p.prefix === prefix ? "bg-white/10 text-cyan-300" : "text-slate-200"}`}>
              <span className="text-lg">{p.flag}</span><span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── UTILS ──────────────────────────────────
function limpiarNumero(num) { return num.trim().replace(/\s/g, "").replace(/-/g, "").replace(/^0+/, "").replace(/^15/, ""); }

// ─── GEO ────────────────────────────────────
let lastKnownLocation = null;
function saveLastLocation(lat, lng) { lastKnownLocation = { lat, lng, timestamp: Date.now() }; try { sessionStorage.setItem("traza360_loc", JSON.stringify(lastKnownLocation)); } catch(e){} }
function loadLastLocation() { if (lastKnownLocation) return lastKnownLocation; try { const r = sessionStorage.getItem("traza360_loc"); if (r) { lastKnownLocation = JSON.parse(r); return lastKnownLocation; } } catch(e){} return null; }

function getCurrentLocationWithFallback() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ location: loadLastLocation(), source: "fallback" }); return; }
    const t = setTimeout(() => resolve({ location: loadLastLocation(), source: "fallback" }), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(t); const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() }; saveLastLocation(loc.lat, loc.lng); resolve({ location: loc, source: "live" }); },
      () => { clearTimeout(t); resolve({ location: loadLastLocation(), source: "fallback" }); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

function buildMapLink(loc) { return loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null; }

// ─── WHATSAPP VÍA API ────────────────────────
async function sendWhatsAppAPI(numero, text) {
  try {
    const numLimpio = numero.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "").replace(/^0+/, "");
    // Obtener nombre del usuario
    const userData = await supabase.auth.getUser();
    const nombre = userData?.data?.user?.user_metadata?.nombre || userData?.data?.user?.user_metadata?.full_name || userData?.data?.user?.email?.split('@')[0] || "Usuario";
    // Obtener ubicación GPS
    let ubicacionTexto = "No disponible";
    let location = null;
    try {
      const r = await getCurrentLocationWithFallback();
      location = r.location;
      if (location) ubicacionTexto = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
    } catch(e) { }
    // Hora actual
    const ahora = new Date();
    const hora = ahora.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    // Limpiar texto para Meta (sin emojis ni caracteres especiales)
    const textoLimpio = "Alerta activada - necesito ayuda";
   // Guardar alerta en DB y generar link para contactos
        const alertaId = crypto.randomUUID();
        try {
          await supabase.from("alertas").insert({
            id: alertaId,
            usuario_id: userData?.data?.user?.id || null,
            tipo: "alerta_emergencia",
            modulo: "violencia de genero",
            mensaje: textoLimpio,
            latitud: location?.lat || null,
            longitud: location?.lng || null,
            link_mapa: location ? "https://maps.google.com/?q=" + location.lat + "," + location.lng : null,
            enviado_a: [numLimpio],
            creado_en: new Date().toISOString()
          });
        } catch(e) { console.warn("DB alerta:", e); }
        const linkAlerta = "https://traza360.app/alerta/" + alertaId;  
    // Enviar via Edge Function
    const response = await fetch("https://vzqxxkxdxcmaucubufpz.supabase.co/functions/v1/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
  to: numLimpio, 
  template: "alerta_emergencia", 
  params: [nombre.substring(0,60), textoLimpio + " - Ver: traza360.app/alerta/" + alertaId, hora, "Seguridad"],
  usuario_id: userData?.data?.user?.id || null,
  modulo: "violencia de genero",
  mensaje: textoLimpio,
  latitud: location?.lat || null,
  longitud: location?.lng || null,
  link_mapa: location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : null,
}),
});
    
    const data = await response.json();
    if (data.messages) { console.log("WhatsApp enviado OK:", data.messages[0].id); return { success: true, data }; }
    else { console.warn("WhatsApp API error:", data.error); return { success: false, error: data.error }; }
  } catch (error) { console.error("WhatsApp fetch error:", error); return { success: false, error: error.message }; }
}

async function enviarWhatsApp(numero, text) {
  const result = await sendWhatsAppAPI(numero, text);
  if (!result.success) {
    // Fallback silencioso: loguear pero NO abrir WhatsApp Web (molesta en PC)
    console.warn("WhatsApp API falló, fallback desactivado para evitar abrir WhatsApp Web");
  }
  return result;
}

async function enviarWhatsAppSilencioso(numero, text) { return await sendWhatsAppAPI(numero, text); }
function openWhatsAppDefault(text) { enviarWhatsApp(WHATSAPP_NUMBER_DEFAULT, text); }

function buildMessageWithReply(baseMessage, loc, alertaId) {
  let msg = baseMessage;
  if (loc) msg += "\n\n\u{1F4CD} Ubicacion: " + buildMapLink(loc);
  if (alertaId) msg += "\n\n\u{1F6A8} Ver alerta y responder:\nhttps://traza360.app/alerta/" + alertaId;
  msg += "\n\n\u{1F4F1} RESPONDER:\n\u2705 OK\n\u{1F44D} Recibi\n\u{1F3C3} Voy\n\u{1F697} Salgo ya\n\u23F0 5 min\n\u{1F3E0} En casa\n\u{1F4A8} Llegue\n\u{1F6A8} Emergencia";
  return msg;
}

async function sendAlertToContact(contact, baseMessage, alertaId) {
  const { location } = await getCurrentLocationWithFallback();
  enviarWhatsApp(contact.telefono, buildMessageWithReply(baseMessage, location, alertaId));
}

function openMapsTo(d) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }
function openUber(d) { window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }

// ─── NOTIFICACIONES ─────────────────────────
async function pedirPermisoNotificaciones() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function enviarNotificacion(titulo, body) {
  if (Notification.permission === "granted") new Notification(titulo, { body, icon: "/favicon.ico" });
}

function reproducirSonido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; gain.gain.value = 0.3; osc.start();
    setTimeout(() => { osc.frequency.value = 1000; }, 200);
    setTimeout(() => { osc.frequency.value = 800; }, 400);
    setTimeout(() => { osc.stop(); ctx.close(); }, 600);
  } catch(e){}
}

// ─── ICONS ──────────────────────────────────
// Set de íconos premium SVG en dorado (reemplazan emojis cartoon)
function GoldIcon({ name, size = 24 }) {
  const color = BRAND.gold;
  const paths = {
    shield:    <path d="M12 2 L4 6 V12 C4 17 7.5 20.5 12 22 C16.5 20.5 20 17 20 12 V6 L12 2 Z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>,
    teen:      <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 21 V18 C5 15 8 13.5 12 13.5 C16 13.5 19 15 19 18 V21"/><path d="M9 4 L15 4"/></g>,
    work:      <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M8 8 V6 C8 5 9 4 10 4 H14 C15 4 16 5 16 6 V8"/><path d="M3 13 H21"/></g>,
    eye:       <g stroke={color} strokeWidth="1.6" fill="none"><path d="M2 12 C4 7 8 4 12 4 C16 4 20 7 22 12 C20 17 16 20 12 20 C8 20 4 17 2 12 Z"/><circle cx="12" cy="12" r="3" fill={color}/></g>,
    contacts:  <g stroke={color} strokeWidth="1.6" fill="none"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20 V18 C3 15.5 5.5 14 9 14 C12.5 14 15 15.5 15 18 V20"/><path d="M14.5 14.5 C16 14 17 14 18 14 C19.5 14 21 15 21 17 V19"/></g>,
    panic:     <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M12 2 L2 22 H22 L12 2 Z"/><path d="M12 10 V14" strokeLinecap="round"/><circle cx="12" cy="17.5" r="0.5" fill={color}/></g>,
    mic:       <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11 V12 C5 16 8 19 12 19 C16 19 19 16 19 12 V11"/><path d="M12 19 V22"/></g>,
    folder:    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M3 7 V18 C3 19 4 20 5 20 H19 C20 20 21 19 21 18 V9 C21 8 20 7 19 7 H12 L10 5 H5 C4 5 3 6 3 7 Z"/></g>,
    pin:       <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M12 22 C7 16 4 13 4 9 A8 8 0 0 1 20 9 C20 13 17 16 12 22 Z"/><circle cx="12" cy="9" r="2.5" fill={color}/></g>,
    timer:     <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 13 V8"/><path d="M9 2 H15"/></g>,
    car:       <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M3 16 V12 L5 7 H19 L21 12 V16"/><path d="M3 16 H21 V19 H18 V17 H6 V19 H3 Z"/><circle cx="7" cy="17" r="1.3" fill={color}/><circle cx="17" cy="17" r="1.3" fill={color}/></g>,
    taxi:      <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M3 16 V12 L5 7 H19 L21 12 V16"/><path d="M3 16 H21 V19 H18 V17 H6 V19 H3 Z"/><path d="M9 4 H15 V7 H9 Z"/></g>,
    school:    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M12 3 L2 8 L12 13 L22 8 Z"/><path d="M6 10 V15 C6 17 9 18 12 18 C15 18 18 17 18 15 V10"/></g>,
    home:      <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M3 11 L12 3 L21 11 V20 H15 V14 H9 V20 H3 Z"/></g>,
    write:     <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round"><path d="M14 4 L20 10 L8 22 H2 V16 L14 4 Z"/></g>,
    night:     <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"><path d="M20 14 A8 8 0 1 1 10 4 A6 6 0 0 0 20 14 Z"/></g>,
    alert:     <g stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round"><path d="M12 3 L22 21 H2 L12 3 Z"/><path d="M12 10 V14"/><circle cx="12" cy="17.5" r="0.5" fill={color}/></g>,
    person:    <g stroke={color} strokeWidth="1.6" fill="none"><circle cx="12" cy="7" r="3.5"/><path d="M4 21 C4 16 8 13.5 12 13.5 C16 13.5 20 16 20 21"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {paths[name] || paths.shield}
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);
}

function WhatsAppFloatingButton() {
  // v19: Sacado por pedido de Tristan. No se renderiza nada.
  // El componente queda como no-op para no romper referencias existentes.
  return null;
}

// ─── SISTEMA DE ESTADO (Semáforo) ────────────
// ─── SYSTEM STATUS v19.8 — Panel de estado detallado ────────────
// Muestra GPS, WhatsApp, contactos y qué hacer si algo falla
function SystemStatusBadge({ status }) {
  const configs = {
    ok:      { color: "#22c55e", label: "Sistema listo",     dot: "bg-green-400",  bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)" },
    warning: { color: "#f59e0b", label: "Acción necesaria",  dot: "bg-yellow-400", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
    error:   { color: "#ef4444", label: "Sin conexión",      dot: "bg-red-400",    bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)" },
  };
  const cfg = configs[status] || configs.warning;
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse shrink-0`} />
      <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function SystemStatusPanel({ contactos, onGoToContactos, onClose }) {
  const [gpsOk, setGpsOk] = useState(null);   // null=checking, true=ok, false=error
  const [waOk, setWaOk]   = useState(null);
  const [expanded, setExpanded] = useState(false);

  const cantContactos = contactos?.length || 0;
  const contactosOk = cantContactos >= 1;

  useEffect(() => {
    // Chequear GPS
    if (!navigator.geolocation) { setGpsOk(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => setGpsOk(true),
      () => setGpsOk(false),
      { timeout: 5000, maximumAge: 60000 }
    );
    // Chequear WhatsApp API
    fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "test", message: "ping", test: true })
    })
      .then(r => r.json())
      .then(d => setWaOk(d.active === true))
      .catch(() => setWaOk(false));
  }, []);

  const todoOk = gpsOk === true && waOk === true && contactosOk;
  const hayProblema = gpsOk === false || waOk === false || !contactosOk;

  function Indicador({ ok, label, detalleFalla, accion, onAccion }) {
    const checking = ok === null;
    return (
      <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: `1px solid ${BRAND.border}` }}>
        <div className="shrink-0 mt-0.5">
          {checking
            ? <div className="h-4 w-4 rounded-full border-2 border-dashed animate-spin" style={{ borderColor: BRAND.textDim }} />
            : ok
              ? <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}><span className="text-[10px]" style={{ color: "#22c55e" }}>✓</span></div>
              : <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}><span className="text-[10px]" style={{ color: "#ef4444" }}>✗</span></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: ok === null ? BRAND.textDim : ok ? BRAND.white : "#fca5a5" }}>
              {label}
            </p>
            {!ok && !checking && accion && (
              <button onClick={onAccion} className="text-[11px] font-bold ml-2 shrink-0 underline" style={{ color: BRAND.gold }}>
                {accion}
              </button>
            )}
          </div>
          {!ok && !checking && detalleFalla && (
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: BRAND.textMute }}>{detalleFalla}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #0d0d0d, #000000)", border: `1px solid ${hayProblema ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}` }}>
      {/* Header — siempre visible */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${hayProblema ? "bg-red-500" : todoOk ? "bg-green-400" : "bg-yellow-400"} animate-pulse`} />
          <span className="text-sm font-bold" style={{ color: hayProblema ? "#fca5a5" : todoOk ? "#22c55e" : "#f59e0b" }}>
            {hayProblema ? "Acción necesaria" : todoOk ? "Sistema listo para emergencias" : "Verificando sistema..."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Íconos de estado premium */}
          <div className="flex items-center gap-2">
            {/* WhatsApp icon */}
            <div className="flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: waOk === null ? "rgba(255,255,255,0.05)" : waOk ? "rgba(37,211,102,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${waOk === null ? BRAND.border : waOk ? "rgba(37,211,102,0.35)" : "rgba(239,68,68,0.35)"}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={waOk === null ? "#555" : waOk ? "#25D366" : "#ef4444"}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.533 5.848L.057 23.547a.75.75 0 00.919.916l5.699-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.505-5.24-1.385l-.374-.217-3.88 1.005 1.022-3.762-.23-.386A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            {/* GPS / Maps icon */}
            <div className="flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: gpsOk === null ? "rgba(255,255,255,0.05)" : gpsOk ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${gpsOk === null ? BRAND.border : gpsOk ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={gpsOk === null ? "#555" : gpsOk ? "#22c55e" : "#ef4444"}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            {/* Contactos */}
            <div className="flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: contactosOk ? "rgba(212,175,55,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${contactosOk ? BRAND.borderStrong : "rgba(239,68,68,0.35)"}` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={contactosOk ? BRAND.gold : "#ef4444"}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span className="text-[10px] font-bold" style={{ color: contactosOk ? BRAND.gold : "#ef4444" }}>
                {cantContactos} {cantContactos === 1 ? "contacto activo" : "contactos activos"}
              </span>
            </div>
          </div>
          <span className="text-[11px]" style={{ color: BRAND.textMute }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Detalle expandible */}
      {expanded && (
        <div className="px-4 pb-4">
          <Indicador
            ok={waOk}
            label="WhatsApp Business"
            detalleFalla="El servicio de mensajes puede estar caído. Los mensajes quedarán en cola hasta que se restablezca."
            accion={null}
          />
          <Indicador
            ok={gpsOk}
            label="Ubicación GPS"
            detalleFalla="Tu dispositivo bloqueó la ubicación. Sin GPS, tus contactos recibirán alertas sin ubicación."
            accion="Cómo activarlo"
            onAccion={() => alert("Para activar el GPS:\n\n📱 Android: Configuración → Privacidad → Permisos de ubicación → Traza 360 → Permitir\n\n🍎 iPhone: Configuración → Safari → Ubicación → Permitir\n\nDespués de activarlo, recargá la app.")}
          />
          <Indicador
            ok={contactosOk}
            label={contactosOk ? `${cantContactos} contacto${cantContactos > 1 ? "s" : ""} activo${cantContactos > 1 ? "s" : ""}` : "Sin contactos de confianza"}
            detalleFalla="Sin al menos 1 contacto, las alertas no llegan a nadie. Agregá un contacto ahora."
            accion="Agregar contacto"
            onAccion={onGoToContactos}
          />

          {/* Qué pasa si falla la app */}
          <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: BRAND.gold }}>⚡ Si la app falla en una emergencia</p>
            <div className="space-y-1.5 text-[11px]" style={{ color: BRAND.textLight }}>
              <p><strong style={{ color: BRAND.white }}>Sin internet:</strong> llamá directo al 911 desde Teléfono.</p>
              <p><strong style={{ color: BRAND.white }}>Sin GPS:</strong> la alerta se manda igual, sin ubicación.</p>
              <p><strong style={{ color: BRAND.white }}>WhatsApp caído:</strong> el mensaje se envía cuando se restablece.</p>
              <p><strong style={{ color: BRAND.white }}>App colgada:</strong> reintentá, o mandá un mensaje manual a tu contacto.</p>
            </div>
          </div>

          <button onClick={() => setExpanded(false)} className="w-full text-center text-[11px] mt-3" style={{ color: BRAND.textMute }}>
            Cerrar ▲
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ONBOARDING GUIADO v19 — paleta dorada ────
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState(null);

  const steps = [
    {
      iconType: "logo",
      title: "Bienvenido/a a Traza 360",
      subtitle: "Alguien cuida de vos.",
      desc: "Esta app te protege a vos y a quienes querés. Con un solo botón podés alertar a tu gente de confianza, compartir tu ubicación y grabar evidencia.",
      cta: "¿Empezamos a cuidarte? →",
    },
    {
      iconType: "icon",
      iconName: "contacts",
      title: "¿Para quién es esta app?",
      subtitle: "Elegí tu perfil principal",
      desc: "",
      cta: "Continuar →",
      modules: [
        { key: "mi_escudo",    iconName: "shield",   label: "Para mí — Violencia o riesgo" },
        { key: "los_cuido",    iconName: "teen",     label: "Mi hijo/a adolescente" },
        { key: "turno_seguro", iconName: "night",    label: "Salidas nocturnas / trabajo de riesgo" },
        { key: "te_cuido",     iconName: "eye",      label: "Cuidar a alguien a distancia" },
      ],
    },
    {
      iconType: "icon",
      iconName: "contacts",
      title: "Agregá contactos de confianza",
      subtitle: "Sin contactos no podemos alertar a nadie",
      desc: "Necesitás al menos 1 contacto de confianza con WhatsApp. Podés hacerlo ahora o más tarde desde el panel.",
      cta: "Empezar a usar la app →",
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      {/* Progress dots dorados */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all" style={{
            width: i === step ? "32px" : "8px",
            background: i === step ? BRAND.gold : "rgba(212,175,55,0.2)",
          }} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Card paleta dorada */}
        <div className="rounded-3xl p-8 text-center mb-6" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}`, boxShadow: "8px 8px 24px rgba(0,0,0,0.6), 0 0 30px rgba(212,175,55,0.05)" }}>
          {/* Ícono: paso 1 = logo dorado completo, otros = GoldIcon */}
          <div className="mb-4 flex justify-center">
            {current.iconType === "logo" ? (
              <PinEyeLogo size={90} showText={false} />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(154,123,15,0.08))", border: `1px solid ${BRAND.borderStrong}` }}>
                <GoldIcon name={current.iconName} size={36} />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: BRAND.white }}>{current.title}</h2>
          <p className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: BRAND.gold }}>{current.subtitle}</p>
          {current.desc && <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>{current.desc}</p>}

          {/* Step 2: selector de módulo — botones grandes */}
          {step === 1 && current.modules && (
            <div className="mt-5 space-y-3 text-left">
              {current.modules.map(m => (
                <button key={m.key} onClick={() => setSelectedModule(m.key)}
                  className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 transition-all active:scale-[0.98]"
                  style={{
                    background: selectedModule === m.key ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
                    border: selectedModule === m.key ? `2px solid ${BRAND.gold}` : `1px solid rgba(255,255,255,0.12)`,
                  }}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: selectedModule === m.key ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)" }}>
                    <GoldIcon name={m.iconName} size={26} />
                  </div>
                  <span className="text-base font-bold flex-1 text-left" style={{ color: selectedModule === m.key ? BRAND.gold : BRAND.white }}>
                    {m.label}
                  </span>
                  {selectedModule === m.key && (
                    <span className="text-lg font-bold" style={{ color: BRAND.gold }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: tips de contacto */}
          {step === 2 && (
            <div className="mt-5 space-y-3 text-left">
              {[
                { iconName: "shield", text: "El contacto recibe una verificación automática" },
                { iconName: "eye", text: "Tus contactos solo se enteran cuando los necesitás" },
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${BRAND.borderStrong}` }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(212,175,55,0.12)" }}>
                    <GoldIcon name={tip.iconName} size={22} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: BRAND.white }}>{tip.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Button dorado */}
        <button
          onClick={() => {
            if (step === 1 && !selectedModule) { return; }
            if (step < steps.length - 1) setStep(step + 1);
            else {
              try { sessionStorage.setItem("traza360_onboarding_done", "1"); } catch(e){}
              onComplete(selectedModule);
            }
          }}
          disabled={step === 1 && !selectedModule}
          className="w-full rounded-2xl py-4 font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(212,175,55,0.3)" }}>
          {current.cta}
        </button>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="w-full mt-3 py-2 text-sm" style={{ color: BRAND.gold }}>
            ← Volver
          </button>
        )}
      </div>
    </div>
  );
}

// ─── VERIFICACIÓN CONTACTO (Safety Check) ───
async function verificarContacto(telefono, nombreContacto, nombreUsuario) {
  const msg = `Hola ${nombreContacto} 👋 Soy ${nombreUsuario} y te agregué como contacto de confianza en Traza 360, una app de seguridad personal.\n\n✅ Si recibís este mensaje, todo funciona correctamente.\n\nRespondé "OK" para confirmar que lo recibiste.\n\n🛡️ Traza 360 — traza360.app`;
  return await sendWhatsAppAPI(telefono, msg);
}

// ─── GRABACION AUDIO ────────────────────────
let mediaRecorderInstance = null;
let audioChunksRef = [];

function getAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
  if (MediaRecorder.isTypeSupported("audio/aac")) return "audio/aac";
  return "";
}

function getAudioExt(mimeType) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("aac")) return "aac";
  return "webm";
}

async function iniciarGrabacion() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunksRef = [];
    const mimeType = getAudioMimeType();
    const options = mimeType ? { mimeType } : {};
    mediaRecorderInstance = new MediaRecorder(stream, options);
    mediaRecorderInstance.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.push(e.data); };
    mediaRecorderInstance.start();
    return { success: true, stream };
  } catch (e) { return { success: false, error: e.message }; }
}

function detenerGrabacion() {
  return new Promise((resolve) => {
    if (!mediaRecorderInstance || mediaRecorderInstance.state === "inactive") { resolve(null); return; }
    mediaRecorderInstance.onstop = () => {
      const mimeType = mediaRecorderInstance.mimeType || getAudioMimeType() || "audio/webm";
      const blob = new Blob(audioChunksRef, { type: mimeType });
      mediaRecorderInstance.stream.getTracks().forEach(t => t.stop());
      resolve(blob);
    };
    mediaRecorderInstance.stop();
  });
}

async function guardarEvidencia(blob, tipo = "audio") {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = getAudioExt(blob.type || "audio/webm");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const path = `${user.id}/${tipo}_${ts}.${ext}`;
    const { data, error } = await supabase.storage.from("evidencias").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
    if (error) throw error;
    return { success: true, path: data.path, cloud: true };
  } catch (e) {
    console.warn("Evidencia: fallback local", e);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `evidencia_${ts}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    return { success: true, fallback: true };
  }
}

async function listarEvidencias() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.storage.from("evidencias").list(user.id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) return [];
    return (data || []).map(f => ({ ...f, fullPath: `${user.id}/${f.name}` }));
  } catch(e) { return []; }
}

async function getEvidenciaUrl(path) {
  const { data } = await supabase.storage.from("evidencias").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

async function eliminarEvidencia(path) {
  const { error } = await supabase.storage.from("evidencias").remove([path]);
  return !error;
}

// ─── MODO TESTIGO (v19.11) ──────────────────────────────────
// Audio + fotos cámara frontal + trasera + subida inmediata a nube
// Inspirado en bSafe. Legal: el usuario lo activa conscientemente.

async function capturarFoto(facingMode = "environment") {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    await new Promise(r => { video.onloadedmetadata = r; });
    await video.play();
    await new Promise(r => setTimeout(r, 300)); // pequeña espera para que el sensor se ajuste
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch(e) {
    console.warn(`Cámara ${facingMode} no disponible:`, e.message);
    return null;
  }
}

async function subirFotoEvidencia(blob, etiqueta = "foto") {
  if (!blob) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ts   = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${user.id}/${etiqueta}_${ts}.jpg`;
    const { data, error } = await supabase.storage
      .from("evidencias")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return { path: data.path, cloud: true };
  } catch(e) {
    console.warn("Error subiendo foto:", e.message);
    return null;
  }
}

// ── Componente principal ─────────────────────────────────────
function ModoTestigoModal({ onClose, contactos }) {
  const [fase,        setFase]        = useState("confirmar"); // confirmar | activo | detenido
  const [tiempo,      setTiempo]      = useState(0);
  const [eventos,     setEventos]     = useState([]);   // log de acciones
  const [fotosCount,  setFotosCount]  = useState(0);
  const [audioOk,     setAudioOk]     = useState(false);
  const [error,       setError]       = useState("");

  const timerRef    = useRef(null);
  const fotoRef     = useRef(null);
  const streamRef   = useRef(null); // track del audio para parar

  // Limpiar al desmontar
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(fotoRef.current);
    try { detenerGrabacion(); } catch(e) {}
    streamRef.current?.getTracks?.().forEach(t => t.stop());
  }, []);

  function agregarEvento(icono, texto) {
    const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEventos(prev => [{ id: Date.now(), icono, texto, hora }, ...prev.slice(0, 29)]);
  }

  async function activar() {
    setFase("activo");
    setTiempo(0);
    setFotosCount(0);
    setEventos([]);
    setError("");

    // ── 1. Iniciar audio ──────────────────────────────────────
    const audioResult = await iniciarGrabacion();
    if (audioResult.success) {
      setAudioOk(true);
      streamRef.current = audioResult.stream;
      agregarEvento("🎙️", "Audio iniciado — grabando entorno");
    } else {
      agregarEvento("⚠️", "Micrófono no disponible");
    }

    // ── 2. Fotos inmediatas (frontal + trasera) ───────────────
    capturarYSubir();

    // ── 3. Timer de tiempo transcurrido ──────────────────────
    timerRef.current = setInterval(() => setTiempo(t => t + 1), 1000);

    // ── 4. Foto cada 30 segundos ──────────────────────────────
    fotoRef.current = setInterval(() => capturarYSubir(), 30000);
  }

  async function capturarYSubir() {
    // Frontal
    agregarEvento("📸", "Capturando cámara frontal...");
    const fotoFrontal  = await capturarFoto("user");
    if (fotoFrontal) {
      const r = await subirFotoEvidencia(fotoFrontal, "frontal");
      agregarEvento("☁️", r ? "Foto frontal → nube ✓" : "Foto frontal → guardada local");
      setFotosCount(n => n + 1);
    } else {
      agregarEvento("⚠️", "Cámara frontal no disponible");
    }

    // Trasera
    agregarEvento("📸", "Capturando cámara trasera...");
    const fotoTrasera = await capturarFoto("environment");
    if (fotoTrasera) {
      const r = await subirFotoEvidencia(fotoTrasera, "trasera");
      agregarEvento("☁️", r ? "Foto trasera → nube ✓" : "Foto trasera → guardada local");
      setFotosCount(n => n + 1);
    } else {
      agregarEvento("⚠️", "Cámara trasera no disponible");
    }
  }

  async function detener() {
    clearInterval(timerRef.current);
    clearInterval(fotoRef.current);

    // Detener y guardar audio
    if (audioOk) {
      agregarEvento("🎙️", "Guardando audio...");
      const blob = await detenerGrabacion();
      if (blob) {
        const r = await guardarEvidencia(blob, "audio");
        agregarEvento("☁️", r.cloud ? "Audio guardado en nube ✓" : "Audio guardado localmente");
      }
    }

    setFase("detenido");
    agregarEvento("✅", "Modo Testigo detenido. Evidencias guardadas.");
  }

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: "#000", border: `2px solid ${fase === "activo" ? BRAND.red : BRAND.borderStrong}`, maxHeight: "92vh", overflowY: "auto" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-12 rounded-full" style={{ background: BRAND.borderStrong }} />
        </div>

        {/* ── CONFIRMACIÓN ── */}
        {fase === "confirmar" && (
          <div className="px-5 pb-7 pt-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: BRAND.white }}>Modo Testigo</h2>
                <p className="text-sm mt-0.5" style={{ color: BRAND.textLight }}>Audio + fotos + nube automática</p>
              </div>
              <button onClick={onClose} style={{ color: BRAND.textMute, fontSize: 22 }}>✕</button>
            </div>

            {/* Qué va a pasar */}
            <div className="rounded-2xl p-4 mb-5 space-y-3"
              style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.borderStrong}` }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: BRAND.gold }}>
                Al activar, simultáneamente:
              </p>
              {[
                ["🎙️", "Audio del entorno", "Grabación continua hasta que detengas"],
                ["📸", "Foto cámara frontal", "Inmediata + cada 30 segundos"],
                ["📸", "Foto cámara trasera", "Inmediata + cada 30 segundos"],
                ["☁️", "Subida automática", "Todo a tu nube en tiempo real"],
              ].map(([ic, tit, sub], i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{ic}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: BRAND.white }}>{tit}</p>
                    <p className="text-[11px]" style={{ color: BRAND.textLight }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Aviso legal */}
            <div className="rounded-xl p-3 mb-5"
              style={{ background: "rgba(220,38,38,0.05)", border: `1px solid ${BRAND.red}30` }}>
              <p className="text-[11px] leading-relaxed" style={{ color: BRAND.textLight }}>
                ⚖️ <strong style={{ color: BRAND.white }}>Uso responsable:</strong> grabás tu propio entorno. No uses esto para grabar a personas sin su consentimiento.
              </p>
            </div>

            {/* El navegador va a pedir permisos */}
            <div className="rounded-xl p-3 mb-5"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-[11px]" style={{ color: BRAND.textLight }}>
                💡 El navegador te va a pedir permiso para <strong style={{ color: BRAND.white }}>micrófono y cámara</strong>. Tocá "Permitir" en ambos.
              </p>
            </div>

            <button onClick={activar}
              className="w-full rounded-2xl py-4 font-bold text-base"
              style={{ background: `linear-gradient(135deg, ${BRAND.red}, #b91c1c)`, color: BRAND.white, boxShadow: "0 8px 30px rgba(220,38,38,0.35)" }}>
              🔴 Activar Modo Testigo
            </button>
            <button onClick={onClose}
              className="w-full py-3 text-sm mt-2"
              style={{ color: BRAND.textMute }}>
              Cancelar
            </button>
          </div>
        )}

        {/* ── ACTIVO ── */}
        {fase === "activo" && (
          <div className="px-5 pb-7 pt-3">
            {/* Header rojo pulsando */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-bold" style={{ color: "#fca5a5" }}>MODO TESTIGO ACTIVO</span>
              </div>
              <span className="font-mono text-lg font-bold" style={{ color: BRAND.white }}>{fmt(tiempo)}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { icon: "🎙️", label: "Audio",  val: audioOk ? "Grabando" : "No disp.", ok: audioOk },
                { icon: "📸", label: "Fotos",  val: `${fotosCount} guardadas`, ok: fotosCount > 0 },
                { icon: "☁️", label: "Nube",   val: "Activa", ok: true },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 text-center"
                  style={{ background: s.ok ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${s.ok ? "rgba(34,197,94,0.25)" : BRAND.border}` }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.ok ? "#22c55e" : BRAND.textMute }}>{s.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: BRAND.textMute }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Log de eventos */}
            <div className="rounded-2xl overflow-hidden mb-4"
              style={{ border: `1px solid ${BRAND.border}`, maxHeight: 220, overflowY: "auto" }}>
              <div className="px-3 py-2 sticky top-0"
                style={{ background: "rgba(0,0,0,0.9)", borderBottom: `1px solid ${BRAND.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND.gold }}>
                  Registro en tiempo real
                </p>
              </div>
              {eventos.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm" style={{ color: BRAND.textLight }}>Iniciando...</p>
                </div>
              ) : eventos.map(ev => (
                <div key={ev.id} className="flex items-start gap-2 px-3 py-2"
                  style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                  <span className="text-sm shrink-0">{ev.icono}</span>
                  <p className="flex-1 text-[11px] leading-relaxed" style={{ color: BRAND.textLight }}>{ev.texto}</p>
                  <span className="text-[10px] shrink-0 font-mono" style={{ color: BRAND.textMute }}>{ev.hora}</span>
                </div>
              ))}
            </div>

            <button onClick={detener}
              className="w-full rounded-2xl py-4 font-bold text-sm"
              style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
              ✅ Detener y guardar todo
            </button>
          </div>
        )}

        {/* ── DETENIDO ── */}
        {fase === "detenido" && (
          <div className="px-5 pb-8 pt-4">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#22c55e" }}>Evidencias guardadas</h2>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                {fotosCount} foto{fotosCount !== 1 ? "s" : ""} · {fmt(tiempo)} de audio · todo en tu nube
              </p>
            </div>

            {/* Resumen log */}
            <div className="rounded-2xl overflow-hidden mb-5"
              style={{ border: `1px solid ${BRAND.border}`, maxHeight: 180, overflowY: "auto" }}>
              {eventos.map(ev => (
                <div key={ev.id} className="flex items-start gap-2 px-3 py-2"
                  style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                  <span className="text-sm shrink-0">{ev.icono}</span>
                  <p className="flex-1 text-[11px]" style={{ color: BRAND.textLight }}>{ev.texto}</p>
                  <span className="text-[10px] shrink-0 font-mono" style={{ color: BRAND.textMute }}>{ev.hora}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button onClick={() => { onClose(); /* navegar a evidencias */ }}
                className="w-full rounded-2xl py-3.5 font-bold text-sm"
                style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                Ver mis evidencias
              </button>
              <button onClick={onClose}
                className="w-full rounded-2xl py-3 text-sm"
                style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
                Volver al panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL GRABACION ────────────────────────
function GrabacionModal({ onClose }) {
  const [grabando, setGrabando] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => { if (!grabando) return; const id = setInterval(() => setTiempo(t => t + 1), 1000); return () => clearInterval(id); }, [grabando]);

  async function iniciar() {
    setError("");
    const r = await iniciarGrabacion();
    if (r.success) { setGrabando(true); setTiempo(0); }
    else setError("No se pudo acceder al micrófono.");
  }

  async function detener() {
    const blob = await detenerGrabacion();
    setGrabando(false);
    if (blob) { const result = await guardarEvidencia(blob, "audio"); setGuardado(result.cloud ? "nube" : "local"); }
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#08080c] p-6 shadow-2xl">
        <div className="text-center">
          <div className="mb-3 text-4xl">{guardado ? "\u2705" : "\u{1F399}\u{FE0F}"}</div>
          <div className="text-lg font-bold text-slate-100">{guardado ? "Evidencia guardada" : "Grabación silenciosa"}</div>
          {guardado ? (
            <><p className="mt-2 text-sm text-slate-300">{guardado === "nube" ? "Guardado en la nube. Accedé desde Mis Evidencias." : "Descargado en tu dispositivo."}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">Listo</button></>
          ) : grabando ? (
            <><div className="my-6 rounded-2xl border border-red-500/30 bg-red-500/10 py-6">
              <div className="flex items-center justify-center gap-2 mb-2"><div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div><span className="text-sm font-semibold text-red-300 uppercase tracking-widest">Grabando</span></div>
              <div className="font-mono text-4xl font-bold text-white tabular-nums">{fmt(tiempo)}</div>
            </div>
            <button onClick={detener} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">Detener y guardar</button></>
          ) : (
            <><p className="mt-2 text-sm text-slate-300">Graba audio del entorno sin hacer ruido.</p>
            {error && <p className="text-sm text-red-400 my-2">{error}</p>}
            <button onClick={iniciar} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">Iniciar grabación silenciosa</button>
            <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300">Cancelar</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHECK-IN TEMPORIZADO ────────────────────
function CheckInModal({ onClose, contactos, titulo = "Botón de ingreso" }) {
  const [minutos, setMinutos] = useState(30);
  const [minutosCustom, setMinutosCustom] = useState("");
  const [activo, setActivo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [alertaEnviada, setAlertaEnviada] = useState(false);
  // v19: selector de contactos a quien avisar si no se desactiva
  const [seleccionados, setSeleccionados] = useState(contactos.length > 0 ? [contactos[0].id] : []);
  const timerRef = useRef(null);

  function toggleContacto(id) {
    setSeleccionados(seleccionados.includes(id) ? seleccionados.filter(x => x !== id) : [...seleccionados, id]);
  }

  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  function aplicarCustom() {
    const n = parseInt(minutosCustom, 10);
    if (!isNaN(n) && n >= 1 && n <= 1440) {
      setMinutos(n);
    }
  }

  function iniciar() {
    if (seleccionados.length === 0) {
      alert("Seleccioná al menos 1 contacto que reciba la alerta si no desactivás el timer.");
      return;
    }
    setTiempoRestante(minutos * 60);
    setActivo(true);
    // Aviso inicial a TODOS los contactos seleccionados
    getCurrentLocationWithFallback().then(({ location }) => {
      const msg = buildMessageWithReply(`Activé un botón de ingreso a un lugar. Si no confirmo en ${minutos} minutos que estoy bien, necesito ayuda.`, location);
      const elegidos = contactos.filter(c => seleccionados.includes(c.id));
      elegidos.forEach(c => enviarWhatsApp(c.telefono, msg));
    });
  }

  useEffect(() => {
    if (!activo) return;
    timerRef.current = setInterval(() => {
      setTiempoRestante(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          enviarNotificacion("ALERTA TRAZA 360", "No confirmaste que estás bien.");
          reproducirSonido();
          // Alerta automática a TODOS los seleccionados
          getCurrentLocationWithFallback().then(({ location }) => {
            const msg = buildMessageWithReply("ALERTA AUTOMÁTICA — No confirmó que está bien en el tiempo acordado. Verificar urgente.", location);
            const elegidos = contactos.filter(c => seleccionados.includes(c.id));
            elegidos.forEach(c => enviarWhatsApp(c.telefono, msg));
          });
          setAlertaEnviada(true);
          setActivo(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activo, seleccionados, contactos]);

  function estoyBien() {
    clearInterval(timerRef.current);
    setActivo(false);
    // Aviso de "estoy bien" a todos los seleccionados
    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
    elegidos.forEach(c => enviarWhatsApp(c.telefono, "Estoy bien. Todo en orden."));
    onClose();
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const pct = activo ? (tiempoRestante / (minutos * 60)) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl my-auto" style={{ background: "#000000", border: `1px solid ${BRAND.borderStrong}` }}>
        <div className="text-center">
          {alertaEnviada ? (
            <>
              <div className="text-5xl mb-3">{"\u{1F6A8}"}</div>
              <div className="text-lg font-bold" style={{ color: BRAND.red }}>Alerta enviada automáticamente</div>
              <p className="mt-2 text-sm" style={{ color: BRAND.textLight }}>Se alertó a tus contactos seleccionados porque no confirmaste.</p>
              <button onClick={onClose} className="mt-4 w-full rounded-2xl py-3 text-sm font-semibold" style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>Cerrar</button>
            </>
          ) : activo ? (
            <>
              <div className="mb-2"><GoldIcon name="timer" size={36} /></div>
              <div className="text-base font-bold" style={{ color: BRAND.white }}>{titulo}</div>
              <p className="mt-1 text-sm mb-4" style={{ color: BRAND.textLight }}>Si no tocás "Estoy bien" antes de que termine, se alerta a tus contactos.</p>
              <div className="relative mx-auto mb-4" style={{ width: 120, height: 120 }}>
                <svg viewBox="0 0 120 120" className="rotate-[-90deg]" width={120} height={120}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={BRAND.gold} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-2xl font-bold" style={{ color: BRAND.white }}>{fmt(tiempoRestante)}</span>
                </div>
              </div>
              <button onClick={estoyBien} className="w-full rounded-2xl py-3 text-sm font-bold shadow-lg mb-2" style={{ background: BRAND.goldGradient, color: BRAND.black }}>{"\u2705"} Estoy bien</button>
              <button onClick={() => { clearInterval(timerRef.current); setActivo(false); }} className="w-full rounded-2xl py-2.5 text-sm" style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>Cancelar timer</button>
            </>
          ) : (
            <>
              <div className="mb-2"><GoldIcon name="timer" size={36} /></div>
              <div className="text-base font-bold" style={{ color: BRAND.white }}>{titulo}</div>
              <p className="mt-2 text-sm mb-4" style={{ color: BRAND.textLight }}>Elegí cuánto tiempo. Si no confirmás, se alerta automáticamente.</p>

              {/* Opciones rápidas */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[15, 30, 60, 120].map(m => (
                  <button key={m} onClick={() => { setMinutos(m); setMinutosCustom(""); }}
                    className="rounded-xl py-3 text-sm font-semibold"
                    style={{
                      background: minutos === m && !minutosCustom ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                      border: minutos === m && !minutosCustom ? `1px solid ${BRAND.borderStrong}` : `1px solid ${BRAND.border}`,
                      color: minutos === m && !minutosCustom ? BRAND.gold : BRAND.textMute,
                    }}>
                    {m >= 60 ? `${m/60}h` : `${m}m`}
                  </button>
                ))}
              </div>

              {/* v19: Tiempo personalizado */}
              <div className="mb-3">
                <label className="text-[11px] uppercase tracking-wider block mb-1 text-left" style={{ color: BRAND.textLight }}>O personalizado (minutos)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={minutosCustom}
                    onChange={e => setMinutosCustom(e.target.value)}
                    placeholder="Ej: 45"
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
                  />
                  <button onClick={aplicarCustom}
                    className="rounded-xl px-4 text-sm font-semibold"
                    style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
                    Aplicar
                  </button>
                </div>
                {minutosCustom && !isNaN(parseInt(minutosCustom)) && parseInt(minutosCustom) >= 1 && (
                  <p className="text-[11px] mt-1 text-left" style={{ color: BRAND.gold }}>Timer: {minutos} minutos</p>
                )}
              </div>

              {/* v19: Selector de contactos */}
              <div className="mb-3 text-left">
                <label className="text-[11px] uppercase tracking-wider block mb-2" style={{ color: BRAND.textLight }}>
                  Avisar a ({seleccionados.length}/{contactos.length})
                </label>
                {contactos.length === 0 ? (
                  <p className="text-sm rounded-xl px-3 py-2.5" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}33`, color: "#fca5a5" }}>
                    Sin contactos. Agregá uno primero desde el panel.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {contactos.map(c => (
                      <button key={c.id} onClick={() => toggleContacto(c.id)}
                        className="w-full rounded-lg px-3 py-2 flex items-center gap-2 text-left transition-all"
                        style={{
                          background: seleccionados.includes(c.id) ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                          border: seleccionados.includes(c.id) ? `1px solid ${BRAND.borderStrong}` : `1px solid ${BRAND.border}`,
                        }}>
                        <span className="text-base shrink-0">{getRelEmoji(c.relacion)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: BRAND.white }}>{c.nombre}</div>
                          <div className="text-[11px]" style={{ color: BRAND.textMute }}>{c.relacion}</div>
                        </div>
                        <div className="h-4 w-4 rounded-full shrink-0" style={{
                          background: seleccionados.includes(c.id) ? BRAND.gold : "transparent",
                          border: `2px solid ${seleccionados.includes(c.id) ? BRAND.gold : "rgba(255,255,255,0.3)"}`,
                        }}>
                          {seleccionados.includes(c.id) && <div className="text-black text-[10px] text-center leading-3">{"\u2713"}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${BRAND.red}33` }}>
                <p className="text-sm text-center" style={{ color: "#fca5a5" }}>⚠️ Si no desactivás el timer, se enviará tu ubicación y alerta automática a los contactos seleccionados.</p>
              </div>
              <button onClick={iniciar} disabled={contactos.length === 0 || seleccionados.length === 0}
                className="w-full rounded-2xl py-3 text-sm font-bold shadow-lg mb-2 disabled:opacity-40"
                style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                Activar ({minutos} min)
              </button>
              <button onClick={onClose} className="w-full rounded-2xl py-2.5 text-sm" style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PANTALLA EVIDENCIAS ────────────────────
function EvidenciasScreen({ onBack }) {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioName, setAudioName] = useState(null);

  useEffect(() => { cargar(); }, []);
  async function cargar() { setLoading(true); setArchivos(await listarEvidencias()); setLoading(false); }

  async function reproducir(f) {
    const url = await getEvidenciaUrl(f.fullPath);
    if (!url) { alert("No se pudo obtener el archivo."); return; }
    setAudioUrl(url); setAudioName(f.name);
  }

  async function eliminar(f) {
    if (!window.confirm("Eliminar esta evidencia?")) return;
    await eliminarEvidencia(f.fullPath);
    if (audioName === f.name) { setAudioUrl(null); setAudioName(null); }
    cargar();
  }

  async function descargar(f) {
    const url = await getEvidenciaUrl(f.fullPath);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen px-5 py-8 text-white" style={{ background: "linear-gradient(180deg, #0a0a10 0%, #0d0d16 40%, #0a0a10 100%)" }}>
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: "#E0E0E0" }}>{"\u2190"} Volver al panel</button>
        <div className="mb-6 rounded-2xl p-6" style={{ background: "linear-gradient(145deg, #13131d, #0e0e16)", border: "1px solid rgba(224,224,224,0.1)" }}>
          <p className="text-[12px] uppercase tracking-[3px]" style={{ color: "#E0E0E0" }}>Mis archivos protegidos</p>
          <h2 className="mt-2 text-xl font-bold">Mis Evidencias</h2>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Grabaciones guardadas en la nube con cifrado.</p>
        </div>

        {audioUrl && (
          <div className="mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #101018, #08080c)", border: "1px solid rgba(224,224,224,0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{"\u{1F3B5}"}</span>
              <span className="text-sm font-semibold" style={{ color: "#E0E0E0" }}>Reproduciendo: {audioName}</span>
              <button onClick={() => { setAudioUrl(null); setAudioName(null); }} className="ml-auto text-sm text-slate-400">{"\u2715"}</button>
            </div>
            <audio controls autoPlay src={audioUrl} style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
          </div>
        )}

        {loading ? <div className="text-center py-8 text-slate-300">Cargando...</div>
        : archivos.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(145deg, #0c0c14, #08080c)", border: "1px solid rgba(224,224,224,0.08)" }}>
            <div className="text-5xl mb-3">{"\u{1F4C1}"}</div>
            <h3 className="text-lg font-semibold text-white">Sin evidencias</h3>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Cuando grabes audio desde cualquier módulo, aparecerá acá.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivos.map((f, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #0c0c14, #08080c)", border: audioName === f.name ? "1px solid rgba(224,224,224,0.3)" : "1px solid rgba(224,224,224,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{"\u{1F399}\u{FE0F}"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                      <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{f.metadata?.size ? (f.metadata.size / 1024).toFixed(0) + " KB" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => reproducir(f)} className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: "rgba(224,224,224,0.08)", border: "1px solid rgba(224,224,224,0.2)", color: "#E0E0E0" }}>
                      {audioName === f.name ? "\u{1F50A} Escuchando" : "\u25B6\u{FE0F} Escuchar"}
                    </button>
                    <button onClick={() => descargar(f)} className="rounded-lg px-2 py-1.5 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>{"\u{2B07}\u{FE0F}"}</button>
                    <button onClick={() => eliminar(f)} className="rounded-lg px-2 py-1.5 text-sm" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}>{"\u{1F5D1}\u{FE0F}"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PASTILLERO VIRTUAL
// (Componente conservado — no se elimina código,
//  solo se oculta el módulo Adulto Mayor del panel.
//  Si en el futuro reactivás el módulo, el Pastillero
//  ya está listo para usar.)
// ═══════════════════════════════════════════════
function PastilleroScreen({ onBack, userPlan = "gratis", contactos = [] }) {
  const [meds, setMeds] = useState([]);
  const [tomasHoy, setTomasHoy] = useState([]);
  const [tomasSemana, setTomasSemana] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("hoy");
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [dosis, setDosis] = useState("");
  const [horarios, setHorarios] = useState(["08:00"]);
  const [diasSel, setDiasSel] = useState([1,2,3,4,5,6,7]);
  const [colorSel, setColorSel] = useState("blue");
  const [notifFamiliar, setNotifFamiliar] = useState(false);
  const [saving, setSaving] = useState(false);

  const limites = PLAN_LIMITS[userPlan] || PLAN_LIMITS.gratis;
  const maxMeds = limites.medicamentos;
  const timersRef = useRef([]);

  useEffect(() => { cargarTodo(); pedirPermisoNotificaciones(); return () => timersRef.current.forEach(t => clearTimeout(t)); }, []);

  async function cargarTodo() {
    setLoading(true);
    const m = await getMedicamentos();
    setMeds(m);
    if (m.length > 0) await crearTomasDelDia(m);
    const th = await getTomasHoy();
    setTomasHoy(th);
    const ts = await getTomasSemana();
    setTomasSemana(ts);
    setLoading(false);
    programarAlarmas(th);
  }

  function programarAlarmas(tomas) {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    const ahora = new Date();
    tomas.filter(t => !t.tomado).forEach(t => {
      const [h, m] = t.horario_programado.split(":").map(Number);
      const target = new Date(); target.setHours(h, m, 0, 0);
      const diff = target.getTime() - ahora.getTime();
      if (diff > 0 && diff < 86400000) {
        const tid = setTimeout(() => {
          const medNombre = t.medicamentos?.nombre || "Medicamento";
          enviarNotificacion("Hora de tu medicación", `${medNombre} ${t.medicamentos?.dosis || ""} - ${t.horario_programado}`);
          reproducirSonido();
          if (notifFamiliar && contactos.length > 0) {
            const tid2 = setTimeout(async () => {
              const tomasActualizadas = await getTomasHoy();
              const estaT = tomasActualizadas.find(x => x.id === t.id);
              if (estaT && !estaT.tomado) {
                enviarWhatsAppSilencioso(contactos[0].telefono, `\u{1F48A} AVISO PASTILLERO: No se confirmó la toma de ${medNombre} (${t.horario_programado}). Por favor verificar.`);
              }
            }, 600000);
            timersRef.current.push(tid2);
          }
        }, diff);
        timersRef.current.push(tid);
      }
    });
  }

  async function handleTome(tomaId) {
    const r = await marcarTomado(tomaId);
    if (r.success) { reproducirSonido(); cargarTodo(); }
  }

  async function handleAgregar() {
    setError("");
    if (!nombre.trim()) { setError("Ponele un nombre al medicamento."); return; }
    if (horarios.length === 0) { setError("Agregá al menos 1 horario."); return; }
    if (diasSel.length === 0) { setError("Seleccioná al menos 1 día."); return; }
    if (maxMeds > 0 && meds.length >= maxMeds) { setError(`Tu plan permite solo ${maxMeds} medicamento(s). Pasate a Premium.`); return; }
    setSaving(true);
    const r = await addMedicamento({
      nombre: nombre.trim(), dosis: dosis.trim(), horarios, dias_semana: diasSel,
      color: colorSel, notificar_familiar: notifFamiliar,
      contacto_familiar_id: notifFamiliar && contactos.length > 0 ? contactos[0].id : null,
    });
    setSaving(false);
    if (r.success) { setVista("hoy"); setNombre(""); setDosis(""); setHorarios(["08:00"]); setDiasSel([1,2,3,4,5,6,7]); cargarTodo(); }
    else setError(r.error || "Error al guardar.");
  }

  async function handleEliminar(id) {
    if (!window.confirm("Eliminar este medicamento?")) return;
    await deleteMedicamento(id); cargarTodo();
  }

  function addHorario() { setHorarios([...horarios, "12:00"]); }
  function removeHorario(i) { setHorarios(horarios.filter((_, idx) => idx !== i)); }
  function updateHorario(i, val) { const h = [...horarios]; h[i] = val; setHorarios(h); }
  function toggleDia(d) { setDiasSel(diasSel.includes(d) ? diasSel.filter(x => x !== d) : [...diasSel, d].sort()); }
  function getColorObj(key) { return COLORES_MED.find(c => c.key === key) || COLORES_MED[0]; }

  function getCalendarioSemana() {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const fecha = d.toISOString().split("T")[0];
      const tomasDia = tomasSemana.filter(t => t.fecha === fecha);
      const total = tomasDia.length; const tomadas = tomasDia.filter(t => t.tomado).length;
      const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      dias.push({ fecha, dia: dayNames[d.getDay()], total, tomadas, hoy: i === 0 });
    }
    return dias;
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver al panel</button>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm uppercase tracking-[0.18em] text-gray-300">Adulto Mayor — Pastillero</p>
              <h2 className="mt-2 text-2xl font-bold">Mis Medicamentos</h2></div>
            <span className="text-3xl">{"\u{1F48A}"}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Plan: <span className="text-gray-300 font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span> · {meds.length}/{maxMeds === -1 ? "∞" : maxMeds} medicamentos
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          {[{k:"hoy",l:"Hoy"},{k:"semana",l:"Semana"},{k:"agregar",l:"+ Agregar"}].map(tab => (
            <button key={tab.k} onClick={() => setVista(tab.k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${vista === tab.k ? "bg-white/15 text-gray-300 border border-white/30" : "bg-white/5 text-slate-300 border border-white/10"}`}>
              {tab.l}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-8 text-slate-300">Cargando...</div> : null}

        {!loading && vista === "hoy" && (
          <>
            {tomasHoy.length === 0 && meds.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">{"\u{1F48A}"}</div>
                <h3 className="text-lg font-semibold text-slate-100">Sin medicamentos</h3>
                <p className="mt-2 text-sm text-slate-300">Agregá el primer medicamento.</p>
              </div>
            ) : tomasHoy.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">{"\u2705"}</div>
                <h3 className="text-lg font-semibold text-slate-100">No hay tomas para hoy</h3>
              </div>
            ) : (
              <div className="space-y-3">
                {tomasHoy.map(t => {
                  const col = getColorObj(t.medicamentos?.color);
                  const ahora = new Date();
                  const [h, m] = t.horario_programado.split(":").map(Number);
                  const horaToma = new Date(); horaToma.setHours(h, m, 0, 0);
                  const pasado = ahora > horaToma;
                  return (
                    <div key={t.id} className={`rounded-2xl border ${col.border} ${col.bg} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`h-3 w-3 rounded-full shrink-0 ${t.tomado ? "bg-emerald-400" : pasado ? "bg-red-400 animate-pulse" : col.dot}`}></div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-100">{t.medicamentos?.nombre}</div>
                            <div className="text-sm text-slate-300">{t.medicamentos?.dosis} · {t.horario_programado}hs</div>
                          </div>
                        </div>
                        {t.tomado ? (
                          <span className="text-sm text-emerald-300 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">Tomado {t.tomado_en ? new Date(t.tomado_en).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        ) : (
                          <button onClick={() => handleTome(t.id)} className="rounded-xl bg-gradient-to-r from-slate-300 to-gray-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shrink-0">Tomé</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {meds.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Medicamentos activos</h3>
                <div className="space-y-2">
                  {meds.map(med => {
                    const col = getColorObj(med.color);
                    return (
                      <div key={med.id} className={`rounded-xl border ${col.border} bg-white/5 p-3 flex items-center justify-between gap-3`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`}></div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-100">{med.nombre}</span>
                            <span className="text-sm text-slate-300 ml-2">{med.dosis}</span>
                            <div className="text-[11px] text-slate-400">{(med.horarios || []).join(" · ")}hs</div>
                          </div>
                        </div>
                        <button onClick={() => handleEliminar(med.id)} className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-1.5 shrink-0">Eliminar</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && vista === "semana" && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Calendario semanal</h3>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {getCalendarioSemana().map(d => (
                <div key={d.fecha} className={`rounded-xl border p-3 text-center ${d.hoy ? "border-white/30 bg-gray-400/10" : "border-white/10 bg-white/5"}`}>
                  <div className="text-sm text-slate-300 mb-1">{d.dia}</div>
                  <div className="text-lg mb-1">{d.total === 0 ? "\u2796" : d.tomadas === d.total ? "\u2705" : d.tomadas > 0 ? "\u26A0\u{FE0F}" : "\u274C"}</div>
                  <div className="text-[12px] text-slate-400">{d.total > 0 ? `${d.tomadas}/${d.total}` : "-"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && vista === "agregar" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-bold mb-4">Agregar medicamento</h3>
            <div className="space-y-4">
              <div><label className="text-sm text-slate-300 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Losartán"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400" /></div>
              <div><label className="text-sm text-slate-300 block mb-1">Dosis</label>
                <input type="text" value={dosis} onChange={e => setDosis(e.target.value)} placeholder="Ej: 50mg"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400" /></div>
              <div><label className="text-sm text-slate-300 block mb-2">Horarios</label>
                {horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input type="time" value={h} onChange={e => updateHorario(i, e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                    {horarios.length > 1 && <button onClick={() => removeHorario(i)} className="text-red-400 text-sm">Quitar</button>}
                  </div>
                ))}
                <button onClick={addHorario} className="text-sm text-gray-300 mt-1">+ Agregar horario</button></div>
              <div><label className="text-sm text-slate-300 block mb-2">Días</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(d => (
                    <button key={d.num} onClick={() => toggleDia(d.num)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${diasSel.includes(d.num) ? "border-white/30 bg-gray-400/10 text-gray-300" : "border-white/10 bg-white/5 text-slate-300"}`}>
                      {d.short}
                    </button>
                  ))}
                </div></div>
              <div><label className="text-sm text-slate-300 block mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORES_MED.map(c => (
                    <button key={c.key} onClick={() => setColorSel(c.key)}
                      className={`h-8 w-8 rounded-full ${c.dot} ${colorSel === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-[#07111f]" : "opacity-60"}`} />
                  ))}
                </div></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setNotifFamiliar(!notifFamiliar)}
                  className={`h-6 w-11 rounded-full shrink-0 ${notifFamiliar ? "bg-white/80" : "bg-white/20"} relative`}>
                  <div className="h-5 w-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: notifFamiliar ? "22px" : "2px" }} />
                </button>
                <span className="text-sm text-slate-300">Avisar a familiar si no confirmo en 10 min</span>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {maxMeds > 0 && meds.length >= maxMeds ? (
                <UpgradeBanner feature="más medicamentos" />
              ) : (
                <button onClick={handleAgregar} disabled={saving} className="w-full rounded-xl bg-gradient-to-r from-slate-300 to-gray-400 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar medicamento"}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLANES SCREEN (v19.5 — Lista de espera honesta) ────────────
// MercadoPago todavía NO está integrado. En lugar de mentir o cobrar fake,
// le pedimos al usuario su email para avisarle cuando esté listo.
// Esto nos da una lista de espera real = validación de mercado.
function PlanesScreen({ onBack, currentPlan = "gratis" }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [emailWaitlist, setEmailWaitlist] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(null); // null o "plan key"
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const planes = [
    { key: "plus", name: "Plus", price: "US$2.99", priceARS: "$2.500", period: "/mes", popular: false,
      features: ["3 módulos activos", "5 contactos", "Grabación de audio", "Botón de ingreso temporizado", "Historial 30 días"] },
    { key: "premium", name: "Premium", price: "US$5.99", priceARS: "$5.000", period: "/mes", popular: true,
      features: ["TODOS los módulos", "10 contactos", "Audio + Video", "Te Cuido (remoto)", "Almacenamiento ilimitado", "Soporte prioritario"] },
    { key: "anual", name: "Premium Anual", price: "US$49.99", priceARS: "$42.000", period: "/año", popular: false, badge: "30% OFF",
      features: ["Todo lo del Premium", "Ahorrás 30%", "2 meses gratis"] },
  ];

  function abrirFormulario(planKey) {
    setShowEmailForm(planKey);
    setEnviado(false);
    setEmailWaitlist("");
  }

  async function unirseListaEspera(plan) {
    if (!emailWaitlist.trim() || !emailWaitlist.includes("@")) {
      alert("Ingresá un email válido.");
      return;
    }
    setEnviando(true);
    try {
      // Guardar en sessionStorage (en producción se guarda en Supabase tabla "lista_espera")
      const lista = JSON.parse(sessionStorage.getItem("traza360_lista_espera") || "[]");
      lista.push({
        email: emailWaitlist.trim(),
        plan: plan.key,
        precio: plan.priceARS,
        fecha: new Date().toISOString(),
      });
      sessionStorage.setItem("traza360_lista_espera", JSON.stringify(lista));

      // Avisar a Tristan por WhatsApp para que tenga el lead
      const mensaje = `Nueva inscripción a lista de espera Traza 360:\nPlan: ${plan.name} (${plan.priceARS}${plan.period})\nEmail: ${emailWaitlist.trim()}\nFecha: ${new Date().toLocaleString('es-AR')}`;
      try {
        await sendWhatsAppAPI(WHATSAPP_NUMBER_DEFAULT, mensaje);
      } catch(e) { console.warn("No se pudo notificar a admin:", e); }

      setEnviado(true);
      setEnviando(false);
    } catch(e) {
      alert("Error al guardar tu interés. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="text-2xl mr-3" style={{ color: BRAND.gold }}>{"\u2190"}</button>
          <h1 className="text-xl font-bold" style={{ color: BRAND.white }}>Próximos planes</h1>
        </div>

        {/* AVISO HONESTO ARRIBA */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BRAND.borderStrong}` }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{"\u{1F6E0}\u{FE0F}"}</span>
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: BRAND.gold }}>Estamos terminando la pasarela de pago</p>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                Por ahora <strong style={{ color: BRAND.white }}>toda la app es gratis</strong>. Si te interesa alguno de estos planes, dejanos tu email y te avisamos en cuanto esté lista la suscripción.
              </p>
            </div>
          </div>
        </div>

        {/* Plan actual */}
        <div className="rounded-xl p-3 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}` }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{"\u{1F513}"}</span>
            <div>
              <div className="text-sm" style={{ color: BRAND.textLight }}>Tu plan actual</div>
              <div className="text-sm font-bold" style={{ color: BRAND.gold }}>Gratis (acceso completo durante beta)</div>
            </div>
          </div>
        </div>

        {/* Cards de planes */}
        <div className="space-y-4">
          {planes.map((plan) => (
            <div key={plan.key} className="rounded-2xl p-5 relative"
              style={{
                background: "linear-gradient(145deg, #111111, #000000)",
                border: plan.popular ? `2px solid ${BRAND.gold}` : `1px solid ${BRAND.border}`,
              }}>

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                  Más elegido
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-3 right-4 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: BRAND.red, color: BRAND.white }}>
                  {plan.badge}
                </div>
              )}

              <div className="flex items-baseline gap-2 mb-1 mt-1">
                <span className="text-2xl font-bold" style={{ color: BRAND.gold }}>{plan.price}</span>
                <span className="text-sm" style={{ color: BRAND.textLight }}>{plan.period}</span>
              </div>
              <div className="text-sm mb-3" style={{ color: BRAND.textMute }}>{plan.priceARS}{plan.period}</div>
              <div className="text-lg font-bold mb-3" style={{ color: BRAND.white }}>{plan.name}</div>

              <div className="space-y-2 mb-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: BRAND.gold }}>{"\u2713"}</span>
                    <span className="text-sm" style={{ color: BRAND.textLight }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* FORMULARIO DE LISTA DE ESPERA */}
              {showEmailForm === plan.key ? (
                enviado ? (
                  <div className="rounded-xl p-4 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <div className="text-3xl mb-2">{"\u2705"}</div>
                    <p className="text-sm font-bold mb-1" style={{ color: "#22c55e" }}>¡Listo!</p>
                    <p className="text-sm" style={{ color: BRAND.textLight }}>Te vamos a avisar a <strong style={{ color: BRAND.white }}>{emailWaitlist}</strong> apenas habilitemos el plan {plan.name}.</p>
                    <button onClick={() => setShowEmailForm(null)} className="mt-3 text-[11px] font-semibold" style={{ color: BRAND.gold }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={emailWaitlist}
                      onChange={e => setEmailWaitlist(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
                    />
                    <button onClick={() => unirseListaEspera(plan)} disabled={enviando}
                      className="w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
                      style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                      {enviando ? "Guardando..." : "Avisame cuando esté listo"}
                    </button>
                    <button onClick={() => setShowEmailForm(null)} className="w-full text-[11px] py-1" style={{ color: BRAND.textMute }}>
                      Cancelar
                    </button>
                  </div>
                )
              ) : (
                <button onClick={() => abrirFormulario(plan.key)}
                  className="w-full rounded-xl py-3 text-sm font-bold active:scale-95"
                  style={{
                    background: plan.popular ? BRAND.goldGradient : "rgba(212,175,55,0.1)",
                    color: plan.popular ? BRAND.black : BRAND.gold,
                    border: plan.popular ? "none" : `1px solid ${BRAND.borderStrong}`,
                  }}>
                  {"\u{1F4E7}"} Avisame cuando esté listo
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Por qué pedimos email */}
        <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND.border}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: BRAND.gold }}>¿Por qué pedimos tu email?</p>
          <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
            <li>{"\u2713"} Te avisamos <strong style={{ color: BRAND.white }}>antes que a nadie</strong> cuando habilitemos los planes pagos</li>
            <li>{"\u2713"} <strong style={{ color: BRAND.white }}>30% de descuento</strong> para los primeros 100 inscriptos</li>
            <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Cero spam.</strong> Solo te escribimos una vez, cuando esté listo</li>
            <li>{"\u2713"} Mientras tanto seguís usando la app <strong style={{ color: BRAND.white }}>100% gratis</strong></li>
          </ul>
        </div>

        {/* Garantía honesta */}
        <div className="mt-4 text-center">
          <p className="text-[11px]" style={{ color: BRAND.textMute }}>
            Cuando habilitemos los pagos usaremos <strong style={{ color: BRAND.gold }}>MercadoPago</strong> (Argentina y LATAM). Sin permanencia, cancelás cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE BANNER ──────────────────────────
function UpgradeBanner({ feature, onViewPlans }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(224,224,224,0.06), rgba(224,224,224,0.02))", border: "1px solid rgba(224,224,224,0.15)" }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{"\u{1F451}"}</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Función Premium</div>
          <p className="text-sm text-slate-300 mt-1">Desbloqueá {feature} desde <span className="text-white font-semibold">US$2.99/mes</span> con el plan Plus.</p>
          <button onClick={onViewPlans} className="mt-2 rounded-xl px-4 py-2 text-sm font-bold text-black" style={{ background: "linear-gradient(135deg, #E0E0E0, #ffffff)" }}>Ver planes →</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACTOS SCREEN ───────────────────────
function ContactosScreen({ onBack, userPlan = "gratis", nombreUsuario = "" }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista");
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("Madre");
  const [telefono, setTelefono] = useState("");
  const [prefijo, setPrefijo] = useState("54");
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const limites = PLAN_LIMITS[userPlan] || PLAN_LIMITS.gratis;
  const maxContactos = limites.contactos;

  useEffect(() => { cargar(); }, []);
  async function cargar() { setLoading(true); setContactos(await getContactos()); setLoading(false); }

  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  async function handleAgregar() {
    setError("");
    if (!nombre.trim() || !telefono.trim()) { setError("Completá nombre y teléfono."); return; }
    if (contactos.length >= maxContactos) { setError(`Límite de ${maxContactos} contactos. Pasate a Premium.`); return; }
    setSaving(true);
    const numCompleto = prefijo + limpiarNumero(telefono);
    const r = await addContacto({ nombre: nombre.trim(), telefono: numCompleto, relacion, prioridad: contactos.length + 1 });
    if (r.success) {
      // Safety Check automático
      setVerificando(true);
      await verificarContacto(numCompleto, nombre.trim(), nombreUsuario || "Tu contacto de Traza 360");
      setVerificando(false);
      setVista("lista"); setNombre(""); setTelefono(""); cargar();
    } else setError(r.error || "Error al guardar.");
    setSaving(false);
  }

  async function handleEliminar(id) { if (!window.confirm("Eliminar?")) return; await deleteContacto(id); cargar(); }

  async function reenviarVerificacion(c) {
    await verificarContacto(c.telefono, c.nombre, nombreUsuario);
    alert(`Verificación enviada a ${c.nombre} ✓`);
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver al panel</button>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div><p className="text-sm uppercase tracking-[0.18em] text-cyan-300">Mi red de contención</p>
              <h2 className="mt-2 text-2xl font-bold">Mis Contactos de Confianza</h2></div>
            <span className="text-3xl">{"\u{1F465}"}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">Plan: <span className="text-cyan-300 font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span> · {contactos.length}/{maxContactos} contactos.</p>
          {contactos.length === 0 && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-sm text-red-300">{"\u26A0\u{FE0F}"} Sin contactos el botón de pánico no puede alertar a nadie.</p>
            </div>
          )}
        </div>

        {vista === "lista" && (
          <>
            {loading ? <div className="text-center py-8 text-slate-300">Cargando...</div>
            : contactos.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">{"\u{1F465}"}</div>
                <h3 className="text-lg font-semibold">Sin contactos</h3>
                <p className="mt-2 text-sm text-slate-300">Agregá al menos 1 contacto para que la app pueda protegerte.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {contactos.map(c => (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-3xl shrink-0">{getRelEmoji(c.relacion)}</div>
                        <div>
                          <div className="text-base font-semibold">{c.nombre}</div>
                          <div className="text-sm text-cyan-300">{c.relacion}</div>
                          <div className="text-sm text-slate-300 mt-1">+{c.telefono}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => reenviarVerificacion(c)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300">Verificar</button>
                        <button onClick={() => handleEliminar(c.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {contactos.length < maxContactos ? (
              <button onClick={() => setVista("agregar")} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 py-4 font-semibold text-white shadow-lg">+ Agregar contacto</button>
            ) : (
              <UpgradeBanner feature="más contactos de emergencia" />
            )}
          </>
        )}

        {vista === "agregar" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <button onClick={() => { setVista("lista"); setError(""); }} className="text-sm text-slate-300 mb-4">← Volver</button>
            <h3 className="text-lg font-bold mb-4">Agregar contacto</h3>
            <div className="space-y-4">
              <div><label className="text-sm text-slate-300 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-400/50" /></div>
              <div><label className="text-sm text-slate-300 block mb-2">Relación</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RELACIONES.map(r => (
                    <button key={r} onClick={() => setRelacion(r)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${relacion === r ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-300"}`}>
                      {getRelEmoji(r)} {r}
                    </button>))}
                </div></div>
              <div><label className="text-sm text-slate-300 block mb-1">Teléfono (con WhatsApp)</label>
                <PhoneInput value={telefono} onChange={setTelefono} prefix={prefijo} onPrefixChange={setPrefijo} /></div>

              {/* Aviso Safety Check */}
              <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <p className="text-sm text-emerald-300">{"\u2705"} Al guardar, le enviamos un WhatsApp de verificación automático para confirmar que el número funciona.</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {verificando && <p className="text-sm text-emerald-300 animate-pulse">{"\u{1F4F1}"} Enviando verificación por WhatsApp...</p>}
              <button onClick={handleAgregar} disabled={saving || verificando}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                {saving ? "Guardando..." : verificando ? "Verificando..." : "Guardar y verificar"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SELECTOR CONTACTO MODAL ────────────────
function SelectorContactoModal({ contactos, mensaje, onClose }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [detalle, setDetalle] = useState("");
  const tieneCompletar = mensaje.includes("[completar]");

  function toggle(id) { setSeleccionados(seleccionados.includes(id) ? seleccionados.filter(x => x !== id) : [...seleccionados, id]); }
  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  async function enviar() {
    if (seleccionados.length === 0) { alert("Seleccioná al menos 1."); return; }
    setEnviando(true);
    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
    const { location } = await getCurrentLocationWithFallback();
    const msgFinal = tieneCompletar ? mensaje.replace("[completar]", detalle.trim() || "alguien") : mensaje;
    const msg = buildMessageWithReply(msgFinal, location);
    const result = await enviarWhatsApp(elegidos[0].telefono, msg);
    setEnviando(false);
    setSent(true);
    setSentOk(result.success);
    reproducirSonido();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#08080c] p-6 shadow-2xl">
        {sent ? (
          <div className="text-center space-y-4">
            {/* Feedback visual premium */}
            <div className="py-4">
              <div className="text-5xl mb-3 animate-bounce">{sentOk ? "\u2705" : "\u{1F4F1}"}</div>
              <h3 className="text-lg font-bold" style={{ color: "#E0E0E0" }}>{sentOk ? "Alerta enviada" : "Abriendo WhatsApp..."}</h3>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                {sentOk ? "Tu contacto recibió el WhatsApp automáticamente." : "Enviando manualmente por WhatsApp."}
              </p>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(224,224,224,0.05)", border: "1px solid rgba(224,224,224,0.1)" }}>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(224,224,224,0.8)" }}>Tu contacto recibió</div>
              <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>Tu contacto recibió el WhatsApp con tu ubicación y puede responderte con:</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { emoji: "\u{1F697}", text: "Salgo" },
                  { emoji: "\u2705", text: "Recibí" },
                  { emoji: "\u{1F4CD}", text: "Ubicación" },
                ].map((r, i) => (
                  <div key={i} className="rounded-lg py-3 text-center" style={{ background: "linear-gradient(145deg, #101018, #08080c)", border: "1px solid rgba(224,224,224,0.12)" }}>
                    <div className="text-2xl">{r.emoji}</div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color: "rgba(224,224,224,0.8)" }}>{r.text}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] mt-3 text-center" style={{ color: "rgba(255,255,255,0.55)" }}>Cuando responda, verás su emoji acá</p>
            </div>
            <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: "linear-gradient(145deg, #101018, #08080c)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">¿A quién avisar?</h3>
              <button onClick={onClose} className="text-slate-300 text-2xl">×</button>
            </div>
            {tieneCompletar && (
              <div className="mb-4">
                <label className="text-sm text-slate-300 block mb-1">Completá el detalle</label>
                <input type="text" value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Nombre de la persona o lugar"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400" />
              </div>
            )}
            {contactos.length === 0 ? (
              <p className="text-sm text-slate-300 text-center py-6">No tenés contactos configurados.</p>
            ) : (
              <>
                <button onClick={() => setSeleccionados(contactos.map(c => c.id))} className="w-full mb-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-300">Seleccionar todos ({contactos.length})</button>
                <div className="space-y-2 mb-4">
                  {contactos.map(c => (
                    <button key={c.id} onClick={() => toggle(c.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${seleccionados.includes(c.id) ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl shrink-0">{getRelEmoji(c.relacion)}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{c.nombre}</div><div className="text-[11px] text-slate-300">{c.relacion} · +{c.telefono}</div></div>
                        <div className={`h-5 w-5 rounded-full border-2 shrink-0 ${seleccionados.includes(c.id) ? "border-cyan-400 bg-cyan-400" : "border-slate-500"}`}>
                          {seleccionados.includes(c.id) && <div className="text-slate-950 text-sm text-center leading-4">{"\u2713"}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={enviar} disabled={enviando || seleccionados.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40">
                  {enviando ? "Enviando..." : `\u{1F6A8} Enviar alerta (${seleccionados.length})`}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── MÓDULOS (v18 — Limpieza UI) ──────────────
// CAMBIOS v18:
// - "Hogar Seguro" (mi_nido) y "Adulto Mayor Seguro" (los_protejo) COMENTADOS
// - Sacado "Grabar video silencioso" de Violencia de Género y Noche Segura
// - Sacado "Escribir" de Adolescente Seguro
// - Fusionados "Entro a la casa de..." y "Me reúno con..." → "Estoy en..."
const MODULES = [
  { key: "mi_escudo", iconName: "shield", emoji: "\u{1F6E1}\u{FE0F}", title: "Violencia de Género", desc: "Alerta silenciosa, ubicación y red de apoyo.",
    color: "from-[#D4AF37] to-[#9A7B0F]", border: "border-[rgba(212,175,55,0.25)]", accentBg: "bg-[rgba(212,175,55,0.1)]", accentBorder: "border-[rgba(212,175,55,0.4)]", accentText: "text-[#D4AF37]",
    actions: [
      { key: "testigo",  iconName: "mic", icon: "🔴", name: "Grabar Evidencias", desc: "Audio + foto frontal y trasera → nube y dispositivo.", type: "modo_testigo" },
      { key: "panico", iconName: "panic", icon: "\u{1F6A8}", name: "Botón de pánico", desc: "Alerta inmediata + ubicación a tus contactos.", type: "alert_contacts", message: "ALERTA — Botón de pánico activado. Necesito ayuda urgente." },
      { key: "estoy_en", iconName: "pin", icon: "\u{1F4CD}", name: "Estoy en...", desc: "Avisa dónde estás + ubicación GPS.", type: "alert_contacts", message: "Estoy en [completar]." },
      { key: "checkin", iconName: "timer", icon: "\u23F1\u{FE0F}", name: "Ingreso a este lugar", desc: "Activá tu tiempo de estadía. Si no desactivás, se envía tu ubicación en tiempo real.", type: "checkin", titulo: "Ingreso a este lugar — Violencia de Género" },
      { key: "share", iconName: "eye", icon: "\u{1F4F2}", name: "Compartir mi movimiento en vivo", desc: "El contacto ve tu mapa moviéndose en tiempo real. Sin instalar nada.", type: "ruta_segura" },
      { key: "grabar", iconName: "mic", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido entorno", desc: "Grabación audio silenciosa → nube.", type: "record_audio" },
      { key: "uber", iconName: "car", icon: "\u{1F695}", name: "Llamar Uber", desc: "Abre Uber con destino.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", iconName: "taxi", icon: "\u{1F696}", name: "Llamar taxi", desc: "Abre app/teléfono de taxi.", type: "taxi" },
      { key: "evidencias", iconName: "folder", icon: "\u{1F4C1}", name: "Mis evidencias", desc: "Ver todas las grabaciones guardadas.", type: "evidencias" },
    ]},
  { key: "los_cuido", iconName: "teen", emoji: "\u{1F9D1}\u200D\u{1F393}", title: "Adolescente Seguro", desc: "Salidas, regresos y anti-bullying.",
    color: "from-[#D4AF37] to-[#9A7B0F]", border: "border-[rgba(212,175,55,0.25)]", accentBg: "bg-[rgba(212,175,55,0.1)]", accentBorder: "border-[rgba(212,175,55,0.4)]", accentText: "text-[#D4AF37]",
    actions: [
      { key: "geocercas", iconName: "pin", icon: "📍", name: "Geocercas Emocionales", desc: "Zonas seguras con alertas automáticas. 'Salió del colegio a las 17:23.'", type: "geocercas" },
      { key: "ayuda", iconName: "panic", icon: "\u{1F6A8}", name: "AYUDA", desc: "Alerta máxima urgencia al padre.", type: "alert_contacts", message: "AYUDA — Necesito ayuda urgente." },
      { key: "bullying", iconName: "mic", icon: "\u{1F399}\u{FE0F}", name: "Bullying - Grabar evidencia", desc: "Grabación silenciosa real.", type: "record_audio" },
      { key: "cole", iconName: "school", icon: "\u{1F3EB}", name: "Buscame por el cole", desc: "Pide al padre que lo busque.", type: "alert_contacts", message: "URGENTE — Necesito que me busquen por el colegio." },
      { key: "voy_a", iconName: "home", icon: "\u{1F3E0}", name: "Voy a lo de...", desc: "Avisa a dónde va + nombre.", type: "alert_contacts", message: "Voy a lo de [completar]." },
      { key: "maps", iconName: "home", icon: "\u{1F3E1}", name: "Llegar a casa", desc: "Activa GPS hasta llegar a casa.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "share", iconName: "eye", icon: "\u{1F4CD}", name: "Compartir mi movimiento en vivo", desc: "El contacto ve tu mapa moviéndose en tiempo real. Sin instalar nada.", type: "ruta_segura" },
      { key: "uber", iconName: "car", icon: "\u{1F695}", name: "Llamar Uber", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", iconName: "taxi", icon: "\u{1F696}", name: "Llamar taxi", desc: "Abre app/teléfono taxi.", type: "taxi" },
      { key: "evidencias", iconName: "folder", icon: "\u{1F4C1}", name: "Mis evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
    ]},

  /* ═══════════════════════════════════════════════════════════
     ❌ v18: ADULTO MAYOR SEGURO — COMENTADO (NO BORRADO)
     Motivo: Decisión estratégica — foco en Violencia de Género,
     Adolescente, Noche Segura y Te Cuido a Distancia.
     Este módulo se reservará para una futura app independiente.
     Para reactivarlo: descomentar el bloque de abajo.
  ═══════════════════════════════════════════════════════════ */
  /*
  { key: "los_protejo", emoji: "\u{1FAF6}", title: "Adulto Mayor Seguro", desc: "Adulto mayor seguro — Medicamentos, caídas y asistencia.",
    color: "from-slate-300 to-gray-400", border: "border-gray-400/20", accentBg: "bg-gray-400/10", accentBorder: "border-gray-400/30", accentText: "text-gray-300",
    actions: [
      { key: "cai", icon: "\u{1F691}", name: "Me caí", desc: "Alerta de caída + ubicación.", type: "alert_contacts", message: "ALERTA — Me caí y necesito ayuda." },
      { key: "mal", icon: "\u{1F48A}", name: "No me siento bien", desc: "Alerta de salud.", type: "alert_contacts", message: "No me siento bien. Necesito asistencia." },
      { key: "casa", icon: "\u{1F3E1}", name: "Llegar a casa", desc: "Activa GPS hasta llegar a casa.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "share", icon: "\u{1F4CD}", name: "Enviar ubicación", desc: "Comparte ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "ambulancia", icon: "\u{1F691}", name: "Llamar ambulancia", desc: "Llama al número configurado (SAME, 107, prepaga).", type: "ambulancia" },
      { key: "pastillero", icon: "\u{1F48A}", name: "Pastillero Virtual", desc: "Recordatorios de medicación.", type: "pastillero" },
    ]},
  */

  /* ═══════════════════════════════════════════════════════════
     ❌ v18: HOGAR SEGURO — COMENTADO (NO BORRADO)
     Motivo: Decisión estratégica — foco en Violencia de Género,
     Adolescente, Noche Segura y Te Cuido a Distancia.
     Este módulo se reservará para una futura app independiente.
     Para reactivarlo: descomentar el bloque de abajo.
  ═══════════════════════════════════════════════════════════ */
  /*
  { key: "mi_nido", emoji: "\u{1F3E0}", title: "Hogar Seguro", desc: "Hogar seguro — Intrusos, accidentes y emergencias.",
    color: "from-violet-500 to-purple-500", border: "border-violet-500/20", accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/30", accentText: "text-violet-300",
    actions: [
      { key: "intruso", icon: "\u{1F6A8}", name: "Intruso", desc: "Alerta de intruso + ubicación.", type: "alert_contacts", message: "ALERTA — Posible intruso en mi domicilio." },
      { key: "accidente", icon: "\u{1F198}", name: "Accidente", desc: "Alerta accidente doméstico.", type: "alert_contacts", message: "ALERTA — Accidente doméstico." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido entorno", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "grabar_video", icon: "\u{1F3A5}", name: "Grabar video", desc: "Grabación silenciosa.", type: "record_video" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis evidencias", desc: "Ver grabaciones.", type: "evidencias" },
      { key: "share", icon: "\u{1F4CD}", name: "Enviar ubicación", desc: "Comparte ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
    ]},
  */

  // v19.1: Renombrado "Noche Segura" → "Noche Segura"
  // Motivo: Nicho mucho más grande (jóvenes que salen de noche + trabajadores nocturnos).
  // "Salí tranqui. Volvé tranqui."
  { key: "turno_seguro", iconName: "night", emoji: "\u{1F303}", title: "Noche Segura", desc: "Para jóvenes que salen de noche, acompañantes, repartidores o cualquier situación de riesgo donde necesites apoyo de amigos o conocidos.",
    color: "from-[#D4AF37] to-[#9A7B0F]", border: "border-[rgba(212,175,55,0.25)]", accentBg: "bg-[rgba(212,175,55,0.1)]", accentBorder: "border-[rgba(212,175,55,0.4)]", accentText: "text-[#D4AF37]",
    actions: [
      { key: "testigo",     iconName: "mic",   icon: "🔴", name: "Grabar Evidencias", desc: "Audio + foto frontal y trasera → nube y dispositivo.", type: "modo_testigo" },
      { key: "ruta_segura", iconName: "eye",   icon: "\u{1F4CD}", name: "Compartir mi movimiento en vivo", desc: "El contacto ve tu mapa moviéndose en tiempo real. Sin instalar nada.", type: "ruta_segura" },
      { key: "panico", iconName: "panic", icon: "\u{1F6A8}", name: "Botón de pánico", desc: "Alerta inmediata + ubicación.", type: "alert_contacts", message: "SOS — Necesito ayuda urgente." },
      { key: "sospechoso_lugar", iconName: "alert", icon: "\u26A0\u{FE0F}", name: "Entro a lugar sospechoso", desc: "Guarda dirección + timer. Si no confirmás, alerta automática.", type: "checkin", titulo: "Lugar sospechoso — Noche Segura" },
      { key: "desconocido", iconName: "person", icon: "\u{1F6B6}", name: "Salgo con desconocido/a", desc: "Avisa contactos + nombre + ubicación.", type: "alert_contacts", message: "Salgo con desconocido/a: [completar]." },
      { key: "perdido", iconName: "pin", icon: "\u{1F4CD}", name: "Me perdí", desc: "Comparte GPS en vivo a tus contactos.", type: "alert_contacts", message: "Me perdí. Compartiendo mi ubicación en vivo. Por favor ayudame a volver." },
      { key: "checkin", iconName: "timer", icon: "\u23F1\u{FE0F}", name: "Ingreso a este lugar", desc: "Activá tu tiempo de estadía. Si no desactivás, se envía tu ubicación en tiempo real.", type: "checkin", titulo: "Ingreso a este lugar — Noche Segura" },
      { key: "grabar", iconName: "mic", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido entorno", desc: "Grabación silenciosa → nube.", type: "record_audio" },
      { key: "evidencias", iconName: "folder", icon: "\u{1F4C1}", name: "Mis evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "maps", iconName: "home", icon: "\u{1F3E1}", name: "Llegar a casa", desc: "Activa GPS hasta llegar a casa.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "uber", iconName: "car", icon: "\u{1F695}", name: "Llamar Uber", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", iconName: "taxi", icon: "\u{1F696}", name: "Llamar taxi", desc: "Abre app/teléfono taxi.", type: "taxi" },
    ]},
];

// ─── MODULE CARD ────────────────────────────
function ModuleCard({ m, autoExpand = false, contactos = [], onOpenPastillero, onOpenEvidencias }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showGrabacion, setShowGrabacion] = useState(false);
  const [showCheckIn,    setShowCheckIn]    = useState(false);
  const [checkInTitulo,  setCheckInTitulo]  = useState("");
  const [showRutaSegura,  setShowRutaSegura]  = useState(false);
  const [showGeocercas,   setShowGeocercas]   = useState(false);
  const [showModoTestigo, setShowModoTestigo] = useState(false);

  function handleAction(action) {
    switch (action.type) {
      case "ruta_segura":  setShowRutaSegura(true);  break;
      case "geocercas":    setShowGeocercas(true);   break;
      case "modo_testigo": setShowModoTestigo(true); break;
      case "alert_contacts":
        if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza primero."); return; }
        setCurrentMessage(action.message); setSelectorOpen(true); return;
      case "record_audio": setShowGrabacion(true); return;
      case "maps": openMapsTo(action.destination); return;
      case "uber": openUber(action.destination); return;
      case "pastillero": if (onOpenPastillero) onOpenPastillero(); return;
      case "evidencias": if (onOpenEvidencias) onOpenEvidencias(); return;
      case "checkin":
        if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza primero."); return; }
        setCheckInTitulo(action.titulo || "Botón de ingreso");
        setShowCheckIn(true); return;
      case "camaras":
        alert("Abrí la app de tus cámaras (Ring, Xiaomi Home, TP-Link Tapo, Alfred). Próximamente integración directa."); return;
      case "taxi": {
        const taxiNum = sessionStorage.getItem("traza360_taxi") || "";
        if (!taxiNum) {
          const num = prompt("Configurá tu taxi de confianza (ej: 3515551234):");
          if (num && num.trim()) { sessionStorage.setItem("traza360_taxi", num.trim()); window.open(`tel:${num.trim()}`); }
        } else window.open(`tel:${taxiNum}`);
        return;
      }
      case "ambulancia": {
        const ambNum = sessionStorage.getItem("traza360_ambulancia") || "107";
        const opc = prompt(`Llamar al ${ambNum}? Dejá vacío para llamar, o escribí otro número:`);
        const numFinal = (opc && opc.trim()) ? opc.trim() : ambNum;
        if (numFinal !== ambNum) sessionStorage.setItem("traza360_ambulancia", numFinal);
        window.open(`tel:${numFinal}`);
        if (contactos.length > 0) {
          getCurrentLocationWithFallback().then(({ location }) => {
            enviarWhatsApp(contactos[0].telefono, buildMessageWithReply("EMERGENCIA MÉDICA — Llamé a la ambulancia. Necesito ayuda.", location));
          });
        }
        return;
      }
      default: return;
    }
  }

  // Color accent por módulo
  const modColor = {
    mi_escudo:    { accent: "#E74C3C", bg: "rgba(231,76,60,0.1)",   border: "rgba(231,76,60,0.35)" },
    turno_seguro: { accent: "#5DADE2", bg: "rgba(93,173,226,0.1)",  border: "rgba(93,173,226,0.3)" },
    los_cuido:    { accent: "#2ECC71", bg: "rgba(46,204,113,0.1)",  border: "rgba(46,204,113,0.3)" },
  }[m.key] || { accent: BRAND.gold, bg: "rgba(201,168,76,0.1)", border: BRAND.borderStrong };

  return (
    <>
      <div className="rounded-2xl p-5 flex flex-col" style={{ background: BRAND.cardBg, border: `1px solid ${modColor.border}`, boxShadow: `6px 6px 18px rgba(0,0,0,0.7), 0 0 24px ${modColor.bg}` }}>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl" style={{ background: modColor.bg, border: `1.5px solid ${modColor.border}` }}>
            <PinEyeLogo size={40} showText={false} />
          </div>
          <div>
            <h4 style={{ fontSize: 20, fontWeight: 800, color: BRAND.white, fontFamily: FONT_DISPLAY, lineHeight: 1.2 }}>{m.title}</h4>
            <p style={{ fontSize: 13, marginTop: 4, color: modColor.accent, fontWeight: 600 }}>{m.desc}</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="w-full rounded-2xl px-4 py-3 font-bold flex items-center justify-between"
          style={{ background: modColor.bg, border: `1px solid ${modColor.border}`, color: modColor.accent, fontSize: 14 }}>
          <span>{expanded ? "Ocultar opciones" : "Ver opciones"}</span>
          <span className={`text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </button>
        {expanded && (
          <div className="mt-4 space-y-3">
            {m.actions.map(a => (
              <button key={a.key} onClick={() => handleAction(a)}
                className="w-full rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(145deg, #1a1a1a, #0d0d0d)", border: `1px solid rgba(255,255,255,0.08)`, boxShadow: "3px 3px 10px rgba(0,0,0,0.6)" }}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: modColor.bg }}>
                    {a.iconName ? <GoldIcon name={a.iconName} size={22} /> : <span style={{ fontSize: 20 }}>{a.icon}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.white, lineHeight: 1.3 }}>{a.name}</div>
                    <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: BRAND.textLight }}>{a.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectorOpen && <SelectorContactoModal contactos={contactos} mensaje={currentMessage} onClose={() => setSelectorOpen(false)} />}
      {showGrabacion   && <GrabacionModal onClose={() => setShowGrabacion(false)} />}
      {showCheckIn     && <CheckInModal contactos={contactos} titulo={checkInTitulo} onClose={() => setShowCheckIn(false)} />}
      {showRutaSegura  && <RutaSeguraModal onClose={() => setShowRutaSegura(false)} contactos={contactos} authUser={window.__traza360_auth} userProfile={window.__traza360_profile} />}
      {showModoTestigo && <ModoTestigoModal onClose={() => setShowModoTestigo(false)} contactos={contactos} />}
      {showGeocercas   && (
        <div className="fixed inset-0 z-[300] overflow-y-auto" style={{ background: BRAND.blackBg }}>
          <GeocercasScreen onBack={() => setShowGeocercas(false)} contactos={contactos} authUser={window.__traza360_auth} />
        </div>
      )}
    </>
  );
}

// ─── AUTH SCREENS ────────────────────────────
function Field({ label, type = "text", placeholder, value, onChange }) {
  return (<label className="block space-y-2 text-left"><span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(224,224,224,0.6)" }}>{label}</span>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400" style={{ background: "linear-gradient(145deg, #121218, #0a0a0e)", border: "1px solid rgba(224,224,224,0.1)", boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.4)" }} /></label>);
}

function AccessCard({ children }) { return <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl md:p-8" style={{ background: "linear-gradient(145deg, #13131d, #0a0a12)", border: "1px solid rgba(224,224,224,0.1)", boxShadow: "8px 8px 24px rgba(0,0,0,0.6)" }}>{children}</div>; }

function LoginScreen({ onBack, onSuccess, onRecuperar }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function handle() {
    setError(""); if (!email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    setLoading(true); const r = await signIn(email.trim(), password); setLoading(false);
    if (r.success) onSuccess(); else setError(r.error.includes("Invalid") ? "Email o contraseña incorrectos." : r.error);
  }
  async function handleGoogle() {
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) { setError("Error al conectar con Google."); setLoading(false); }
  }
  return (<div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}><AccessCard>
    <button onClick={onBack} className="text-sm font-semibold" style={{ color: BRAND.gold }}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold" style={{ color: BRAND.white }}>Ingresar</h2>
    <div className="mt-6 space-y-4">
      <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 font-semibold text-white active:scale-95 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.border}` }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continuar con Google
      </button>
      <div className="flex items-center gap-3"><div className="flex-1 h-px" style={{ background: BRAND.border }}></div><span className="text-sm" style={{ color: BRAND.textMute }}>o con email</span><div className="flex-1 h-px" style={{ background: BRAND.border }}></div></div>
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      {/* v19.6: Link recuperar contraseña */}
      <div className="text-right">
        <button type="button" onClick={onRecuperar} className="text-sm font-semibold underline" style={{ color: BRAND.gold }}>
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      {error && <p className="text-sm text-center" style={{ color: "#fca5a5" }}>{error}</p>}
      <button onClick={handle} disabled={loading} className="w-full rounded-xl py-3.5 font-bold shadow-lg disabled:opacity-50" style={{ background: BRAND.goldGradient, color: BRAND.black }}>{loading ? "Ingresando..." : "Ingresar"}</button>
    </div></AccessCard></div>);
}

function RegisterScreen({ onBack, onSuccess, setPendingName, onScreen }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false); // v19.6: checkbox obligatorio
  async function handle() {
    setError(""); if (!name.trim() || !email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    if (password.length < 6) { setError("Contraseña mínimo 6 caracteres."); return; }
    if (!aceptaTerminos) { setError("Tenés que aceptar los Términos y la Política de Privacidad para registrarte."); return; }
    setLoading(true); try { sessionStorage.setItem("traza360_pending_name", name.trim()); sessionStorage.setItem("traza360_terms_accepted", new Date().toISOString()); } catch(e){} setPendingName(name.trim());
    const r = await signUp(email.trim(), password, name.trim()); setLoading(false);
    if (r.success) onSuccess(); else setError(r.error.includes("already") ? "Email ya registrado." : r.error);
  }
  async function handleGoogle() {
    setError("");
    if (!aceptaTerminos) { setError("Tenés que aceptar los Términos y la Política de Privacidad antes de continuar."); return; }
    setLoading(true);
    try { sessionStorage.setItem("traza360_terms_accepted", new Date().toISOString()); } catch(e){}
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) { setError("Error al conectar con Google."); setLoading(false); }
  }
  return (<div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}><AccessCard>
    <button onClick={onBack} className="text-sm font-semibold" style={{ color: BRAND.gold }}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold" style={{ color: BRAND.white }}>Crear cuenta</h2>
    <div className="mt-6 space-y-4">
      <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={e => setName(e.target.value)} />
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />

      {/* v19.6: Checkbox obligatorio T&C */}
      <div className="rounded-xl p-3" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${aceptaTerminos ? BRAND.borderStrong : BRAND.border}` }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <button type="button" onClick={() => setAceptaTerminos(!aceptaTerminos)}
            className="h-5 w-5 rounded shrink-0 mt-0.5 flex items-center justify-center"
            style={{
              background: aceptaTerminos ? BRAND.gold : "transparent",
              border: `2px solid ${aceptaTerminos ? BRAND.gold : "rgba(255,255,255,0.3)"}`,
            }}>
            {aceptaTerminos && <span className="text-black text-sm font-bold">{"\u2713"}</span>}
          </button>
          <div className="flex-1 text-sm leading-relaxed" style={{ color: BRAND.textLight }} onClick={() => setAceptaTerminos(!aceptaTerminos)}>
            Acepto los{" "}
            <button type="button" onClick={(e) => { e.stopPropagation(); onScreen && onScreen("terminos"); }} className="underline font-semibold" style={{ color: BRAND.gold }}>
              Términos y Condiciones
            </button>
            {" "}y la{" "}
            <button type="button" onClick={(e) => { e.stopPropagation(); onScreen && onScreen("privacidad"); }} className="underline font-semibold" style={{ color: BRAND.gold }}>
              Política de Privacidad
            </button>.
            <p className="mt-1.5 text-[11px]" style={{ color: BRAND.textMute }}>Importante: Traza 360 no reemplaza al 911 ni a servicios oficiales de emergencia.</p>
          </div>
        </label>
      </div>

      <button onClick={handle} disabled={loading || !aceptaTerminos}
        className="w-full rounded-xl py-3.5 font-bold shadow-lg disabled:opacity-40"
        style={{ background: BRAND.goldGradient, color: BRAND.black }}>
        {loading ? "Creando..." : "Crear cuenta"}
      </button>

      <div className="flex items-center gap-3"><div className="flex-1 h-px" style={{ background: BRAND.border }}></div><span className="text-sm" style={{ color: BRAND.textMute }}>o</span><div className="flex-1 h-px" style={{ background: BRAND.border }}></div></div>

      <button onClick={handleGoogle} disabled={loading || !aceptaTerminos}
        className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 font-semibold text-white active:scale-95 disabled:opacity-40"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.border}` }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continuar con Google
      </button>

      {error && <p className="text-sm text-center" style={{ color: "#fca5a5" }}>{error}</p>}
    </div></AccessCard></div>);
}

// ─── PIN EYE LOGO (Logo oficial v19) ────────
// Pin dorado con ojo central rojo sobre negro
// Mantengo el nombre EagleEyeLogo como alias para no romper referencias
function PinEyeLogo({ size = 80, showText = true }) {
  const w = size;
  const h = showText ? size * 1.35 : size;
  return (
    <div style={{ display: "inline-block", lineHeight: 0 }}>
      <svg viewBox="0 0 200 270" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Gradiente dorado premium del logo */}
          <linearGradient id="pinGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A7B0F"/>
            <stop offset="30%" stopColor="#D4AF37"/>
            <stop offset="50%" stopColor="#F4D03F"/>
            <stop offset="70%" stopColor="#D4AF37"/>
            <stop offset="100%" stopColor="#7A5F0A"/>
          </linearGradient>
          {/* Highlight superior */}
          <linearGradient id="pinHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>
          {/* Rojo del ojo */}
          <radialGradient id="eyeRed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444"/>
            <stop offset="70%" stopColor="#DC2626"/>
            <stop offset="100%" stopColor="#7F1D1D"/>
          </radialGradient>
          <filter id="goldShadow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feOffset dx="0" dy="2" result="offsetBlur"/>
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
          </filter>
        </defs>

        {/* Pin shape (gota invertida) */}
        <path
          d="M100 15 C55 15 25 50 25 95 C25 140 60 175 100 230 C140 175 175 140 175 95 C175 50 145 15 100 15 Z"
          fill="url(#pinGold)"
          stroke="#7A5F0A"
          strokeWidth="2"
        />
        {/* Highlight sobre el pin */}
        <path
          d="M100 20 C65 20 40 50 40 90 C40 110 50 130 65 145 C55 125 50 105 50 90 C50 55 70 30 100 25 Z"
          fill="url(#pinHighlight)"
          opacity="0.6"
        />

        {/* Círculo negro interior (forma de ojo) */}
        <ellipse cx="100" cy="95" rx="38" ry="32" fill="#000000" />
        <ellipse cx="100" cy="95" rx="36" ry="30" fill="#0A0A0A" stroke="#7A5F0A" strokeWidth="1" />

        {/* Iris rojo */}
        <circle cx="100" cy="95" r="16" fill="url(#eyeRed)" />
        {/* Pupila negra */}
        <circle cx="100" cy="95" r="6" fill="#000000" />
        {/* Reflejo blanco */}
        <circle cx="104" cy="91" r="2.5" fill="rgba(255,255,255,0.8)" />

        {showText && (
          <>
            {/* TRAZA en dorado + 360 en rojo */}
            <text x="100" y="262" textAnchor="middle" fontSize="32" fontWeight="800" fontFamily="sans-serif" letterSpacing="1">
              <tspan fill="#D4AF37">TRAZA</tspan>
              <tspan fill="#DC2626" dx="3">360</tspan>
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// Alias para mantener compatibilidad con referencias existentes
function EagleEyeLogo({ size = 80 }) {
  return <PinEyeLogo size={size} showText={true} />;
}

// ═══════════════════════════════════════════════
// TE CUIDO A DISTANCIA (v19)
// Tercero activa grabación remota CON consentimiento de la víctima.
// Flujo:
//  1. Persona protegida genera código de vínculo de 6 dígitos
//  2. Tercero ingresa el código → queda vinculado
//  3. Tercero puede solicitar grabación remota
//  4. La persona protegida recibe notificación y debe APROBAR cada solicitud
//  5. Si aprueba, se inicia grabación de audio que va a "Mis Evidencias"
// ═══════════════════════════════════════════════
function TeCuidoScreen({ onBack, contactos = [] }) {
  const [modo,     setModo]     = useState("elegir"); // elegir | cuidador | protegida
  const [telefono, setTelefono] = useState("");
  const [enviado,  setEnviado]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [activo,   setActivo]   = useState(false);
  const [pin,      setPin]      = useState("");
  const [pinInput, setPinInput] = useState("");
  const [error,    setError]    = useState("");

  function generarPin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async function enviarSolicitud() {
    setError("");
    const tel = telefono.replace(/\D/g, "");
    if (tel.length < 10) { setError("Ingresá un número de teléfono válido."); return; }
    setLoading(true);
    const newPin = generarPin();
    setPin(newPin);
    const link = `${window.location.origin}/cuidar/aceptar/${newPin}`;
    const msg = `👁️ *Traza 360 — Solicitud de cuidado*\n\n[Tu nombre] quiere seguirte en tiempo real para protegerte.\n\n✅ *Aceptar:* ${link}\n❌ Si no querés, ignorá este mensaje.\n\n_Para cancelar en cualquier momento, usá tu PIN de seguridad en la app._`;
    try {
      await sendWhatsAppAPI(tel, msg);
      setEnviado(true);
    } catch(e) {
      // Si WhatsApp falla, ofrecer compartir manual
      setEnviado(true);
    }
    setLoading(false);
  }

  function activarModo() {
    setActivo(true);
    setModo("protegida");
    try { sessionStorage.setItem("traza360_tecuido_activo", pin); } catch(e){}
  }

  function cancelarConPin() {
    setError("");
    const pinGuardado = sessionStorage.getItem("traza360_tecuido_activo");
    if (pinInput === pinGuardado || pinInput === pin) {
      setActivo(false);
      setModo("elegir");
      setEnviado(false);
      setTelefono("");
      setPin("");
      setPinInput("");
      try { sessionStorage.removeItem("traza360_tecuido_activo"); } catch(e){}
    } else {
      setError("PIN incorrecto.");
    }
  }

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-md">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>← Volver al panel</button>

        <div className="text-center mb-6">
          <GoldIcon name="eye" size={48} />
          <h2 className="text-xl font-bold mt-3" style={{ color: BRAND.white }}>Te Cuido a Distancia</h2>
          <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>La persona protegida siempre tiene el control.</p>
        </div>

        {/* ELEGIR ROL */}
        {modo === "elegir" && (
          <div className="space-y-3">
            <button onClick={() => setModo("cuidador")}
              className="w-full rounded-2xl p-5 text-left"
              style={{ background: "linear-gradient(145deg,#1a1a1a,#0a0a0a)", border: `2px solid ${BRAND.borderStrong}` }}>
              <div className="flex items-center gap-3 mb-2">
                <GoldIcon name="contacts" size={28} />
                <h3 className="text-base font-bold" style={{ color: BRAND.gold }}>Quiero cuidar a alguien</h3>
              </div>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                Enviás una solicitud por WhatsApp. La persona la acepta o rechaza. Si acepta, ves su ubicación en tiempo real.
              </p>
            </button>

            <button onClick={() => setModo("protegida")}
              className="w-full rounded-2xl p-5 text-left"
              style={{ background: "linear-gradient(145deg,#1a1a1a,#0a0a0a)", border: `1px solid ${BRAND.border}` }}>
              <div className="flex items-center gap-3 mb-2">
                <GoldIcon name="shield" size={28} />
                <h3 className="text-base font-bold" style={{ color: BRAND.gold }}>Alguien me está cuidando</h3>
              </div>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                Ver el estado de tu seguimiento activo. Podés cancelar cuando quieras con tu PIN de seguridad.
              </p>
            </button>
          </div>
        )}

        {/* CUIDADOR — enviar solicitud */}
        {modo === "cuidador" && !enviado && (
          <div className="rounded-2xl p-6" style={{ background: "linear-gradient(145deg,#111,#000)", border: `1px solid ${BRAND.borderStrong}` }}>
            <button onClick={() => setModo("elegir")} className="text-sm mb-4" style={{ color: BRAND.textLight }}>← Volver</button>
            <h3 className="text-base font-bold mb-2" style={{ color: BRAND.gold }}>Enviar solicitud de cuidado</h3>
            <p className="text-sm mb-5" style={{ color: BRAND.textLight }}>
              La persona recibe un WhatsApp con un link para aceptar o rechazar. Si acepta, podés ver su ubicación en tiempo real.
            </p>

            <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>Número de WhatsApp</p>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="+54 9 351 000 0000"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
            />

            <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                📱 <strong style={{ color: BRAND.white }}>Van a recibir:</strong> un mensaje con tu nombre y un link para aceptar o rechazar. Si no aceptan, no pasa nada.
              </p>
            </div>

            {error && <p className="text-sm mb-3" style={{ color: "#fca5a5" }}>{error}</p>}

            <button onClick={enviarSolicitud} disabled={loading}
              className="w-full rounded-xl py-4 font-bold text-sm disabled:opacity-40"
              style={{ background: BRAND.goldGradient, color: BRAND.black }}>
              {loading ? "Enviando..." : "📲 Enviar solicitud por WhatsApp"}
            </button>
          </div>
        )}

        {/* CUIDADOR — solicitud enviada */}
        {modo === "cuidador" && enviado && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(145deg,#111,#000)", border: `2px solid ${BRAND.borderStrong}` }}>
            <div className="text-4xl mb-3">📲</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: BRAND.gold }}>Solicitud enviada</h3>
            <p className="text-sm mb-5" style={{ color: BRAND.textLight }}>
              Le mandamos un WhatsApp al {telefono}. Cuando acepte, vas a poder verla en el panel de seguimiento en vivo.
            </p>
            <div className="rounded-xl p-3 mb-5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-sm" style={{ color: BRAND.textLight }}>
                ⏳ Si no recibe el mensaje, pedile que abra Traza 360 y vaya a "Alguien me está cuidando".
              </p>
            </div>
            <button onClick={() => { setEnviado(false); setModo("elegir"); }}
              className="w-full rounded-xl py-3 text-sm"
              style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
              Volver
            </button>
          </div>
        )}

        {/* PROTEGIDA — estado de seguimiento */}
        {modo === "protegida" && (
          <div className="rounded-2xl p-6" style={{ background: "linear-gradient(145deg,#111,#000)", border: `1px solid ${BRAND.border}` }}>
            <button onClick={() => setModo("elegir")} className="text-sm mb-4" style={{ color: BRAND.textLight }}>← Volver</button>

            {!activo ? (
              <>
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-sm font-bold mb-1" style={{ color: BRAND.white }}>Sin seguimiento activo</p>
                  <p className="text-sm" style={{ color: BRAND.textLight }}>Si alguien te envió una solicitud, vas a ver un aviso para aceptar o rechazar.</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-sm font-bold" style={{ color: "#22c55e" }}>Seguimiento activo</p>
                  </div>
                  <p className="text-sm" style={{ color: BRAND.textLight }}>Alguien de confianza puede ver tu ubicación en tiempo real.</p>
                </div>

                <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>Cancelar con PIN de seguridad</p>
                <input
                  type="text" inputMode="numeric" maxLength="4"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Tu PIN de 4 dígitos"
                  className="w-full rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-widest outline-none mb-3"
                  style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
                />
                {error && <p className="text-sm mb-2" style={{ color: "#fca5a5" }}>{error}</p>}
                <button onClick={cancelarConPin}
                  className="w-full rounded-xl py-3 text-sm font-bold"
                  style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40`, color: "#fca5a5" }}>
                  Cancelar seguimiento
                </button>
              </>
            )}
          </div>
        )}

        {/* Nota legal */}
        <div className="mt-5 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND.border}` }}>
          <p className="text-[11px]" style={{ color: BRAND.textMute }}>
            <strong style={{ color: BRAND.gold }}>Tu privacidad:</strong> Ningún seguimiento se activa sin tu aceptación explícita. Podés cancelar cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// INSTRUCCIONES / ¿CÓMO FUNCIONA? (v19)
// ═══════════════════════════════════════════════
function InstruccionesScreen({ onBack }) {
  const [seccion, setSeccion] = useState("modulos");
  // v19.4: PIN configurable para modo calculadora
  const [pin, setPin] = useState(() => {
    try { return sessionStorage.getItem("traza360_pin") || "1234"; } catch(e) { return "1234"; }
  });
  const [nuevoPin, setNuevoPin] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [pinGuardado, setPinGuardado] = useState(false);

  function guardarPin() {
    if (nuevoPin.length < 4 || nuevoPin.length > 8) {
      alert("El PIN debe tener entre 4 y 8 números.");
      return;
    }
    if (!/^\d+$/.test(nuevoPin)) {
      alert("El PIN solo puede tener números.");
      return;
    }
    try {
      sessionStorage.setItem("traza360_pin", nuevoPin);
      setPin(nuevoPin);
      setNuevoPin("");
      setPinGuardado(true);
      setTimeout(() => setPinGuardado(false), 2500);
    } catch(e) {
      alert("Error al guardar el PIN.");
    }
  }

  function copiarLinkOculto() {
    const link = window.location.origin + "/?modo=calc";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        alert("✅ Link copiado:\n" + link + "\n\nPegalo donde quieras (WhatsApp, navegador, etc).");
      }).catch(() => { prompt("Copiá este link manualmente:", link); });
    } else {
      prompt("Copiá este link manualmente:", link);
    }
  }

  function probarModoCalculadora() {
    if (window.confirm("¿Probar modo calculadora ahora?\n\nVas a ir al modo oculto. Para volver, ingresá tu PIN (" + pin + ") y tocá '=' en la calculadora.")) {
      window.location.href = "/?modo=calc";
    }
  }

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver al panel</button>
        <div className="mb-6 text-center">
          <PinEyeLogo size={70} showText={false} />
          <p className="text-[11px] uppercase tracking-[3px] mt-2" style={{ color: BRAND.gold }}>Guía de uso</p>
          <h2 className="text-xl font-bold mt-1" style={{ color: BRAND.white }}>¿Cómo funciona Traza 360?</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { k: "modulos", l: "Módulos" },
            { k: "contactos", l: "Contactos" },
            { k: "acceso", l: "Acceso rápido" },
            { k: "privacidad", l: "Privacidad" },
          ].map(t => (
            <button key={t.k} onClick={() => setSeccion(t.k)}
              className="rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0"
              style={{
                background: seccion === t.k ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                border: seccion === t.k ? `1px solid ${BRAND.borderStrong}` : `1px solid ${BRAND.border}`,
                color: seccion === t.k ? BRAND.gold : BRAND.textMute,
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.border}` }}>
          {seccion === "modulos" && (
            <>
              <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>Los 4 módulos de protección</h3>
              {[
                { icon: "shield", titulo: "Violencia de Género", desc: "Para personas en situación de riesgo. Botón de pánico, grabación silenciosa, botón de ingreso cuando entrás a un lugar desconocido, ubicación en tiempo real." },
                { icon: "teen", titulo: "Adolescente Seguro", desc: "Para que un adolescente avise a sus padres: AYUDA, bullying con evidencia, buscarlo del cole, llegar a casa con GPS, llamar taxi/Uber." },
                { icon: "night", titulo: "Noche Segura", desc: "Para jóvenes que salen de noche, acompañantes, repartidores y cualquier situación de riesgo. Pánico, botón de ingreso a lugares, grabación, GPS en vivo, Uber/taxi." },
                { icon: "eye", titulo: "Te Cuido a Distancia", desc: "Un familiar/amigo puede iniciar grabación remota CON tu aprobación. Funciona con código de vínculo de 6 dígitos." },
              ].map((m, i) => (
                <div key={i} className="flex gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="shrink-0 mt-0.5"><GoldIcon name={m.icon} size={24} /></div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: BRAND.gold }}>{m.titulo}</p>
                    <p className="text-sm mt-1" style={{ color: BRAND.textLight }}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {seccion === "contactos" && (
            <>
              <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>Contactos de confianza</h3>
              <p className="text-sm" style={{ color: BRAND.textLight }}>Sin contactos, la app no puede alertar a nadie. Agregá al menos 1 persona con WhatsApp activo.</p>
              <div className="space-y-2 mt-3">
                {[
                  "El número debe tener WhatsApp activo (sin WhatsApp no funciona).",
                  "Al guardar, se envía un WhatsApp automático de verificación.",
                  "El contacto recibe alertas con tu ubicación GPS y un menú de respuestas rápidas.",
                  "Plan Gratis: hasta 2 contactos. Plan Plus: 5. Premium: 10.",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2 text-sm" style={{ color: BRAND.textLight }}>
                    <span style={{ color: BRAND.gold }}>{"\u2713"}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {seccion === "acceso" && (
            <>
              <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>Acceso rápido y oculto</h3>
              <p className="text-sm mb-4" style={{ color: BRAND.textLight }}>Tres formas de tener Traza 360 a mano sin que se note.</p>

              {/* OPCIÓN 1: Agregar al inicio del celular (sin la palabra PWA) */}
              <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND.border}` }}>
                <p className="text-sm font-bold mb-2" style={{ color: BRAND.gold }}>{"\u{1F4F2}"} 1. Agregar Traza 360 al inicio de tu celular</p>
                <p className="text-sm mb-3" style={{ color: BRAND.textLight }}>Para abrir la app de un toque, como una app descargada (pero sin descargarla).</p>

                <div className="space-y-2.5">
                  <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <p className="text-[11px] font-bold mb-1.5" style={{ color: BRAND.gold }}>📱 Si tenés Android (Chrome):</p>
                    <ol className="text-sm space-y-1" style={{ color: BRAND.textLight }}>
                      <li>1. Tocá los <strong style={{ color: BRAND.white }}>3 puntitos</strong> arriba a la derecha del navegador</li>
                      <li>2. Tocá <strong style={{ color: BRAND.white }}>"Agregar a pantalla principal"</strong></li>
                      <li>3. Tocá <strong style={{ color: BRAND.white }}>"Agregar"</strong> para confirmar</li>
                    </ol>
                  </div>

                  <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <p className="text-[11px] font-bold mb-1.5" style={{ color: BRAND.gold }}>🍎 Si tenés iPhone (Safari):</p>
                    <ol className="text-sm space-y-1" style={{ color: BRAND.textLight }}>
                      <li>1. Tocá el <strong style={{ color: BRAND.white }}>ícono de compartir</strong> (cuadrado con flecha hacia arriba)</li>
                      <li>2. Bajá y tocá <strong style={{ color: BRAND.white }}>"Agregar al inicio"</strong></li>
                      <li>3. Tocá <strong style={{ color: BRAND.white }}>"Agregar"</strong> arriba a la derecha</li>
                    </ol>
                  </div>
                </div>

                <p className="text-[11px] mt-3" style={{ color: BRAND.gold }}>{"\u2713"} El ícono de Traza 360 aparece como cualquier otra app del celular.</p>
              </div>

              {/* OPCIÓN 2: Modo Calculadora con PIN CONFIGURABLE */}
              <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.borderStrong}` }}>
                <p className="text-sm font-bold mb-2" style={{ color: BRAND.gold }}>{"\u{1F522}"} 2. Modo Calculadora (acceso oculto total)</p>
                <p className="text-sm mb-3" style={{ color: BRAND.textLight }}>La app se ve como una calculadora normal. Solo vos sabés que es Traza 360.</p>

                {/* PIN ACTUAL */}
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BRAND.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: BRAND.textLight }}>Tu PIN actual</p>
                    <button onClick={() => setMostrarPin(!mostrarPin)} className="text-[11px] font-semibold" style={{ color: BRAND.gold }}>
                      {mostrarPin ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <p className="font-mono text-3xl font-bold tracking-widest text-center" style={{ color: BRAND.gold }}>
                    {mostrarPin ? pin : "•".repeat(pin.length)}
                  </p>
                </div>

                {/* CAMBIAR PIN */}
                <div className="mb-3">
                  <label className="text-[11px] uppercase tracking-wider block mb-1.5 font-bold" style={{ color: BRAND.textLight }}>
                    Cambiar PIN (4 a 8 números)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="8"
                      value={nuevoPin}
                      onChange={e => setNuevoPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ej: 4567"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
                      style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
                    />
                    <button onClick={guardarPin} disabled={nuevoPin.length < 4}
                      className="rounded-lg px-4 text-sm font-bold disabled:opacity-40"
                      style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                      Guardar
                    </button>
                  </div>
                  {pinGuardado && <p className="text-[11px] mt-1.5 font-semibold" style={{ color: BRAND.gold }}>{"\u2713"} PIN actualizado correctamente</p>}
                </div>

                {/* CÓMO SE USA */}
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <p className="text-[11px] font-bold mb-1.5" style={{ color: BRAND.gold }}>¿Cómo se usa?</p>
                  <ol className="text-sm space-y-1" style={{ color: BRAND.textLight }}>
                    <li>1. Abrís el link oculto en tu navegador</li>
                    <li>2. Te aparece una calculadora normal</li>
                    <li>3. Escribís tu PIN ({mostrarPin ? pin : "••••"}) y tocás <strong style={{ color: BRAND.white }}>"="</strong></li>
                    <li>4. Se abre Traza 360</li>
                  </ol>
                  <p className="text-[11px] mt-2 italic" style={{ color: BRAND.textMute }}>Si alguien mira tu pantalla, solo ve una calculadora.</p>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="space-y-2">
                  <button onClick={copiarLinkOculto}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold"
                    style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
                    {"\u{1F4CB}"} Copiar link de acceso oculto
                  </button>
                  <button onClick={probarModoCalculadora}
                    className="w-full rounded-lg py-2.5 text-sm font-bold"
                    style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                    {"\u{1F510}"} Probar modo calculadora ahora
                  </button>
                </div>

                <p className="text-[11px] mt-3" style={{ color: BRAND.textMute }}>
                  💡 <strong style={{ color: BRAND.gold }}>Tip:</strong> Agregá el link oculto a tu pantalla de inicio con nombre "Calculadora". Nadie va a sospechar.
                </p>
              </div>

              {/* OPCIÓN 3: Emergencia real */}
              <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.05)", border: `1px solid ${BRAND.red}30` }}>
                <p className="text-sm font-bold mb-2" style={{ color: BRAND.red }}>{"\u26A0\u{FE0F}"} 3. En una emergencia REAL</p>
                <p className="text-sm" style={{ color: BRAND.textLight }}>Si tu vida o la de alguien está en peligro inminente, llamá <strong style={{ color: BRAND.red }}>primero</strong> al 911 (o al número de emergencias de tu país). Traza 360 te ayuda a avisar a tus contactos, pero NO reemplaza a la policía ni a los servicios médicos.</p>
              </div>
            </>
          )}

          {seccion === "privacidad" && (
            <>
              <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>Tus datos son tuyos</h3>
              <div className="space-y-2 mt-3">
                {[
                  "No vendemos ni compartimos tu información con terceros.",
                  "Las grabaciones se guardan encriptadas en la nube.",
                  "Solo vos ves tus contactos y tus evidencias.",
                  "Podés eliminar tu cuenta y todos los datos en cualquier momento.",
                  "Te Cuido a Distancia requiere SIEMPRE tu aprobación explícita para cada grabación.",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2 text-sm" style={{ color: BRAND.textLight }}>
                    <span style={{ color: BRAND.gold }}>{"\u2713"}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-4" style={{ color: BRAND.textMute }}>Contacto: {SUPPORT_EMAIL}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════
// POLÍTICA DE PRIVACIDAD (v19.6) — pantalla completa
// ═══════════════════════════════════════════════
function PoliticaPrivacidadScreen({ onBack }) {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        <div className="mb-6 text-center">
          <PinEyeLogo size={60} showText={false} />
          <p className="text-[11px] uppercase tracking-[3px] mt-2" style={{ color: BRAND.gold }}>Política de Privacidad</p>
          <h2 className="text-xl font-bold mt-1" style={{ color: BRAND.white }}>Tus datos son tuyos</h2>
          <p className="text-[11px] mt-2" style={{ color: BRAND.textMute }}>Versión 19.6 · Vigente desde Mayo 2026</p>
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.border}` }}>

          {/* 1. Quién es el responsable */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>1. Responsable del tratamiento de datos</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              <strong style={{ color: BRAND.white }}>Tristan Passaglia</strong>, con domicilio en Córdoba, Argentina, es el responsable del tratamiento de los datos personales recolectados a través de Traza 360. Para cualquier consulta sobre privacidad: <span style={{ color: BRAND.gold }}>{SUPPORT_EMAIL}</span>.
            </p>
          </div>

          {/* 2. Qué datos guardamos */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>2. Qué datos guardamos</h3>
            <p className="text-sm mb-2" style={{ color: BRAND.textLight }}>Para que la app funcione, almacenamos:</p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Tu cuenta:</strong> nombre, email, contraseña encriptada.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Tus contactos de confianza:</strong> nombre, teléfono, relación.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Tu ubicación GPS:</strong> SOLO cuando activás una alerta o función que la requiere. NUNCA en background.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Tus grabaciones de audio:</strong> guardadas encriptadas en la nube (Supabase). Solo vos las podés ver, escuchar o eliminar.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Historial de alertas:</strong> fecha, hora, módulo usado, contactos avisados.</li>
            </ul>
          </div>

          {/* 3. Para qué usamos la ubicación */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>3. Sobre tu ubicación GPS</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Tu ubicación se comparte <strong style={{ color: BRAND.white }}>únicamente</strong> cuando:
            </p>
            <ul className="text-sm space-y-1 mt-2" style={{ color: BRAND.textLight }}>
              <li>{"\u2713"} Tocás el botón de pánico</li>
              <li>{"\u2713"} Activás "Me perdí" o "Compartir ubicación"</li>
              <li>{"\u2713"} Iniciás un Botón de ingreso a un lugar</li>
              <li>{"\u2713"} Llamás un Uber/taxi desde la app</li>
            </ul>
            <p className="text-sm mt-2 italic" style={{ color: BRAND.textMute }}>
              No te seguimos. No vendemos tu ubicación. No la compartimos con terceros excepto los contactos que VOS elegís.
            </p>
          </div>

          {/* 4. Con quién compartimos */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>4. ¿Con quién compartimos tus datos?</h3>
            <p className="text-sm mb-2" style={{ color: BRAND.textLight }}>Compartimos datos SOLO con estos servicios necesarios:</p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Supabase:</strong> base de datos y almacenamiento de archivos (servidores en São Paulo, Brasil).</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Meta WhatsApp Business:</strong> para enviar alertas a tus contactos via WhatsApp.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Google (opcional):</strong> si elegís login con Google.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>MercadoPago:</strong> solo para procesar pagos cuando habilitemos planes. No almacenamos datos de tarjeta.</li>
            </ul>
            <p className="text-sm mt-3 font-semibold" style={{ color: BRAND.gold }}>
              {"\u2713"} NO vendemos información a terceros con fines comerciales.
            </p>
          </div>

          {/* 5. Contactos de terceros */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>5. Sobre los contactos que agregás</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Al agregar un contacto de confianza, <strong style={{ color: BRAND.white }}>vos sos responsable</strong> de haber obtenido su consentimiento para recibir mensajes por WhatsApp. Al guardar el contacto, le enviamos automáticamente un mensaje de verificación.
            </p>
            <div className="rounded-xl p-3 mt-3" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-sm" style={{ color: BRAND.gold }}>
                <strong>Importante:</strong> Si un contacto te pide que lo elimines, hacelo desde la pantalla "Mis Contactos" {"\u2192"} "Eliminar".
              </p>
            </div>
          </div>

          {/* 6. Tus derechos */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>6. Tus derechos (Ley 25.326 Argentina)</h3>
            <p className="text-sm mb-2" style={{ color: BRAND.textLight }}>Tenés derecho a:</p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Acceder</strong> a todos tus datos guardados</li>
              <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Rectificar</strong> datos incorrectos (editando tu perfil)</li>
              <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Borrar tu cuenta</strong> y todos tus datos cuando quieras (desde el panel)</li>
              <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Descargar</strong> una copia de tus datos (escribinos a {SUPPORT_EMAIL})</li>
              <li>{"\u2713"} <strong style={{ color: BRAND.white }}>Oponerte</strong> al tratamiento de datos en cualquier momento</li>
            </ul>
          </div>

          {/* 7. Borrado */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>7. Cómo borrar tu cuenta</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Desde el panel principal {"\u2192"} "Cerrar sesión" {"\u2192"} "Borrar mi cuenta". Esta acción es <strong style={{ color: BRAND.red }}>permanente</strong> y elimina TODOS tus datos (contactos, grabaciones, historial) en máximo 48hs.
            </p>
          </div>

          {/* 8. Cookies */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>8. Cookies y almacenamiento local</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Usamos almacenamiento local del navegador (sessionStorage) para mantener tu sesión activa y guardar configuraciones (PIN, idioma). No usamos cookies de seguimiento ni publicidad.
            </p>
          </div>

          {/* 9. Menores */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>9. Edad mínima</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Traza 360 está pensada para personas de <strong style={{ color: BRAND.white }}>13 años o más</strong>. Si sos menor de 18 años, necesitás autorización de tu padre, madre o tutor legal. No recolectamos datos a sabiendas de menores de 13 años.
            </p>
          </div>

          {/* 10. Cambios */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>10. Cambios a esta política</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Si cambiamos esta política te avisaremos por email y en la app. La fecha de "Vigente desde" arriba indica la versión actual.
            </p>
          </div>

          {/* Contacto */}
          <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.borderStrong}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: BRAND.gold }}>{"\u{1F4E7}"} Contacto por privacidad</p>
            <p className="text-sm" style={{ color: BRAND.textLight }}>
              Si tenés dudas, querés ejercer un derecho o reclamar, escribinos a:<br/>
              <strong style={{ color: BRAND.white }}>{SUPPORT_EMAIL}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TÉRMINOS Y CONDICIONES (v19.6) — pantalla completa
// ═══════════════════════════════════════════════
function TerminosScreen({ onBack }) {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        <div className="mb-6 text-center">
          <PinEyeLogo size={60} showText={false} />
          <p className="text-[11px] uppercase tracking-[3px] mt-2" style={{ color: BRAND.gold }}>Términos y Condiciones</p>
          <h2 className="text-xl font-bold mt-1" style={{ color: BRAND.white }}>Acuerdo de uso</h2>
          <p className="text-[11px] mt-2" style={{ color: BRAND.textMute }}>Versión 19.6 · Vigente desde Mayo 2026</p>
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.border}` }}>

          {/* ⚠️ ALERTA CRÍTICA */}
          <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.1)", border: `2px solid ${BRAND.red}` }}>
            <p className="text-sm font-bold mb-2" style={{ color: BRAND.red }}>{"\u26A0\u{FE0F}"} IMPORTANTE — LEELO ANTES DE USAR LA APP</p>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.white }}>
              <strong>Traza 360 NO es un servicio de emergencia.</strong> NO reemplaza a la policía (911, 101), bomberos, SAME (107), ni a ningún servicio oficial de emergencia. En una situación de peligro real e inminente, <strong style={{ color: BRAND.red }}>SIEMPRE llamá primero al número de emergencias de tu país.</strong>
            </p>
          </div>

          {/* 1. Aceptación */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>1. Aceptación de los términos</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Al registrarte en Traza 360 aceptás estos Términos y Condiciones y la Política de Privacidad. Si no estás de acuerdo, no uses la app.
            </p>
          </div>

          {/* 2. Qué es la app */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>2. Qué hace Traza 360</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Traza 360 es una herramienta de seguridad personal que te permite enviar mensajes de alerta vía WhatsApp a tus contactos de confianza, compartir tu ubicación, y grabar audio del entorno. Es una <strong style={{ color: BRAND.white }}>herramienta complementaria</strong> a los servicios de emergencia oficiales.
            </p>
          </div>

          {/* 3. NO garantías */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>3. Limitación de responsabilidad</h3>
            <p className="text-sm mb-2" style={{ color: BRAND.textLight }}>
              <strong style={{ color: BRAND.white }}>NO garantizamos que:</strong>
            </p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li><span style={{ color: BRAND.red }}>✗</span> Tu mensaje llegue al destinatario inmediatamente.</li>
              <li><span style={{ color: BRAND.red }}>✗</span> Tus contactos vean el mensaje o respondan a tiempo.</li>
              <li><span style={{ color: BRAND.red }}>✗</span> La app funcione si no tenés internet o señal.</li>
              <li><span style={{ color: BRAND.red }}>✗</span> El GPS funcione en lugares cerrados, bajo tierra o sin señal.</li>
              <li><span style={{ color: BRAND.red }}>✗</span> WhatsApp esté operativo en todo momento.</li>
              <li><span style={{ color: BRAND.red }}>✗</span> La grabación de audio se complete si el navegador la corta.</li>
            </ul>
            <p className="text-sm mt-3 italic" style={{ color: BRAND.textMute }}>
              Traza 360 hace todo lo posible para que el servicio funcione, pero depende de servicios externos (internet, GPS, WhatsApp, Supabase) que pueden fallar.
            </p>
          </div>

          {/* 4. Qué pasa si falla */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>4. Qué hacer si la app falla</h3>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li><span style={{ color: BRAND.gold }}>•</span> Si <strong style={{ color: BRAND.white }}>no tenés internet:</strong> llamá directamente al 911 o a tu contacto desde Teléfono.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> Si <strong style={{ color: BRAND.white }}>el GPS no funciona:</strong> la app envía la última ubicación conocida.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> Si <strong style={{ color: BRAND.white }}>WhatsApp está caído:</strong> el mensaje queda pendiente hasta que se restablezca.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> Si <strong style={{ color: BRAND.white }}>la app se cuelga:</strong> reintentá. Si persiste, escribinos.</li>
            </ul>
          </div>

          {/* 5. Tu responsabilidad */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>5. Tu responsabilidad como usuario</h3>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li>{"\u2713"} Sos responsable de mantener actualizados tus contactos de confianza.</li>
              <li>{"\u2713"} Sos responsable de informarles que pueden recibir alertas de WhatsApp.</li>
              <li>{"\u2713"} Sos responsable de no usar la app para acosar, espiar o grabar a otros sin consentimiento (es delito).</li>
              <li>{"\u2713"} No podés usar Traza 360 para actividades ilegales.</li>
              <li>{"\u2713"} Sos responsable de la veracidad de tus datos.</li>
            </ul>
          </div>

          {/* 6. Suspensión */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>6. Suspensión de cuentas</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Nos reservamos el derecho de suspender o eliminar cuentas que usen la app para fines ilegales, abuso, acoso, o uso indebido del servicio de WhatsApp Business.
            </p>
          </div>

          {/* 7. Pagos (futuro) */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>7. Planes pagos (cuando se habiliten)</h3>
            <p className="text-sm mb-2" style={{ color: BRAND.textLight }}>
              Actualmente <strong style={{ color: BRAND.gold }}>todos los planes son gratuitos durante la beta.</strong> Cuando habilitemos planes pagos:
            </p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li><span style={{ color: BRAND.gold }}>•</span> Los precios serán los publicados en la pantalla de planes.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> Se cobra por MercadoPago (Argentina y LATAM).</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Sin permanencia:</strong> podés cancelar cuando quieras desde "Mi cuenta".</li>
              <li><span style={{ color: BRAND.gold }}>•</span> <strong style={{ color: BRAND.white }}>Sin reembolso del mes en curso</strong>, pero al cancelar no se renueva el siguiente.</li>
              <li><span style={{ color: BRAND.gold }}>•</span> Los precios pueden cambiar con aviso de 30 días por email.</li>
            </ul>
          </div>

          {/* 8. Edad */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>8. Edad mínima</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Debés tener al menos <strong style={{ color: BRAND.white }}>13 años</strong> para usar Traza 360. Si sos menor de 18 años, necesitás autorización de tu padre/madre/tutor.
            </p>
          </div>

          {/* 9. Modificaciones */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>9. Modificaciones</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Podemos modificar estos términos. Si lo hacemos, te avisaremos por email y en la app. El uso continuado de la app implica aceptación de los nuevos términos.
            </p>
          </div>

          {/* 10. Ley aplicable */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>10. Ley aplicable y jurisdicción</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Estos términos se rigen por las leyes de la <strong style={{ color: BRAND.white }}>República Argentina</strong>. Cualquier disputa se resolverá en los tribunales ordinarios de la ciudad de Córdoba, Argentina.
            </p>
          </div>

          {/* Contacto */}
          <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.borderStrong}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: BRAND.gold }}>{"\u{1F4E7}"} Contacto legal</p>
            <p className="text-sm" style={{ color: BRAND.textLight }}>
              <strong style={{ color: BRAND.white }}>Tristan Passaglia</strong><br/>
              Córdoba, Argentina<br/>
              <span style={{ color: BRAND.gold }}>{SUPPORT_EMAIL}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// BORRAR CUENTA (v19.6) — pantalla con confirmación
// ═══════════════════════════════════════════════
function BorrarCuentaScreen({ onBack, onAccountDeleted }) {
  const [paso, setPaso] = useState(1); // 1: advertencia | 2: confirmar texto | 3: procesando | 4: hecho
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  async function borrarCuenta() {
    setError("");
    setPaso(3);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("No hay sesión activa.");
        setPaso(2);
        return;
      }

      // 1. Borrar contactos
      await supabase.from("contactos").delete().eq("usuario_id", user.id);
      // 2. Borrar grabaciones del storage
      try {
        const { data: files } = await supabase.storage.from("evidencias").list(user.id);
        if (files && files.length > 0) {
          const paths = files.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from("evidencias").remove(paths);
        }
      } catch(e) { console.warn("Error borrando evidencias:", e); }
      // 3. Borrar perfil
      await supabase.from("usuarios").delete().eq("auth_user_id", user.id);
      // 4. Cerrar sesión y borrar storage local
      await supabase.auth.signOut();
      try {
        sessionStorage.clear();
      } catch(e){}

      setPaso(4);
      setTimeout(() => { onAccountDeleted(); }, 3000);
    } catch (e) {
      console.error("Error borrando cuenta:", e);
      setError("No se pudo borrar la cuenta. Escribinos a " + SUPPORT_EMAIL + " para que lo hagamos manualmente.");
      setPaso(2);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="w-full max-w-md">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `2px solid ${BRAND.red}` }}>

          {paso === 1 && (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">{"\u26A0\u{FE0F}"}</div>
                <h2 className="text-xl font-bold" style={{ color: BRAND.red }}>Borrar mi cuenta</h2>
                <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>Esta acción es <strong style={{ color: BRAND.red }}>PERMANENTE e IRREVERSIBLE</strong></p>
              </div>

              <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${BRAND.red}40` }}>
                <p className="text-sm font-bold mb-2" style={{ color: BRAND.red }}>Al borrar tu cuenta se eliminará:</p>
                <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
                  <li><span style={{ color: BRAND.red }}>✗</span> Tu perfil (nombre, email, configuración)</li>
                  <li><span style={{ color: BRAND.red }}>✗</span> Todos tus contactos de confianza</li>
                  <li><span style={{ color: BRAND.red }}>✗</span> Todas tus grabaciones de audio</li>
                  <li><span style={{ color: BRAND.red }}>✗</span> Tu historial de alertas</li>
                  <li><span style={{ color: BRAND.red }}>✗</span> Tu PIN del modo calculadora</li>
                </ul>
              </div>

              <div className="rounded-xl p-3 mb-5" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
                <p className="text-sm" style={{ color: BRAND.gold }}>
                  💡 <strong>¿Cambiaste de opinión?</strong> Podés solo cerrar sesión y tus datos quedan guardados para volver más adelante.
                </p>
              </div>

              <div className="space-y-2">
                <button onClick={() => setPaso(2)} className="w-full rounded-xl py-3 text-sm font-bold"
                  style={{ background: BRAND.red, color: BRAND.white, border: `1px solid ${BRAND.red}` }}>
                  Sí, quiero borrar mi cuenta
                </button>
                <button onClick={onBack} className="w-full rounded-xl py-3 text-sm font-semibold"
                  style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
                  Cancelar (volver al panel)
                </button>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">{"\u{1F512}"}</div>
                <h2 className="text-lg font-bold" style={{ color: BRAND.red }}>Confirmación final</h2>
                <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>Escribí la palabra <strong style={{ color: BRAND.red }}>BORRAR</strong> para confirmar</p>
              </div>

              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="BORRAR"
                className="w-full rounded-xl px-4 py-3 text-center font-mono text-lg font-bold mb-3 outline-none tracking-widest"
                style={{ background: "rgba(0,0,0,0.5)", border: `2px solid ${confirmText === "BORRAR" ? BRAND.red : BRAND.border}`, color: BRAND.white }}
              />

              {error && (
                <div className="rounded-lg p-2.5 mb-3" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40` }}>
                  <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <button onClick={borrarCuenta} disabled={confirmText !== "BORRAR"}
                  className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-30"
                  style={{ background: BRAND.red, color: BRAND.white }}>
                  {"\u{1F5D1}\u{FE0F}"} Borrar para siempre
                </button>
                <button onClick={() => { setPaso(1); setConfirmText(""); }} className="w-full rounded-xl py-2.5 text-sm"
                  style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
                  Volver atrás
                </button>
              </div>
            </>
          )}

          {paso === 3 && (
            <div className="text-center py-10">
              <div className="animate-spin text-5xl mb-4">{"\u{1F504}"}</div>
              <p className="text-sm font-semibold" style={{ color: BRAND.white }}>Borrando tu cuenta...</p>
              <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>No cierres esta ventana.</p>
            </div>
          )}

          {paso === 4 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">{"\u2705"}</div>
              <h2 className="text-lg font-bold" style={{ color: BRAND.gold }}>Cuenta eliminada</h2>
              <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>Todos tus datos fueron borrados. Te redirigimos al inicio.</p>
              <p className="text-[11px] mt-3 italic" style={{ color: BRAND.textMute }}>Si querés volver, podés crear una cuenta nueva en cualquier momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// RECUPERAR CONTRASEÑA (v19.6)
// ═══════════════════════════════════════════════
function RecuperarPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar() {
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Ingresá un email válido.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (err) {
        setError("Error: " + err.message);
        return;
      }
      setEnviado(true);
    } catch (e) {
      setLoading(false);
      setError("Error al enviar. Probá de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl md:p-8" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}` }}>
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        {enviado ? (
          <div className="text-center mt-6">
            <div className="text-5xl mb-3">{"\u{1F4E7}"}</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: BRAND.gold }}>Email enviado</h2>
            <p className="text-sm" style={{ color: BRAND.textLight }}>
              Te enviamos un email a <strong style={{ color: BRAND.white }}>{email}</strong> con un link para restablecer tu contraseña.
            </p>
            <p className="text-sm mt-3" style={{ color: BRAND.textMute }}>
              Revisá también la carpeta de SPAM si no lo ves en 5 minutos.
            </p>
            <button onClick={onBack} className="mt-6 w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: BRAND.goldGradient, color: BRAND.black }}>
              Volver al login
            </button>
          </div>
        ) : (
          <>
            <h2 className="mt-5 text-center text-xl font-bold" style={{ color: BRAND.white }}>Recuperar contraseña</h2>
            <p className="text-sm text-center mt-2 mb-6" style={{ color: BRAND.textLight }}>
              Te enviamos un email con un link para crear una contraseña nueva.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider block mb-1.5 font-bold" style={{ color: BRAND.textLight }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BRAND.border}`, color: BRAND.white }}
                />
              </div>

              {error && <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>}

              <button onClick={enviar} disabled={loading}
                className="w-full rounded-xl py-3.5 font-bold disabled:opacity-50"
                style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                {loading ? "Enviando..." : "Enviar email de recuperación"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SOBRE NOSOTROS (v19.7)
// ═══════════════════════════════════════════════
function SobreNosotrosScreen({ onBack }) {
  return (
    <div className="min-h-screen px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        <div className="mb-6 text-center">
          <PinEyeLogo size={80} showText={false} />
          <p className="text-[11px] uppercase tracking-[3px] mt-3" style={{ color: BRAND.gold }}>Sobre nosotros</p>
          <h2 className="text-xl font-bold mt-1" style={{ color: BRAND.white }}>Quiénes somos</h2>
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.border}` }}>

          {/* Misión */}
          <div>
            <h3 className="font-bold mb-3" style={{ color: BRAND.gold }}>Nuestra misión</h3>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
              Traza 360 es una empresa pensada para el <strong style={{ color: BRAND.white }}>cuidado, soporte, seguimiento y acompañamiento</strong> de personas expuestas a situaciones de riesgo.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: BRAND.textLight }}>
              Creemos que la tecnología debe estar al servicio de quienes más la necesitan. Por eso construimos una herramienta que conecta a las personas con su gente de confianza cuando más importa.
            </p>
          </div>

          {/* Para quién */}
          <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
            <p className="text-sm font-bold mb-2" style={{ color: BRAND.gold }}>{"\u{1F6E1}\u{FE0F}"} ¿Para quién?</p>
            <ul className="text-sm space-y-1.5" style={{ color: BRAND.textLight }}>
              <li>{"\u2713"} Mujeres en situación de violencia de género</li>
              <li>{"\u2713"} Padres y madres con hijos adolescentes</li>
              <li>{"\u2713"} Jóvenes que salen de noche</li>
              <li>{"\u2713"} Trabajadores nocturnos (acompañantes, repartidores)</li>
              <li>{"\u2713"} Familiares que cuidan a alguien a distancia</li>
            </ul>
          </div>

          {/* Equipo */}
          <div>
            <h3 className="font-bold mb-2" style={{ color: BRAND.gold }}>Equipo</h3>
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-sm font-bold" style={{ color: BRAND.white }}>{RESPONSABLE_NAME}</p>
              <p className="text-sm mt-1" style={{ color: BRAND.gold }}>Fundador y desarrollador</p>
              <p className="text-sm mt-2" style={{ color: BRAND.textLight }}>{RESPONSABLE_LOCATION}</p>
            </div>
          </div>

          {/* Contacto */}
          <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.borderStrong}` }}>
            <p className="text-sm font-bold mb-2" style={{ color: BRAND.gold }}>{"\u{1F4E7}"} Contacto</p>
            <div className="text-sm space-y-1" style={{ color: BRAND.textLight }}>
              <p>Email: <span style={{ color: BRAND.white }}>{SUPPORT_EMAIL}</span></p>
              <p>WhatsApp: <span style={{ color: BRAND.white }}>+54 9 351 395 6879</span></p>
              <p>Ubicación: <span style={{ color: BRAND.white }}>{RESPONSABLE_LOCATION}</span></p>
            </div>
          </div>

          <p className="text-[11px] text-center italic" style={{ color: BRAND.textMute }}>
            Versión {APP_VERSION} · Hecho con cuidado en Argentina {"\u{1F1E6}\u{1F1F7}"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TOUR DEMO (v19.7) — onboarding interactivo del botón pánico
// ═══════════════════════════════════════════════
function TourDemoScreen({ onComplete, onSkip }) {
  const [paso, setPaso] = useState(0);

  const pasos = [
    {
      titulo: "Vamos a hacer una prueba",
      subtitulo: "Sin enviar nada real",
      icono: "panic",
      texto: "Antes de que necesites usar Traza 360 en una emergencia real, te mostramos cómo funciona en 4 pasos rápidos. Esto es una simulación: NO se va a enviar ningún mensaje a nadie.",
      ctaText: "Empezar prueba",
    },
    {
      titulo: "Paso 1: Tocás el botón de pánico",
      subtitulo: "El círculo dorado/rojo abajo a la derecha",
      icono: "panic",
      texto: "Cuando estés en peligro, tocás el botón flotante. Está siempre visible en el panel principal. Probalo mentalmente: lo ves abajo a la derecha en la app.",
      ctaText: "Continuar",
      mostrarBoton: true,
    },
    {
      titulo: "Paso 2: Se manda WhatsApp + ubicación",
      subtitulo: "A tus contactos de confianza",
      icono: "alert",
      texto: "Tus contactos reciben un WhatsApp automático con: tu mensaje, tu ubicación GPS exacta, la hora del evento, y un menú de respuestas rápidas para que respondan más fácil.",
      ctaText: "Ver cómo responden",
    },
    {
      titulo: "Paso 3: Ellos te responden rápido",
      subtitulo: "Con un toque",
      icono: "contacts",
      texto: "Tus contactos pueden responder con 3 botones de WhatsApp: \"🚗 Salgo\", \"✅ Recibí\", \"📍 Ubicación\". Vos vés sus respuestas en la pantalla post-alerta de tu app.",
      ctaText: "Continuar",
      mostrarRespuestas: true,
    },
    {
      titulo: "¡Listo! Ya sabés usarla",
      subtitulo: "Ahora configurá tus contactos",
      icono: "shield",
      texto: "Para que esto funcione en una emergencia real, necesitás agregar al menos 1 contacto de confianza con WhatsApp activo. Lo hacés desde el panel → \"Mis Contactos\".",
      ctaText: "Ir al panel principal",
    },
  ];

  const actual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {pasos.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all" style={{
            width: i === paso ? "32px" : "8px",
            background: i === paso ? BRAND.gold : i < paso ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.15)",
          }} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl p-7 text-center" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}`, boxShadow: "8px 8px 24px rgba(0,0,0,0.6), 0 0 30px rgba(212,175,55,0.06)" }}>

          {/* Badge de "Modo Demo" */}
          <div className="inline-block rounded-full px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
            {"\u{1F39B}\u{FE0F}"} Modo demo
          </div>

          {/* Ícono dorado del paso */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(154,123,15,0.08))", border: `1px solid ${BRAND.borderStrong}` }}>
              <GoldIcon name={actual.icono} size={42} />
            </div>
          </div>

          <h2 className="text-lg font-bold mb-1" style={{ color: BRAND.white }}>{actual.titulo}</h2>
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: BRAND.gold }}>{actual.subtitulo}</p>
          <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>{actual.texto}</p>

          {/* Simulación visual paso 2 */}
          {actual.mostrarBoton && (
            <div className="mt-4 flex justify-center">
              <div className="relative">
                <div className="absolute inset-[-6px] rounded-full" style={{ border: `2px solid ${BRAND.gold}`, animation: "panicPulseDemo 2s infinite" }} />
                <div className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: BRAND.black, border: `3px solid ${BRAND.gold}`, boxShadow: `0 0 20px ${BRAND.gold}55` }}>
                  <PinEyeLogo size={42} showText={false} />
                </div>
              </div>
              <style>{`@keyframes panicPulseDemo { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.12)} }`}</style>
            </div>
          )}

          {/* Simulación de respuestas rápidas paso 3 */}
          {actual.mostrarRespuestas && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { emoji: "\u{1F697}", text: "Salgo" },
                { emoji: "\u2705", text: "Recibí" },
                { emoji: "\u{1F4CD}", text: "Ubicación" },
              ].map((r, i) => (
                <div key={i} className="rounded-lg py-2 text-center" style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BRAND.borderStrong}` }}>
                  <div className="text-xl">{r.emoji}</div>
                  <div className="text-[10px] mt-0.5 font-bold" style={{ color: BRAND.gold }}>{r.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <button onClick={() => esUltimo ? onComplete() : setPaso(paso + 1)}
          className="w-full rounded-2xl py-4 mt-6 font-bold shadow-lg"
          style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(212,175,55,0.3)" }}>
          {actual.ctaText} {esUltimo ? "" : "→"}
        </button>

        {/* Botones secundarios */}
        <div className="flex justify-between mt-3 px-2">
          {paso > 0 && (
            <button onClick={() => setPaso(paso - 1)} className="text-sm font-semibold" style={{ color: BRAND.textLight }}>
              ← Atrás
            </button>
          )}
          {!esUltimo && (
            <button onClick={onSkip} className="text-sm ml-auto" style={{ color: BRAND.textMute }}>
              Saltar tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MODAL EXPLICATIVO GPS (v19.7)
// Aparece antes de pedir geolocation por primera vez
// ═══════════════════════════════════════════════
function GpsExplainerModal({ onAceptar, onRechazar }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: "#000000", border: `2px solid ${BRAND.borderStrong}` }}>
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(154,123,15,0.08))", border: `1px solid ${BRAND.borderStrong}` }}>
              <GoldIcon name="pin" size={36} />
            </div>
          </div>
          <h3 className="text-lg font-bold" style={{ color: BRAND.white }}>Necesitamos tu ubicación</h3>
          <p className="text-sm mt-2" style={{ color: BRAND.gold }}>Para enviarte ayuda cuando la necesites</p>
        </div>

        <div className="rounded-xl p-4 mb-4 space-y-2.5" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: BRAND.gold }}>{"\u2713"}</span>
            <p className="text-sm" style={{ color: BRAND.textLight }}><strong style={{ color: BRAND.white }}>Solo cuando vos lo decidís:</strong> al tocar pánico, compartir ubicación, o cualquier alerta.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: BRAND.gold }}>{"\u2713"}</span>
            <p className="text-sm" style={{ color: BRAND.textLight }}><strong style={{ color: BRAND.white }}>NO te seguimos:</strong> jamás recolectamos ubicación en background.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: BRAND.gold }}>{"\u2713"}</span>
            <p className="text-sm" style={{ color: BRAND.textLight }}><strong style={{ color: BRAND.white }}>Solo tus contactos la ven:</strong> nadie más, ni nosotros la vendemos.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5" style={{ color: BRAND.gold }}>{"\u2713"}</span>
            <p className="text-sm" style={{ color: BRAND.textLight }}><strong style={{ color: BRAND.white }}>Podés revocarla cuando quieras</strong> desde la configuración de tu navegador.</p>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(220,38,38,0.05)", border: `1px solid ${BRAND.red}30` }}>
          <p className="text-[11px]" style={{ color: BRAND.textLight }}>
            <strong style={{ color: BRAND.red }}>{"\u26A0\u{FE0F}"} Si rechazás:</strong> los contactos recibirán alertas SIN tu ubicación, lo que dificulta que te encuentren rápido.
          </p>
        </div>

        <button onClick={onAceptar}
          className="w-full rounded-xl py-3.5 text-sm font-bold mb-2 shadow-lg"
          style={{ background: BRAND.goldGradient, color: BRAND.black }}>
          {"\u2713"} Entendido, permitir ubicación
        </button>
        <button onClick={onRechazar}
          className="w-full rounded-xl py-2.5 text-sm"
          style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
          Ahora no
        </button>

        <p className="text-[10px] text-center mt-3" style={{ color: BRAND.textMute }}>
          Después de aceptar acá, el navegador te va a pedir confirmación una vez más.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PIN DE ACCESO RÁPIDO (v19.8)
// 4 dígitos guardados localmente. NO reemplaza al login.
// Es un atajo: usuario primero hace login con email,
// después puede crear un PIN para entrar más rápido próximas veces.
// ═══════════════════════════════════════════════
// ── Componente inline para ofrecer biometría después del PIN ──
function BiometriaSetupInline({ nombreUsuario, onDone }) {
  const [estado,  setEstado]  = useState("idle"); // idle | loading | ok | error | nodisp
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(ok => { if (!ok) setEstado("nodisp"); })
      .catch(() => setEstado("nodisp"));
  }, []);

  async function activar() {
    setEstado("loading");
    const r = await registrarBiometria(nombreUsuario);
    if (r.ok) { setEstado("ok"); setTimeout(() => onDone(), 1500); }
    else { setEstado("error"); setMsg(r.error); }
  }

  if (estado === "nodisp") return (
    <button onClick={onDone} className="w-full text-sm py-2" style={{ color: BRAND.textMute }}>
      Continuar →
    </button>
  );

  if (estado === "ok") return (
    <div className="text-center">
      <p className="text-sm font-bold" style={{ color: "#22c55e" }}>✅ Biometría activada</p>
      <p className="text-sm mt-1" style={{ color: BRAND.textLight }}>La próxima vez entrás con huella o Face ID.</p>
    </div>
  );

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${BRAND.borderStrong}` }}>
      <p className="text-sm font-bold mb-1" style={{ color: BRAND.gold }}>
        {/iPhone|iPad|Mac/.test(navigator.userAgent) ? "🔒 ¿Activar Face ID?" : "👆 ¿Activar huella?"}
      </p>
      <p className="text-sm mb-3" style={{ color: BRAND.textLight }}>
        Entrá con un toque, igual que WhatsApp. Más rápido y más seguro.
      </p>
      {estado === "error" && (
        <p className="text-sm mb-2" style={{ color: "#fca5a5" }}>{msg}</p>
      )}
      <button onClick={activar} disabled={estado === "loading"}
        className="w-full rounded-xl py-3 text-sm font-bold mb-2 disabled:opacity-50"
        style={{ background: BRAND.goldGradient, color: BRAND.black }}>
        {estado === "loading" ? "Activando..." : "Activar biometría"}
      </button>
      <button onClick={onDone} className="w-full text-sm py-1" style={{ color: BRAND.textMute }}>
        Ahora no, usar solo PIN
      </button>
    </div>
  );
}

function PinSetupScreen({ onBack, onComplete, modo = "crear" }) {
  // modo: "crear" | "cambiar" | "eliminar"
  const [paso, setPaso] = useState(1); // 1: ingresar | 2: confirmar | 3: hecho
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");

  function getTitulo() {
    if (modo === "crear") return "Configurar PIN de acceso";
    if (modo === "cambiar") return "Cambiar PIN";
    if (modo === "eliminar") return "Eliminar PIN";
    return "PIN";
  }

  function handleChange(setter, value) {
    setError("");
    const clean = value.replace(/\D/g, "").slice(0, 4);
    setter(clean);
    // Avanzar automáticamente al completar 4 dígitos
    if (clean.length === 4 && paso === 1) {
      setTimeout(() => setPaso(2), 200);
    }
  }

  function eliminar() {
    if (!window.confirm("¿Eliminar tu PIN de acceso rápido?\n\nVas a tener que ingresar con email y contraseña cada vez.")) return;
    try {
      sessionStorage.removeItem("traza360_quick_pin");
      localStorage.removeItem("traza360_quick_pin");
    } catch(e){}
    setPaso(3);
    setTimeout(() => onComplete(), 1800);
  }

  function confirmar() {
    setError("");
    if (pin.length !== 4) { setError("El PIN debe tener 4 números."); return; }
    if (pinConfirm.length !== 4) { setError("Confirmá tu PIN escribiendo los 4 números otra vez."); return; }
    if (pin !== pinConfirm) {
      setError("Los PINs no coinciden. Volvé a empezar.");
      setPin("");
      setPinConfirm("");
      setPaso(1);
      return;
    }
    // Guardar en localStorage (persiste entre sesiones)
    try {
      localStorage.setItem("traza360_quick_pin", pin);
    } catch(e) {
      setError("Error al guardar el PIN.");
      return;
    }
    setPaso(3);
    setTimeout(() => onComplete(), 1800);
  }

  // PinKeypad: teclado numérico visual (mejor UX que input)
  function PinKeypad({ value, onChange, autoFocus }) {
    const dots = [0, 1, 2, 3];
    return (
      <div>
        {/* Display de puntos */}
        <div className="flex justify-center gap-3 mb-6">
          {dots.map(i => (
            <div key={i} className="h-4 w-4 rounded-full transition-all"
              style={{
                background: i < value.length ? BRAND.gold : "transparent",
                border: `2px solid ${i < value.length ? BRAND.gold : BRAND.border}`,
              }} />
          ))}
        </div>
        {/* Teclado */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => value.length < 4 && onChange(value + n)}
              className="rounded-2xl py-4 text-2xl font-bold active:scale-95"
              style={{ background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
              {n}
            </button>
          ))}
          <div /> {/* Espacio vacío */}
          <button onClick={() => value.length < 4 && onChange(value + "0")}
            className="rounded-2xl py-4 text-2xl font-bold active:scale-95"
            style={{ background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
            0
          </button>
          <button onClick={() => onChange(value.slice(0, -1))}
            className="rounded-2xl py-4 text-lg font-bold active:scale-95"
            style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}30`, color: BRAND.red }}>
            ⌫
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: BRAND.gold }}>{"\u2190"} Volver</button>

        <div className="rounded-3xl p-6 text-center" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}` }}>

          <div className="flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(154,123,15,0.08))", border: `1px solid ${BRAND.borderStrong}` }}>
              <GoldIcon name="shield" size={36} />
            </div>
          </div>

          <h2 className="text-lg font-bold mb-1" style={{ color: BRAND.white }}>{getTitulo()}</h2>

          {/* Eliminar PIN */}
          {modo === "eliminar" && paso === 1 && (
            <>
              <p className="text-sm mb-5" style={{ color: BRAND.textLight }}>
                Si eliminás tu PIN, vas a tener que ingresar con email y contraseña cada vez que abras la app.
              </p>
              <button onClick={eliminar}
                className="w-full rounded-xl py-3 text-sm font-bold mb-2"
                style={{ background: BRAND.red, color: BRAND.white }}>
                {"\u{1F5D1}\u{FE0F}"} Eliminar PIN
              </button>
              <button onClick={onBack}
                className="w-full rounded-xl py-2.5 text-sm"
                style={{ border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
                Cancelar
              </button>
            </>
          )}

          {/* Crear/cambiar PIN — paso 1 */}
          {(modo === "crear" || modo === "cambiar") && paso === 1 && (
            <>
              <p className="text-sm mb-4" style={{ color: BRAND.gold }}>Paso 1 de 2 — Elegí tu PIN</p>
              <p className="text-sm mb-5" style={{ color: BRAND.textLight }}>4 números para entrar más rápido. Solo se guarda en este celular.</p>

              <PinKeypad value={pin} onChange={(v) => handleChange(setPin, v)} autoFocus />
            </>
          )}

          {/* Crear/cambiar PIN — paso 2 (confirmar) */}
          {(modo === "crear" || modo === "cambiar") && paso === 2 && (
            <>
              <p className="text-sm mb-4" style={{ color: BRAND.gold }}>Paso 2 de 2 — Confirmá el PIN</p>
              <p className="text-sm mb-5" style={{ color: BRAND.textLight }}>Repetí los mismos 4 números para confirmar.</p>

              <PinKeypad value={pinConfirm} onChange={(v) => handleChange(setPinConfirm, v)} autoFocus />

              {pinConfirm.length === 4 && (
                <button onClick={confirmar}
                  className="w-full mt-6 rounded-xl py-3 text-sm font-bold"
                  style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                  Confirmar PIN
                </button>
              )}

              <button onClick={() => { setPaso(1); setPin(""); setPinConfirm(""); }} className="w-full mt-3 py-2 text-sm" style={{ color: BRAND.textLight }}>
                ← Empezar de nuevo
              </button>
            </>
          )}

          {/* Hecho */}
          {paso === 3 && (
            <>
              <div className="text-5xl mb-3">{"\u2705"}</div>
              <p className="text-base font-bold" style={{ color: BRAND.gold }}>
                {modo === "eliminar" ? "PIN eliminado" : "PIN configurado"}
              </p>
              <p className="text-sm mt-2 mb-5" style={{ color: BRAND.textLight }}>
                {modo === "eliminar"
                  ? "Próxima vez que entres vas a usar email y contraseña."
                  : "Próxima vez que entres podés usar este PIN."}
              </p>
              {/* Ofrecer biometría si el PIN fue creado */}
              {modo !== "eliminar" && (
                <BiometriaSetupInline nombreUsuario="" onDone={onComplete} />
              )}
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg p-2.5" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40` }}>
              <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// AUTENTICACIÓN CON PIN (v19.8)
// Se muestra al abrir la app si hay PIN configurado.
// 3 intentos fallidos → vuelve a login email.
// ═══════════════════════════════════════════════
function PinAuthScreen({ onSuccess, onFallback, onLogout }) {
  const [pin,        setPin]        = useState("");
  const [error,      setError]      = useState("");
  const [intentos,   setIntentos]   = useState(0);
  const [bioDisp,    setBioDisp]    = useState(false);  // ¿biometría disponible?
  const [bioLoading, setBioLoading] = useState(false);
  const [modo,       setModo]       = useState("bio");  // "bio" | "pin"
  const MAX_INTENTOS = 3;

  // ── Detectar si el dispositivo soporta biometría ──────────
  useEffect(() => {
    async function detectar() {
      try {
        const credId = localStorage.getItem("traza360_webauthn_id");
        if (!credId) { setModo("pin"); return; }
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBioDisp(ok);
        setModo(ok ? "bio" : "pin");
        if (ok) autenticarBio(); // intento automático al abrir
      } catch(e) { setModo("pin"); }
    }
    detectar();
  }, []);

  // ── Autenticación biométrica ──────────────────────────────
  async function autenticarBio() {
    setBioLoading(true);
    setError("");
    try {
      const credIdB64 = localStorage.getItem("traza360_webauthn_id");
      if (!credIdB64) { setModo("pin"); setBioLoading(false); return; }

      const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          allowCredentials: [{ type: "public-key", id: credId, transports: ["internal"] }],
          userVerification: "required",
        }
      });

      if (assertion) {
        setBioLoading(false);
        onSuccess();
      }
    } catch(e) {
      setBioLoading(false);
      if (e.name === "NotAllowedError") {
        setError("Biometría cancelada. Usá el PIN.");
        setModo("pin");
      } else {
        setError("Error de biometría. Usá el PIN.");
        setModo("pin");
      }
    }
  }

  // ── Autenticación por PIN ─────────────────────────────────
  function intentarAcceso(value) {
    setPin(value);
    if (value.length === 4) {
      const pinGuardado = localStorage.getItem("traza360_quick_pin");
      if (value === pinGuardado) {
        onSuccess();
      } else {
        const nuevoIntentos = intentos + 1;
        setIntentos(nuevoIntentos);
        if (nuevoIntentos >= MAX_INTENTOS) {
          setError("Demasiados intentos. Ingresá con email y contraseña.");
          setTimeout(() => onFallback(), 2000);
        } else {
          setError(`PIN incorrecto. Te quedan ${MAX_INTENTOS - nuevoIntentos} intento${MAX_INTENTOS - nuevoIntentos > 1 ? "s" : ""}.`);
          setTimeout(() => setPin(""), 600);
        }
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <PinEyeLogo size={70} showText={false} />
          <p className="text-[11px] uppercase tracking-[3px] mt-3 font-bold" style={{ color: BRAND.gold }}>{TAGLINE}</p>
        </div>

        <div className="rounded-3xl p-6" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}` }}>

          {/* ── MODO BIOMÉTRICO ── */}
          {modo === "bio" && (
            <div className="text-center">
              <p className="text-base font-bold mb-1" style={{ color: BRAND.white }}>
                Verificá tu identidad
              </p>
              <p className="text-sm mb-8" style={{ color: BRAND.textLight }}>
                Usá tu huella o Face ID para entrar
              </p>

              {/* Ícono biométrico animado */}
              <button onClick={autenticarBio} disabled={bioLoading}
                className="mx-auto flex items-center justify-center rounded-3xl mb-8 active:scale-95 disabled:opacity-60"
                style={{ width: 96, height: 96, background: bioLoading ? "rgba(212,175,55,0.15)" : "rgba(212,175,55,0.1)", border: `2px solid ${bioLoading ? BRAND.gold : BRAND.borderStrong}`, boxShadow: bioLoading ? `0 0 30px rgba(212,175,55,0.3)` : "none", transition: "all 0.3s" }}>
                {bioLoading
                  ? <div className="h-8 w-8 rounded-full border-2 border-dashed animate-spin" style={{ borderColor: BRAND.gold }} />
                  : <span style={{ fontSize: 44 }}>
                      {/iPhone|iPad|Mac/.test(navigator.userAgent) ? "🔒" : "👆"}
                    </span>
                }
              </button>

              <p className="text-sm mb-6" style={{ color: BRAND.textLight }}>
                {bioLoading ? "Verificando..." : "Tocá para activar"}
              </p>

              {error && (
                <div className="rounded-lg p-2.5 mb-4" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40` }}>
                  <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
                </div>
              )}

              <button onClick={() => { setModo("pin"); setError(""); }}
                className="text-sm underline" style={{ color: BRAND.textMute }}>
                Usar PIN en su lugar
              </button>
            </div>
          )}

          {/* ── MODO PIN ── */}
          {modo === "pin" && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold" style={{ color: BRAND.white }}>Ingresá tu PIN</h2>
                <p className="text-sm mt-1" style={{ color: BRAND.textLight }}>4 números para entrar rápido</p>
              </div>

              {/* Puntos */}
              <div className="flex justify-center gap-3 mb-6">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-4 w-4 rounded-full transition-all"
                    style={{ background: i < pin.length ? BRAND.gold : "transparent", border: `2px solid ${i < pin.length ? BRAND.gold : BRAND.border}` }} />
                ))}
              </div>

              {/* Teclado */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => pin.length < 4 && intentarAcceso(pin + n)}
                    className="rounded-2xl py-4 text-2xl font-bold active:scale-95"
                    style={{ background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                    {n}
                  </button>
                ))}
                <div />
                <button onClick={() => pin.length < 4 && intentarAcceso(pin + "0")}
                  className="rounded-2xl py-4 text-2xl font-bold active:scale-95"
                  style={{ background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                  0
                </button>
                <button onClick={() => setPin(pin.slice(0, -1))}
                  className="rounded-2xl py-4 text-lg font-bold active:scale-95"
                  style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}30`, color: BRAND.red }}>
                  ⌫
                </button>
              </div>

              {error && (
                <div className="rounded-lg p-2.5 mb-3 text-center" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40` }}>
                  <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
                </div>
              )}

              {/* Opción biométrica si está disponible */}
              {bioDisp && (
                <button onClick={() => { setModo("bio"); setError(""); autenticarBio(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold mb-3"
                  style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                  <span>{/iPhone|iPad|Mac/.test(navigator.userAgent) ? "🔒" : "👆"}</span>
                  Usar huella / Face ID
                </button>
              )}
            </>
          )}

          {/* Fallback login */}
          <button onClick={onFallback} className="w-full text-center text-sm mt-2" style={{ color: BRAND.textMute }}>
            Ingresar con email y contraseña
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Registrar biometría (se llama desde PinSetupScreen) ──────
async function registrarBiometria(nombreUsuario) {
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return { ok: false, error: "Este dispositivo no soporta biometría." };

    const userId = crypto.getRandomValues(new Uint8Array(16));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Traza 360", id: window.location.hostname },
        user: {
          id: userId,
          name: nombreUsuario || "usuario",
          displayName: nombreUsuario || "Usuario Traza 360",
        },
        pubKeyCredParams: [
          { alg: -7,   type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      }
    });

    if (!credential) return { ok: false, error: "No se pudo registrar la biometría." };

    // Guardar el ID de la credencial en localStorage
    const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem("traza360_webauthn_id", credId);
    return { ok: true };
  } catch(e) {
    if (e.name === "NotAllowedError") return { ok: false, error: "Cancelaste el registro." };
    if (e.name === "InvalidStateError") return { ok: false, error: "Ya hay una biometría registrada en este dispositivo." };
    return { ok: false, error: "Error: " + e.message };
  }
}

// ═══════════════════════════════════════════════
// RUTA SEGURA EN VIVO (v19.9)
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GEOCERCAS EMOCIONALES (v19.10)
// Inspirado en Life360/Familo pero con contexto horario
// ═══════════════════════════════════════════════════════════════

// Calcula distancia en metros entre dos coordenadas (Haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Determina si es horario nocturno (23:00 - 07:00)
function esHorarioNocturno() {
  const h = new Date().getHours();
  return h >= 23 || h < 7;
}

// Genera mensaje emocional según contexto
function generarMensajeGeocerca({ zona, evento, nombre }) {
  const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const nocturno = esHorarioNocturno();

  if (evento === "salida") {
    if (nocturno) return `🔴 ALERTA — ${nombre} salió de "${zona}" a las ${hora} (horario nocturno). Verificá que esté bien.`;
    return `🟡 ${nombre} salió de "${zona}" a las ${hora}.`;
  }
  if (evento === "entrada") {
    return `🟢 ${nombre} llegó a "${zona}" a las ${hora}.`;
  }
  if (evento === "fuera_mucho") {
    return `⚠️ ${nombre} lleva más de 30 min fuera de "${zona}". Última ubicación conocida.`;
  }
  return `📍 Actualización de ${nombre} en zona "${zona}" a las ${hora}.`;
}

const ZONAS_PRESET = [
  { key: "casa",     emoji: "🏠", label: "Casa",          radio: 200 },
  { key: "colegio",  emoji: "🏫", label: "Colegio",       radio: 300 },
  { key: "club",     emoji: "🏟️", label: "Club / Deporte", radio: 500 },
  { key: "trabajo",  emoji: "💼", label: "Trabajo",       radio: 300 },
  { key: "abuelos",  emoji: "👴", label: "Casa abuelos",  radio: 200 },
  { key: "custom",   emoji: "📍", label: "Personalizada", radio: 250 },
];

// ── Pantalla principal de Geocercas ─────────────────────────
function GeocercasScreen({ onBack, contactos, authUser }) {
  const [geocercas,    setGeocercas]    = useState([]);
  const [showCrear,    setShowCrear]    = useState(false);
  const [monitorando,  setMonitorando]  = useState(null); // geocerca activa en monitor
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { cargarGeocercas(); }, []);

  async function cargarGeocercas() {
    setLoading(true);
    try {
      const { data } = await supabase.from("geocercas")
        .select("*").eq("user_id", authUser?.id).order("created_at", { ascending: false });
      setGeocercas(data || []);
    } catch(e) { console.warn(e); }
    setLoading(false);
  }

  async function eliminarGeocerca(id) {
    if (!window.confirm("¿Eliminar esta geocerca?")) return;
    await supabase.from("geocercas").delete().eq("id", id);
    setGeocercas(prev => prev.filter(g => g.id !== id));
  }

  if (showCrear) return (
    <CrearGeocercaScreen
      onBack={() => setShowCrear(false)}
      onCreada={() => { setShowCrear(false); cargarGeocercas(); }}
      authUser={authUser}
      contactos={contactos}
    />
  );

  if (monitorando) return (
    <GeocercaMonitorScreen
      geocerca={monitorando}
      onBack={() => setMonitorando(null)}
      contactos={contactos}
      authUser={authUser}
    />
  );

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-2xl" style={{ color: BRAND.gold }}>←</button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: BRAND.white }}>Geocercas Emocionales</h1>
            <p className="text-sm mt-0.5" style={{ color: BRAND.textLight }}>Zonas de seguridad con alertas con contexto</p>
          </div>
        </div>

        {/* Explicación */}
        <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${BRAND.borderStrong}` }}>
          <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>
            Definís zonas seguras (casa, colegio, club). Cuando tu hijo sale o llega, sus contactos reciben un WhatsApp con <strong style={{ color: BRAND.white }}>hora y contexto</strong>. De noche, la alerta es roja automáticamente.
          </p>
        </div>

        {/* Lista de geocercas */}
        {loading ? (
          <div className="text-center py-10" style={{ color: BRAND.textLight }}>Cargando zonas...</div>
        ) : geocercas.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-sm font-semibold mb-1" style={{ color: BRAND.white }}>No tenés zonas definidas</p>
            <p className="text-sm" style={{ color: BRAND.textLight }}>Creá tu primera zona segura abajo.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {geocercas.map(g => {
              const preset = ZONAS_PRESET.find(z => z.key === g.tipo) || ZONAS_PRESET[5];
              return (
                <div key={g.id} className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg,#111,#000)", border: `1px solid ${BRAND.border}` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{preset.emoji}</div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: BRAND.white }}>{g.nombre}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: BRAND.textLight }}>
                          Radio: {g.radio}m · {g.lat ? `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}` : "Sin ubicación"}
                        </p>
                        {g.activa && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] font-bold" style={{ color: "#22c55e" }}>Monitoreando</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setMonitorando(g)}
                        className="rounded-xl px-3 py-2 text-sm font-bold"
                        style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                        Activar
                      </button>
                      <button onClick={() => eliminarGeocerca(g.id)}
                        className="rounded-xl px-2.5 py-2 text-sm"
                        style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${BRAND.red}30`, color: "#fca5a5" }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Último evento */}
                  {g.ultimo_evento && (
                    <div className="mt-3 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.border}` }}>
                      <p className="text-[11px]" style={{ color: BRAND.textLight }}>
                        Último evento: <span style={{ color: BRAND.white }}>{g.ultimo_evento}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setShowCrear(true)}
          className="w-full rounded-2xl py-4 font-bold text-base"
          style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(212,175,55,0.25)" }}>
          + Crear nueva zona segura
        </button>
      </div>
    </div>
  );
}

// ── Crear nueva Geocerca ─────────────────────────────────────
function CrearGeocercaScreen({ onBack, onCreada, authUser, contactos }) {
  const [tipo,        setTipo]        = useState("casa");
  const [nombre,      setNombre]      = useState("Casa");
  const [radio,       setRadio]       = useState(200);
  const [lat,         setLat]         = useState(null);
  const [lng,         setLng]         = useState(null);
  const [usandoGPS,   setUsandoGPS]   = useState(false);
  const [selContacts, setSelContacts] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  function elegirPreset(preset) {
    setTipo(preset.key);
    setRadio(preset.radio);
    if (preset.key !== "custom") setNombre(preset.label);
  }

  function obtenerUbicacionActual() {
    setUsandoGPS(true);
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setUsandoGPS(false);
    }, () => {
      alert("No se pudo obtener la ubicación. Asegurate de tener GPS activado.");
      setUsandoGPS(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async function guardar() {
    setError("");
    if (!nombre.trim())         { setError("Escribí un nombre para la zona."); return; }
    if (!lat || !lng)           { setError("Necesitás capturar la ubicación primero."); return; }
    if (selContacts.length < 1) { setError("Seleccioná al menos 1 contacto."); return; }

    setLoading(true);
    try {
      const { error: dbErr } = await supabase.from("geocercas").insert({
        user_id:      authUser?.id,
        nombre:       nombre.trim(),
        tipo,
        lat,
        lng,
        radio,
        activa:       false,
        contactos_ids: JSON.stringify(selContacts),
        created_at:   new Date().toISOString(),
      });
      if (dbErr) throw new Error(dbErr.message);
      onCreada();
    } catch(e) {
      setError("Error al guardar: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-2xl" style={{ color: BRAND.gold }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: BRAND.white }}>Nueva zona segura</h1>
        </div>

        {/* Tipo de zona */}
        <p className="text-[11px] uppercase tracking-widest font-bold mb-3" style={{ color: BRAND.gold }}>Tipo de zona</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ZONAS_PRESET.map(p => (
            <button key={p.key} onClick={() => elegirPreset(p)}
              className="rounded-xl py-3 text-center"
              style={{ background: tipo === p.key ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${tipo === p.key ? BRAND.borderStrong : BRAND.border}` }}>
              <div className="text-2xl">{p.emoji}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: tipo === p.key ? BRAND.gold : BRAND.textMute }}>{p.label}</div>
            </button>
          ))}
        </div>

        {/* Nombre */}
        <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>Nombre de la zona</p>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Casa de mamá"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-5"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.white }} />

        {/* Radio */}
        <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>
          Radio de la zona: <span style={{ color: BRAND.white }}>{radio} metros</span>
        </p>
        <input type="range" min="50" max="1000" step="50" value={radio} onChange={e => setRadio(Number(e.target.value))}
          className="w-full mb-1 accent-yellow-500" />
        <div className="flex justify-between text-[10px] mb-5" style={{ color: BRAND.textMute }}>
          <span>50m (cuarto)</span><span>300m (manzana)</span><span>1km</span>
        </div>

        {/* Ubicación */}
        <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>Ubicación del centro</p>
        {lat && lng ? (
          <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "#22c55e" }}>Ubicación capturada</p>
              <p className="text-[11px]" style={{ color: BRAND.textLight }}>{lat.toFixed(5)}, {lng.toFixed(5)}</p>
            </div>
            <button onClick={() => { setLat(null); setLng(null); }} className="ml-auto text-sm" style={{ color: BRAND.textMute }}>Cambiar</button>
          </div>
        ) : (
          <button onClick={obtenerUbicacionActual} disabled={usandoGPS}
            className="w-full rounded-xl py-3 text-sm font-bold mb-3 disabled:opacity-50"
            style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
            {usandoGPS ? "📡 Obteniendo GPS..." : "📍 Usar mi ubicación actual"}
          </button>
        )}
        <p className="text-[11px] mb-5" style={{ color: BRAND.textMute }}>
          💡 Andá al lugar (casa, colegio) y tocá el botón para capturar la ubicación exacta.
        </p>

        {/* Contactos */}
        <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>¿A quién avisar?</p>
        <div className="space-y-2 mb-5">
          {contactos.length === 0 ? (
            <p className="text-sm" style={{ color: "#fca5a5" }}>No tenés contactos. Agregá uno desde "Mis Contactos".</p>
          ) : contactos.map(c => (
            <button key={c.id} onClick={() => setSelContacts(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
              className="w-full flex items-center gap-3 rounded-xl p-3"
              style={{ background: selContacts.includes(c.id) ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${selContacts.includes(c.id) ? BRAND.borderStrong : BRAND.border}` }}>
              <div className="flex h-5 w-5 items-center justify-center rounded shrink-0"
                style={{ background: selContacts.includes(c.id) ? BRAND.gold : "transparent", border: `2px solid ${selContacts.includes(c.id) ? BRAND.gold : "rgba(255,255,255,0.3)"}` }}>
                {selContacts.includes(c.id) && <span className="text-black text-[10px] font-bold">✓</span>}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: BRAND.white }}>{c.nombre}</p>
                <p className="text-[11px]" style={{ color: BRAND.textLight }}>{c.relacion || "Contacto"}</p>
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-sm mb-3" style={{ color: "#fca5a5" }}>{error}</p>}

        <button onClick={guardar} disabled={loading}
          className="w-full rounded-2xl py-4 font-bold text-base disabled:opacity-40"
          style={{ background: BRAND.goldGradient, color: BRAND.black }}>
          {loading ? "Guardando..." : "Guardar zona segura"}
        </button>
      </div>
    </div>
  );
}

// ── Monitor activo de Geocerca ───────────────────────────────
function GeocercaMonitorScreen({ geocerca, onBack, contactos, authUser }) {
  const [dentro,       setDentro]       = useState(null); // null=checking, true, false
  const [distancia,    setDistancia]    = useState(null);
  const [eventos,      setEventos]      = useState([]);
  const [ultimoEstado, setUltimoEstado] = useState(null); // "dentro" | "fuera"
  const [activo,       setActivo]       = useState(true);
  const intervalRef = useRef(null);
  const fueraDesdRef = useRef(null); // timestamp cuando salió

  const nombre = geocerca.nombre;
  const contactosZona = contactos.filter(c => {
    try { return JSON.parse(geocerca.contactos_ids || "[]").includes(c.id); } catch(e) { return false; }
  });

  useEffect(() => {
    if (!activo) return;
    verificarPosicion(); // primera vez
    intervalRef.current = setInterval(verificarPosicion, 15000); // cada 15 seg
    return () => clearInterval(intervalRef.current);
  }, [activo]);

  async function verificarPosicion() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const dist = distanciaMetros(pos.coords.latitude, pos.coords.longitude, geocerca.lat, geocerca.lng);
      setDistancia(Math.round(dist));
      const estaDentro = dist <= geocerca.radio;
      setDentro(estaDentro);

      // Detectar cambio de estado
      if (ultimoEstado === "dentro" && !estaDentro) {
        // SALIDA
        fueraDesdRef.current = Date.now();
        const msg = generarMensajeGeocerca({ zona: nombre, evento: "salida", nombre: geocerca.nombre_protegido || "Tu contacto" });
        agregarEvento({ tipo: "salida", msg, nocturno: esHorarioNocturno() });
        await notificarContactos(msg);
        setUltimoEstado("fuera");
        // Actualizar último evento en DB
        await supabase.from("geocercas").update({ ultimo_evento: msg }).eq("id", geocerca.id);
      }

      if (ultimoEstado === "fuera" && estaDentro) {
        // ENTRADA
        fueraDesdRef.current = null;
        const msg = generarMensajeGeocerca({ zona: nombre, evento: "entrada", nombre: geocerca.nombre_protegido || "Tu contacto" });
        agregarEvento({ tipo: "entrada", msg, nocturno: false });
        await notificarContactos(msg);
        setUltimoEstado("dentro");
        await supabase.from("geocercas").update({ ultimo_evento: msg }).eq("id", geocerca.id);
      }

      // Llevan más de 30 min fuera → alerta extra
      if (ultimoEstado === "fuera" && fueraDesdRef.current && Date.now() - fueraDesdRef.current > 30 * 60 * 1000) {
        const msg = generarMensajeGeocerca({ zona: nombre, evento: "fuera_mucho", nombre: geocerca.nombre_protegido || "Tu contacto" });
        agregarEvento({ tipo: "warning", msg, nocturno: esHorarioNocturno() });
        await notificarContactos(msg);
        fueraDesdRef.current = null; // resetear para no spamear
      }

      if (ultimoEstado === null) setUltimoEstado(estaDentro ? "dentro" : "fuera");
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }

  function agregarEvento({ tipo, msg, nocturno }) {
    const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    setEventos(prev => [{ id: Date.now(), tipo, msg, hora, nocturno }, ...prev.slice(0, 19)]);
  }

  async function notificarContactos(msg) {
    for (const c of contactosZona) {
      if (!c.telefono) continue;
      await sendWhatsAppAPI(c.telefono, msg).catch(console.warn);
    }
  }

  const colorDentro = dentro === null ? BRAND.gold : dentro ? "#22c55e" : BRAND.red;

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => { clearInterval(intervalRef.current); onBack(); }} className="text-2xl" style={{ color: BRAND.gold }}>←</button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: BRAND.white }}>{geocerca.nombre}</h1>
            <p className="text-sm" style={{ color: BRAND.textLight }}>Radio: {geocerca.radio}m · Cada 15 seg</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: activo ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${activo ? "rgba(34,197,94,0.3)" : BRAND.border}` }}>
            <div className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
            <span className="text-[10px] font-bold" style={{ color: activo ? "#22c55e" : BRAND.textMute }}>
              {activo ? "Activo" : "Pausado"}
            </span>
          </div>
        </div>

        {/* Estado principal */}
        <div className="rounded-2xl p-6 mb-4 text-center"
          style={{ background: "linear-gradient(145deg,#0d0d0d,#000)", border: `2px solid ${colorDentro}40` }}>
          <div className="text-5xl mb-3">
            {dentro === null ? "📡" : dentro ? "✅" : "⚠️"}
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: colorDentro }}>
            {dentro === null ? "Detectando..." : dentro ? "Dentro de la zona" : "Fuera de la zona"}
          </p>
          {distancia !== null && (
            <p className="text-sm" style={{ color: BRAND.textLight }}>
              {dentro
                ? `A ${distancia}m del centro · Radio: ${geocerca.radio}m`
                : `A ${distancia}m del centro · ${distancia - geocerca.radio}m fuera del límite`}
            </p>
          )}
          {esHorarioNocturno() && !dentro && (
            <div className="mt-3 rounded-xl p-2.5" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40` }}>
              <p className="text-sm font-bold" style={{ color: "#fca5a5" }}>🌙 Horario nocturno — alertas en rojo</p>
            </div>
          )}
        </div>

        {/* Aviso pantalla */}
        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
          <p className="text-sm" style={{ color: BRAND.textLight }}>
            💡 <strong style={{ color: BRAND.gold }}>Mantené la pantalla encendida</strong> para que el monitoreo funcione en tiempo real. Verificación cada 15 segundos.
          </p>
        </div>

        {/* Historial de eventos */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${BRAND.border}` }}>
          <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${BRAND.border}` }}>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND.gold }}>Historial de eventos</p>
          </div>
          {eventos.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm" style={{ color: BRAND.textLight }}>Sin eventos todavía. El monitoreo está activo.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BRAND.border }}>
              {eventos.map(ev => (
                <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-base shrink-0 mt-0.5">
                    {ev.tipo === "entrada" ? "🟢" : ev.tipo === "salida" && ev.nocturno ? "🔴" : ev.tipo === "salida" ? "🟡" : "⚠️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed" style={{ color: BRAND.textLight }}>{ev.msg}</p>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: BRAND.textMute }}>{ev.hora}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón detener */}
        <button onClick={() => { clearInterval(intervalRef.current); setActivo(false); onBack(); }}
          className="w-full rounded-2xl py-4 font-bold"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
          Detener monitoreo
        </button>
      </div>
    </div>
  );
}

function RutaSeguraModal({ onClose, contactos: _contactosGlobal, authUser, userProfile }) {
  const [paso, setPaso]       = useState(1);
  const [duracion, setDuracion] = useState(60);
  const [custom, setCustom]   = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken]     = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [error, setError]     = useState("");
  const [emailExtra, setEmailExtra] = useState("");
  const [smsExtra, setSmsExtra]   = useState("");
  // Contactos propios del módulo — persisten entre sesiones
  const [contactosMod, setContactosMod] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("traza360_ruta_contactos") || "[]"); } catch(e) { return []; }
  });
  const gpsIntervalRef = useRef(null);
  const timerRef       = useRef(null);

  const duraciones = [
    { label: "30 min", min: 30 }, { label: "1 hora", min: 60 },
    { label: "2 horas", min: 120 }, { label: "3 horas", min: 180 },
  ];
  const nombreUsuario = userProfile?.nombre || authUser?.email?.split("@")[0] || "Usuario";
  const liveUrl = token ? `${window.location.origin}/live/${token}` : "";

  useEffect(() => () => {
    clearInterval(gpsIntervalRef.current);
    clearInterval(timerRef.current);
  }, []);

  async function agregarDesdeAgenda() {
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        const contacts = await navigator.contacts.select(["name", "tel"], { multiple: true });
        const nuevos = [...contactosMod];
        for (const c of contacts) {
          if (!c.tel?.[0]) continue;
          nuevos.push({ id: Date.now().toString() + Math.random(), nombre: c.name?.[0] || "Sin nombre", telefono: c.tel[0].replace(/\D/g, "") });
        }
        setContactosMod(nuevos);
        sessionStorage.setItem("traza360_ruta_contactos", JSON.stringify(nuevos));
      } else {
        const nombre = prompt("Nombre:");
        if (!nombre) return;
        const tel = prompt("Número de WhatsApp (con código país, ej: 5493511234567):");
        if (!tel) return;
        const nuevos = [...contactosMod, { id: Date.now().toString(), nombre, telefono: tel.replace(/\D/g, "") }];
        setContactosMod(nuevos);
        sessionStorage.setItem("traza360_ruta_contactos", JSON.stringify(nuevos));
      }
    } catch(e) {
      const nombre = prompt("No se pudo acceder a la agenda.\nNombre del contacto:");
      if (!nombre) return;
      const tel = prompt("Número de WhatsApp:");
      if (!tel) return;
      const nuevos = [...contactosMod, { id: Date.now().toString(), nombre, telefono: tel.replace(/\D/g, "") }];
      setContactosMod(nuevos);
      sessionStorage.setItem("traza360_ruta_contactos", JSON.stringify(nuevos));
    }
  }

  function eliminarContacto(id) {
    const nuevos = contactosMod.filter(c => c.id !== id);
    setContactosMod(nuevos);
    sessionStorage.setItem("traza360_ruta_contactos", JSON.stringify(nuevos));
  }

  async function activar() {
    setError("");
    const tieneDestinatario = contactosMod.length > 0 || emailExtra.trim() || smsExtra.trim();
    if (!tieneDestinatario) { setError("Agregá al menos 1 contacto, email o número SMS."); return; }
    setLoading(true);
    try {
      const nuevoToken = Math.random().toString(36).substring(2, 9);
      const durMin = duracion === "custom" ? parseInt(custom) || 60 : duracion;
      const expira = new Date(Date.now() + durMin * 60 * 1000);
      const hora = expira.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      const urlPublica = `${window.location.origin}/live/${nuevoToken}`;
      const msgBase = mensaje || `${nombreUsuario} compartió su movimiento en vivo. Si no cancela antes de las ${hora}, algo pasó.`;

      try {
          await supabase.from("live_sessions").insert({
            token: nuevoToken, user_id: authUser?.id, nombre_usuario: nombreUsuario,
            modulo: "turno_seguro", mensaje: msgBase,
            started_at: new Date().toISOString(), expires_at: expira.toISOString(),
            cancelado_at: null,
            contactos_ids: JSON.stringify(Array.isArray(contactosMod) ? contactosMod.map(function(c) { return c.id; }) : [])
          });
        } catch(dbErr) { console.warn("DB:", dbErr); }

      setToken(nuevoToken); setExpiresAt(expira);

      function guardarGPS() {
        navigator.geolocation.getCurrentPosition(async pos => {
          let battery = null;
          try { const b = await navigator.getBattery?.(); if (b) battery = Math.round(b.level * 100); } catch(e) {}
          supabase.from("live_locations").upsert({
            session_token: nuevoToken, lat: pos.coords.latitude, lng: pos.coords.longitude,
            battery, speed: pos.coords.speed ?? null, updated_at: new Date().toISOString(),
          }, { onConflict: "session_token" }).catch(console.warn);
        }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
      }
      guardarGPS();
      gpsIntervalRef.current = setInterval(guardarGPS, 15000);
      timerRef.current = setInterval(() => {
        const ms = expira - new Date();
        if (ms <= 0) { clearInterval(timerRef.current); clearInterval(gpsIntervalRef.current); }
        setCountdown(Math.max(0, ms));
      }, 1000);

      const msgWA = `🛡️ *Traza 360 — Movimiento en Vivo*\n\n${nombreUsuario} compartió su ubicación en tiempo real.\n\n📍 *Ver mapa en vivo:*\n${urlPublica}\n\n⏱️ Si no cancela antes de las ${hora}, necesita ayuda.`;
      for (const c of contactosMod) {
        if (c.telefono) await sendWhatsAppAPI(c.telefono, msgWA).catch(console.warn);
      }
      if (emailExtra.trim()) {
        const asunto = encodeURIComponent(`Traza 360 — ${nombreUsuario} compartió su ubicación`);
        const cuerpo = encodeURIComponent(`${nombreUsuario} activó seguimiento en vivo.\n\nVer mapa: ${urlPublica}\n\n${msgBase}`);
        window.open(`mailto:${emailExtra.trim()}?subject=${asunto}&body=${cuerpo}`, "_blank");
      }
      if (smsExtra.trim()) {
        const msgSMS = encodeURIComponent(`Traza 360: ${nombreUsuario} compartió su ubicación. Ver mapa: ${urlPublica}`);
        window.open(`sms:${smsExtra.trim()}?body=${msgSMS}`, "_blank");
      }
      setPaso(2);
    } catch(e) { setError("Error al activar: " + e.message); }
    setLoading(false);
  }

  async function cancelar() {
    clearInterval(gpsIntervalRef.current); clearInterval(timerRef.current);
    if (token) {
      await supabase.from("live_sessions").update({ cancelado_at: new Date().toISOString() }).eq("token", token);
      for (const c of contactosMod) {
        if (c.telefono) await sendWhatsAppAPI(c.telefono, `✅ *Traza 360* — ${nombreUsuario} llegó bien. Seguimiento cancelado.`).catch(console.warn);
      }
    }
    setPaso(3);
  }

  function copiarLink() {
    navigator.clipboard?.writeText(liveUrl).then(() => alert("✅ Link copiado:\n" + liveUrl)).catch(() => prompt("Copiá este link:", liveUrl));
  }

  function fmt(ms) {
    if (!ms || ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-md rounded-t-3xl overflow-hidden" style={{ background: "#000", border: `2px solid ${BRAND.borderStrong}`, maxHeight: "92vh", overflowY: "auto" }}>
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full" style={{ background: BRAND.borderStrong }} /></div>

        {/* PASO 1 — Configuración */}
        {paso === 1 && (
          <div className="px-5 pb-6 pt-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: BRAND.white }}>Compartir movimiento en vivo</h2>
                <p className="text-sm mt-0.5" style={{ color: BRAND.textLight }}>Si no cancelás, alerta automática.</p>
              </div>
              <button onClick={onClose} className="text-2xl" style={{ color: BRAND.textMute }}>✕</button>
            </div>

            {/* Duración */}
            <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>¿Cuánto tiempo?</p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {duraciones.map(d => (
                <button key={d.min} onClick={() => { setDuracion(d.min); setCustom(""); }}
                  className="rounded-xl py-2.5 text-sm font-bold"
                  style={{ background: duracion === d.min ? BRAND.goldGradient : "rgba(255,255,255,0.04)", color: duracion === d.min ? BRAND.black : BRAND.textMute, border: `1px solid ${duracion === d.min ? BRAND.gold : BRAND.border}` }}>
                  {d.label}
                </button>
              ))}
            </div>
            <input type="number" min="5" max="720" value={custom}
              onChange={e => { setCustom(e.target.value); setDuracion("custom"); }}
              placeholder="Personalizado (minutos)"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-5"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${duracion === "custom" ? BRAND.gold : BRAND.border}`, color: BRAND.white }} />

            {/* Contactos del módulo — desde agenda */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: BRAND.gold }}>¿Quién te sigue?</p>
              <button onClick={agregarDesdeAgenda}
                className="rounded-lg px-3 py-1.5 text-sm font-bold"
                style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                + Agregar contacto
              </button>
            </div>

            {contactosMod.length === 0 ? (
              <div className="rounded-xl p-4 mb-4 text-center" style={{ background: "rgba(212,175,55,0.05)", border: `1px dashed ${BRAND.border}` }}>
                <p className="text-sm mb-3" style={{ color: BRAND.textLight }}>Elegí a quién le vas a compartir tu movimiento.</p>
                <button onClick={agregarDesdeAgenda}
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                  📱 Elegir de mis contactos
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {contactosMod.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${BRAND.borderStrong}` }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                      style={{ background: "rgba(212,175,55,0.2)" }}>
                      <span className="text-sm font-bold" style={{ color: BRAND.gold }}>{c.nombre[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: BRAND.white }}>{c.nombre}</p>
                      <p className="text-[11px]" style={{ color: BRAND.textLight }}>WhatsApp: {c.telefono}</p>
                    </div>
                    <button onClick={() => eliminarContacto(c.id)} className="text-sm px-2 py-1 rounded-lg" style={{ color: "#fca5a5", background: "rgba(220,38,38,0.1)" }}>✕</button>
                  </div>
                ))}
                <button onClick={agregarDesdeAgenda}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold"
                  style={{ background: "transparent", border: `1px dashed ${BRAND.border}`, color: BRAND.gold }}>
                  + Agregar otro
                </button>
              </div>
            )}

            {/* Email */}
            <p className="text-[11px] uppercase tracking-widest font-bold mb-2 mt-4" style={{ color: BRAND.gold }}>También por email (opcional)</p>
            <input type="email" value={emailExtra} onChange={e => setEmailExtra(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${emailExtra ? BRAND.gold : BRAND.border}`, color: BRAND.white }} />

            {/* SMS */}
            <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>También por SMS (opcional)</p>
            <input type="tel" value={smsExtra} onChange={e => setSmsExtra(e.target.value)}
              placeholder="+54 9 351 000 0000"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${smsExtra ? BRAND.gold : BRAND.border}`, color: BRAND.white }} />

            {/* Mensaje */}
            <p className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: BRAND.gold }}>Mensaje (opcional)</p>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
              placeholder='Ej: "Salí con alguien. Si no cancelo antes de las [hora], algo pasó."'
              rows={2} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.white }} />

            {/* Preview */}
            <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-[11px] uppercase tracking-wider font-bold mb-2" style={{ color: BRAND.gold }}>📱 Van a recibir por WhatsApp:</p>
              <p className="text-sm leading-relaxed font-mono" style={{ color: BRAND.textLight }}>
                🛡️ Traza 360 — Movimiento en Vivo<br/><br/>
                {nombreUsuario} compartió su ubicación.<br/>
                📍 <span style={{ color: BRAND.gold }}>traza360.app/live/abc1234</span><br/>
                ⏱️ Si no cancela antes de las [hora], necesita ayuda.
              </p>
            </div>

            {error && <p className="text-sm mb-3" style={{ color: "#fca5a5" }}>{error}</p>}

            <button onClick={activar} disabled={loading}
              className="w-full rounded-2xl py-4 font-bold text-base disabled:opacity-40"
              style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(212,175,55,0.3)" }}>
              {loading ? "Activando..." : "🚀 Activar seguimiento en vivo"}
            </button>
          </div>
        )}

        {/* PASO 2 — Activo */}
        {paso === 2 && (
          <div className="px-5 pb-6 pt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: BRAND.red }}>Seguimiento activo</span>
            </div>
            <div className="rounded-2xl p-6 mb-4" style={{ background: "linear-gradient(145deg,#0d0d0d,#000)", border: `2px solid ${BRAND.borderStrong}` }}>
              <p className="text-[11px] uppercase tracking-[4px] mb-2" style={{ color: BRAND.gold }}>Tiempo restante</p>
              <p className="text-5xl font-bold tabular-nums mb-1" style={{ color: BRAND.white }}>{fmt(countdown)}</p>
              <p className="text-sm" style={{ color: BRAND.textLight }}>Vence a las {expiresAt?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-sm font-bold mb-1" style={{ color: BRAND.gold }}>Link de seguimiento activo</p>
              <p className="text-[11px] break-all" style={{ color: BRAND.textLight }}>{liveUrl}</p>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={copiarLink} className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${BRAND.borderStrong}`, color: BRAND.gold }}>
                📋 Copiar link
              </button>
              <button onClick={() => { const msg = encodeURIComponent(`📍 Seguí mi ubicación en vivo: ${liveUrl}`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366" }}>
                📲 Compartir
              </button>
            </div>
            <button onClick={cancelar}
              className="w-full rounded-2xl py-4 font-bold text-base"
              style={{ background: "rgba(220,38,38,0.1)", border: `2px solid ${BRAND.red}`, color: "#fca5a5" }}>
              ✅ Llegué bien — Cancelar seguimiento
            </button>
          </div>
        )}

        {/* PASO 3 — Cancelado */}
        {paso === 3 && (
          <div className="px-5 pb-6 pt-4 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: BRAND.white }}>Seguimiento cancelado</h3>
            <p className="text-sm mb-6" style={{ color: BRAND.textLight }}>Tus contactos recibieron la confirmación de que llegaste bien.</p>
            <button onClick={onClose} className="w-full rounded-2xl py-4 font-bold"
              style={{ background: BRAND.goldGradient, color: BRAND.black }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LANDING SCREEN (v19 — rebrand dorado) ───
function LandingScreen({ onScreen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);

  const reviews = [
    { nombre: "María G.", plataforma: "iOS", texto: "Gracias a Traza 360 mi hija llega segura a casa cada noche. Es lo mejor que instalé en mi vida.", estrellas: 5 },
    { nombre: "Carlos R.", plataforma: "Android", texto: "Activé el botón de pánico y en 2 minutos mi familia ya sabía dónde estaba. Increíble.", estrellas: 5 },
    { nombre: "Laura M.", plataforma: "iOS", texto: "Trabajo de noche y mis padres están tranquilos porque pueden ver mi ubicación en vivo.", estrellas: 5 },
  ];

  const tecnologias = [
    { icon: "📍", titulo: "Rastreo GPS preciso", desc: "Ubicación en tiempo real con actualizaciones cada 15 segundos" },
    { icon: "🔔", titulo: "Alertas instantáneas", desc: "WhatsApp inmediato a tus contactos de confianza con un solo toque" },
    { icon: "🎙️", titulo: "Grabación de evidencias", desc: "Audio y fotos automáticas guardadas en la nube al activar pánico" },
    { icon: "📐", titulo: "Geocercas emocionales", desc: "Zonas seguras con alertas horarias para adolescentes y adultos mayores" },
    { icon: "🕐", titulo: "Timer de seguridad", desc: "Si no cancelás a tiempo, alerta automática a tus contactos" },
    { icon: "🔒", titulo: "Acceso oculto", desc: "La app se disfraza de calculadora para situaciones de riesgo extremo" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#000", color: "#fff" }}>

      {/* NAVBAR */}
      <nav style={{ background: "rgba(0,0,0,0.95)", borderBottom: `1px solid ${BRAND.border}`, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div className="flex items-center justify-between px-5 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <PinEyeLogo size={32} showText={false} />
            <span className="text-sm font-bold tracking-[2px] uppercase" style={{ color: BRAND.gold }}>Traza 360</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: "Funciones", action: () => setFeatOpen(!featOpen) },
              { label: "Planes", action: () => onScreen("planes") },
              { label: "Sobre nosotros", action: () => onScreen("sobre_nosotros") },
            ].map((item, i) => (
              <button key={i} onClick={item.action} className="text-sm font-medium" style={{ color: BRAND.textLight }}>
                {item.label} {item.label === "Funciones" && <span className="text-[10px]">{featOpen ? "▲" : "▼"}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onScreen("login")} className="hidden md:block text-sm font-semibold" style={{ color: BRAND.textLight }}>Ingresar</button>
            <button onClick={() => onScreen("register")} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: BRAND.goldGradient, color: BRAND.black }}>Empezar gratis</button>
            <button className="md:hidden text-xl" onClick={() => setMenuOpen(!menuOpen)} style={{ color: BRAND.gold }}>{menuOpen ? "✕" : "☰"}</button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t px-5 py-4 flex flex-col gap-3 md:hidden" style={{ borderColor: BRAND.border }}>
            {[{ label: "Funciones", screen: "instrucciones_publico" }, { label: "Planes", screen: "planes" }, { label: "Sobre nosotros", screen: "sobre_nosotros" }, { label: "Ingresar", screen: "login" }].map((item, i) => (
              <button key={i} onClick={() => { setMenuOpen(false); onScreen(item.screen); }} className="text-left text-sm font-semibold py-2" style={{ color: BRAND.textLight, borderBottom: `1px solid ${BRAND.border}` }}>{item.label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* SOCIAL PROOF BANNER — estilo DGR */}
      <div className="text-center py-3 px-5" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.06))", borderBottom: `1px solid ${BRAND.borderStrong}` }}>
        <p className="text-sm font-bold uppercase tracking-[4px]" style={{ color: BRAND.goldLite, fontFamily: FONT_BODY }}>
          🏆 Seguridad personal · LATAM
        </p>
      </div>

      {/* HERO */}
      <section className="px-5 pt-12 pb-8 text-center">
        <div className="mb-5 flex justify-center">
          <div style={{ position: "relative" }}>
            <PinEyeLogo size={90} showText={false} />
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: BRAND.red, color: "#fff" }}>●</div>
          </div>
        </div>

        {/* Título estilo DGR — serif, bold, tracking */}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 900, lineHeight: 1.15, color: BRAND.white, letterSpacing: "-0.5px", maxWidth: 320, margin: "0 auto" }}>
          Si algo pasa,
          <br/>
          <span style={{ background: BRAND.goldGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            alguien ya sabe.
          </span>
        </h1>

        {/* Línea divisoria estilo DGR */}
        <div className="flex items-center gap-3 my-4 max-w-[200px] mx-auto">
          <div className="flex-1 h-px" style={{ background: BRAND.borderStrong }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.gold }} />
          <div className="flex-1 h-px" style={{ background: BRAND.borderStrong }} />
        </div>

        <p className="text-sm leading-relaxed mx-auto max-w-xs" style={{ color: BRAND.textLight, fontFamily: FONT_BODY }}>
          Ubicación, audio y alerta en tiempo real<br/>para quienes más te importan.
        </p>

        {/* Ratings */}
        <div className="mt-6 flex gap-3 justify-center">
          {[
            { store: "App Store", rating: "4.8", stars: "★★★★★" },
            { store: "Google Play", rating: "4.7", stars: "★★★★★" },
          ].map((s, i) => (
            <div key={i} className="flex-1 max-w-[140px] rounded-2xl px-3 py-3" style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${BRAND.border}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: BRAND.textLight }}>{s.store}</p>
              <p className="text-2xl font-black mt-1" style={{ color: BRAND.white, fontFamily: FONT_DISPLAY }}>{s.rating}</p>
              <p style={{ color: BRAND.gold, fontSize: 12, letterSpacing: "2px" }}>{s.stars}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <div className="px-5 pb-8">
        <div className="mx-auto max-w-sm flex flex-col gap-3">
          <button onClick={() => onScreen("register")} className="w-full rounded-2xl py-4 font-black text-lg" style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(212,175,55,0.4)" }}>
            Iniciá sesión gratis →
          </button>
          <button onClick={() => onScreen("login")} className="w-full rounded-2xl py-3 font-bold text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.15)`, color: BRAND.white }}>
            Ya tengo cuenta → Ingresar
          </button>
          {/* Instalación */}
          <div className="flex gap-2 mt-1">
            <button onClick={() => { const a = /android/i.test(navigator.userAgent); alert(a ? "1. Tocá los 3 puntitos ⋮\n2. Tocá \"Agregar a pantalla de inicio\"\n3. ¡Listo!" : "Desde Android: abrí traza360.app en Chrome → 3 puntitos → Agregar a pantalla"); }} className="flex-1 rounded-xl py-2.5 text-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.15)" }}>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Disponible en</p>
              <p className="text-sm font-bold" style={{ color: "#fff" }}>Google Play</p>
            </button>
            <button onClick={() => { const i = /iphone|ipad/i.test(navigator.userAgent); alert(i ? "1. Tocá el ícono □↑ abajo\n2. Tocá \"Agregar a inicio\"\n3. ¡Listo!" : "Desde iPhone: abrí traza360.app en Safari → □↑ → Agregar a inicio"); }} className="flex-1 rounded-xl py-2.5 text-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.15)" }}>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Disponible en</p>
              <p className="text-sm font-bold" style={{ color: "#fff" }}>App Store</p>
            </button>
          </div>
        </div>
      </div>

      {/* TECNOLOGÍAS — estilo DGR */}
      <section className="px-5 pb-10">
        <div className="flex items-center gap-3 mb-6 max-w-sm mx-auto">
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: BRAND.white, textTransform: "uppercase", letterSpacing: "3px", whiteSpace: "nowrap" }}>
            Nuestras tecnologías
          </h2>
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
        </div>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {tecnologias.map((t, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-4" style={{ background: BRAND.cardBg, border: `1px solid ${BRAND.border}` }}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${BRAND.border}` }}>{t.icon}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.cream, fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: "1px" }}>{t.titulo}</p>
                <p style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5, color: BRAND.textLight }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS — estilo DGR */}
      <section className="px-5 pb-10" style={{ background: "rgba(201,168,76,0.03)", borderTop: `1px solid ${BRAND.border}`, borderBottom: `1px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-3 pt-8 mb-6 max-w-sm mx-auto">
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: BRAND.white, textTransform: "uppercase", letterSpacing: "3px", whiteSpace: "nowrap" }}>
            Lo que dicen
          </h2>
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
        </div>
        <div className="flex flex-col gap-3 max-w-sm mx-auto pb-8">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: BRAND.cardBg, border: `1px solid ${BRAND.border}` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm" style={{ background: BRAND.goldGradient, color: BRAND.black, fontFamily: FONT_DISPLAY }}>{r.nombre[0]}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.cream, fontFamily: FONT_DISPLAY }}>{r.nombre}</p>
                  <p style={{ fontSize: 12, color: BRAND.gold, letterSpacing: "2px" }}>{"★".repeat(r.estrellas)} · {r.plataforma}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: BRAND.textLight, fontStyle: "italic" }}>"{r.texto}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL — estilo DGR */}
      <section className="px-5 py-12 text-center">
        <div className="flex items-center gap-3 mb-6 max-w-sm mx-auto">
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.gold }} />
          <div className="flex-1 h-px" style={{ background: BRAND.border }} />
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 900, color: BRAND.white, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
          Empezá hoy
        </h2>
        <p style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 24 }}>Gratis. Sin tarjeta. En 2 minutos.</p>
        <button onClick={() => onScreen("register")} className="w-full max-w-sm rounded-2xl py-4 font-black text-lg mx-auto block" style={{ background: BRAND.goldGradient, color: BRAND.black, boxShadow: "0 8px 30px rgba(201,168,76,0.35)", fontFamily: FONT_DISPLAY, letterSpacing: "1px", textTransform: "uppercase" }}>
          Probá Traza 360
        </button>
      </section>

      {/* FOOTER */}
      <div className="px-5 pb-8 text-center" style={{ borderTop: `1px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-center gap-3 text-sm flex-wrap pt-6" style={{ color: BRAND.textMute }}>
          <button onClick={() => onScreen("sobre_nosotros")} style={{ color: BRAND.gold }}>Sobre nosotros</button>
          <span>·</span>
          <button onClick={() => onScreen("privacidad")} style={{ color: BRAND.gold }}>Privacidad</button>
          <span>·</span>
          <button onClick={() => onScreen("terminos")} style={{ color: BRAND.gold }}>Términos</button>
        </div>
        <div className="text-[11px] mt-2" style={{ color: BRAND.textMute }}>
          📧 <span style={{ color: BRAND.gold }}>{SUPPORT_EMAIL}</span> · traza360.app
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ userProfile, authUser, pendingName, onLogout, onViewPlans }) {
  const [activeScreen, setActiveScreen] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [contactos, setContactos] = useState([]);
  const [panicoEnviado, setPanicoEnviado] = useState(false);
const [alertaActualId, setAlertaActualId] = useState(null);
const [respuestasPanico, setRespuestasPanico] = useState({}); 
  const [showRutaSegura, setShowRutaSegura] = useState(false); // v19.9
  // v19.7: state para modal GPS y banner config
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [pendingGpsAction, setPendingGpsAction] = useState(null);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  const nombreUsuario = userProfile?.nombre || pendingName || sessionStorage.getItem("traza360_pending_name") || authUser?.email?.split("@")[0] || "Usuario";
  const userPlan = userProfile?.plan || "gratis";

  // v19.9: exponer globalmente para RutaSeguraModal dentro de ModuleCard
  useEffect(() => {
    window.__traza360_auth = authUser;
    window.__traza360_profile = userProfile;
  }, [authUser, userProfile]);

  useEffect(() => {
    cargarContactos();
    // Detectar si ya tiene PIN configurado
    try { setHasPin(!!localStorage.getItem("traza360_quick_pin")); } catch(e){}
    // Detectar si debe ver el prompt de configurar PIN (primera vez con contactos OK)
    try {
      const promptVisto = localStorage.getItem("traza360_pin_prompt_dismissed");
      if (!promptVisto && !localStorage.getItem("traza360_quick_pin")) {
        setTimeout(() => setShowPinPrompt(true), 3000);
      }
    } catch(e){}
  }, []);

  async function cargarContactos() { setContactos(await getContactos()); }

  async function handleLogout() {
    setLoggingOut(true); try { sessionStorage.removeItem("traza360_pending_name"); } catch(e){} await signOut(); setLoggingOut(false); onLogout();
  }

  if (activeScreen === "contactos") return <ContactosScreen onBack={() => { setActiveScreen("home"); cargarContactos(); }} userPlan={userPlan} nombreUsuario={nombreUsuario} />;
  if (activeScreen === "evidencias") return <EvidenciasScreen onBack={() => setActiveScreen("home")} />;
  if (activeScreen === "te_cuido") return <TeCuidoScreen onBack={() => setActiveScreen("home")} contactos={contactos} />;
  if (activeScreen === "instrucciones") return <InstruccionesScreen onBack={() => setActiveScreen("home")} />;
  // v19.6: Pantallas legales y borrar cuenta
  if (activeScreen === "terminos") return <TerminosScreen onBack={() => setActiveScreen("home")} />;
  if (activeScreen === "privacidad") return <PoliticaPrivacidadScreen onBack={() => setActiveScreen("home")} />;
  if (activeScreen === "borrar_cuenta") return <BorrarCuentaScreen onBack={() => setActiveScreen("home")} onAccountDeleted={onLogout} />;
  // v19.7+: Nuevas pantallas Nivel 2
  if (activeScreen === "sobre_nosotros") return <SobreNosotrosScreen onBack={() => setActiveScreen("home")} />;
  if (activeScreen === "pin_setup") return <PinSetupScreen onBack={() => setActiveScreen("home")} onComplete={() => setActiveScreen("home")} modo={localStorage.getItem("traza360_quick_pin") ? "cambiar" : "crear"} />;
  if (activeScreen === "pin_eliminar") return <PinSetupScreen onBack={() => setActiveScreen("home")} onComplete={() => setActiveScreen("home")} modo="eliminar" />;
  if (activeScreen === "tour_demo") return <TourDemoScreen onComplete={() => setActiveScreen("home")} onSkip={() => setActiveScreen("home")} />;

  // ─── QUICK CARDS (v18 — Limpieza UI) ──────────
  // CAMBIOS v18:
  // - "Hogar Seguro" (mi_nido) y "Adulto Mayor Seguro" (los_protejo) COMENTADOS
  // - Renombrado "Te Cuido" → "Te Cuido a Distancia"
  const quickCards = [
    { key: "mi_escudo",    emoji: "\u{1F6E1}\u{FE0F}", title: "Violencia de Género",    text: "Violencia de género — Alerta silenciosa, ubicación y red de apoyo." },
    { key: "los_cuido",   emoji: "\u{1F9D1}\u200D\u{1F393}", title: "Adolescente Seguro",   text: "Adolescente seguro — Salidas, regresos y anti-bullying." },
    /* ❌ v18: Adulto Mayor comentado
    { key: "los_protejo", emoji: "\u{1FAF6}", title: "Adulto Mayor Seguro", text: "Adulto mayor — Medicamentos, caídas y asistencia." },
    */
    { key: "turno_seguro",emoji: "\u{1F303}", title: "Noche Segura", text: "Para jóvenes de noche, acompañantes, repartidores y cualquier situación de riesgo." },
    /* ❌ v18: Hogar Seguro comentado
    { key: "mi_nido",     emoji: "\u{1F3E0}", title: "Hogar Seguro",     text: "Hogar seguro — Intrusos, accidentes y emergencias." },
    */
    // 🔄 v19: Te Cuido a Distancia FUNCIONAL — grabación remota con consentimiento
    { key: "te_cuido", emoji: "\u{1F441}\u{FE0F}", title: "Te Cuido a Distancia", text: "Activá grabación con consentimiento de la víctima." },
    { key: "contactos",   emoji: "\u{1F465}", title: "Mis Contactos", text: `${contactos.length}/${(PLAN_LIMITS[userPlan]||PLAN_LIMITS.gratis).contactos} configurados` },
    // v19: Card de Instrucciones / Cómo funciona
    { key: "instrucciones", emoji: "\u{2139}\u{FE0F}", title: "¿Cómo funciona?", text: "Aprendé a usar la app paso a paso." },
  ];

  function handleCard(key) {
    if (key === "contactos") setActiveScreen("contactos");
    else if (key === "pastillero") setActiveScreen("pastillero");
    else if (key === "evidencias") setActiveScreen("evidencias");
    else if (key === "te_cuido") setActiveScreen("te_cuido");
    else if (key === "instrucciones") setActiveScreen("instrucciones");
    else { const mod = MODULES.find(m => m.key === key); if (mod) setActiveModule(mod); }
  }
function PanelPostPanico({ alertaActualId, respuestasPanico, setRespuestasPanico, contactos, enviarWhatsApp, setPanicoEnviado, setAlertaActualId, supabase, BRAND, GoldIcon }) {
  React.useEffect(function() {
    if (!alertaActualId) return;
    const canal = supabase.channel("resp_" + alertaActualId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "respuestas_contacto",
        filter: "alerta_id=eq." + alertaActualId
      }, function(payload) {
        const r = payload.new;
        setRespuestasPanico(function(prev) {
          return Object.assign({}, prev, { [r.button_id]: { hora: new Date(r.timestamp || Date.now()).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) } });
        });
      })
      .subscribe();
    return function() { supabase.removeChannel(canal); };
  }, [alertaActualId]);

  function cerrar() { setPanicoEnviado(false); setAlertaActualId(null); setRespuestasPanico({}); }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: "#000000", border: "2px solid " + BRAND.red }}>
        <div className="text-center space-y-4">
          <div className="py-4">
            <div className="mx-auto mb-2 flex justify-center"><GoldIcon name="panic" size={48} /></div>
            <h3 className="text-lg font-bold" style={{ color: BRAND.red }}>Alerta enviada</h3>
            <p className="text-sm mt-1" style={{ color: BRAND.textLight }}>Tu contacto recibió el WhatsApp con tu ubicación</p>
          </div>
          <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid " + BRAND.border }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(212,175,55,0.8)" }}>TU CONTACTO PUEDE RESPONDER CON</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { key: "salgo", emoji: "\u{1F697}", text: "Salgo" },
                { key: "recibi", emoji: "\u2705", text: "Recibí" },
                { key: "ubicacion", emoji: "\u{1F4CD}", text: "Ubicación" },
              ].map(function(r) {
                const resp = respuestasPanico[r.key];
                return (
                  <div key={r.key} className="rounded-lg py-3 text-center" style={{ background: resp ? "rgba(34,197,94,0.15)" : "linear-gradient(145deg, #101018, #08080c)", border: resp ? "1px solid rgba(34,197,94,0.5)" : "1px solid " + BRAND.border }}>
                    <div className="text-2xl">{r.emoji}</div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color: resp ? "rgba(34,197,94,1)" : BRAND.gold }}>{r.text}</div>
                    {resp && <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{resp.hora}</div>}
                  </div>
                );
              })}
            </div>
            {Object.keys(respuestasPanico).length === 0
              ? <p className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.4)" }}>Cuando responda, verás su emoji acá</p>
              : <p className="text-[12px] text-center" style={{ color: "rgba(34,197,94,0.8)" }}>✅ Tu contacto respondió</p>
            }
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={function() { if(contactos.length>0) enviarWhatsApp(contactos[0].telefono,"SIGO EN PELIGRO - necesito ayuda urgente"); }}
              className="rounded-lg py-2 text-center active:scale-95"
              style={{ background: "rgba(220,38,38,0.15)", border: "1px solid " + BRAND.red }}>
              <div className="text-xl">{"\u{1F6A8}"}</div>
              <div className="text-[11px] mt-0.5" style={{ color: BRAND.red }}>Sigo en peligro</div>
            </button>
            <button onClick={function() { if(contactos.length>0) { enviarWhatsApp(contactos[0].telefono,"Estoy bien. Falsa alarma."); cerrar(); } }}
              className="rounded-lg py-2 text-center active:scale-95"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="text-xl">{"\u2705"}</div>
              <div className="text-[11px] mt-0.5 text-green-400">Estoy bien</div>
            </button>
          </div>
          <button onClick={cerrar} className="w-full rounded-xl py-3 text-sm font-semibold mt-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid " + BRAND.border, color: BRAND.textLight }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
  async function handlePanico() {
    if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza primero."); return; }

    // v19.7: Si nunca aceptó GPS, mostrar modal explicativo primero
    const gpsAccepted = localStorage.getItem("traza360_gps_consent");
    if (!gpsAccepted) {
      setPendingGpsAction(() => ejecutarPanico);
      setShowGpsModal(true);
      return;
    }
    await ejecutarPanico();
  }

 async function ejecutarPanico() {
    const { location } = await getCurrentLocationWithFallback();
    const alertaId = crypto.randomUUID();
    setAlertaActualId(alertaId);
    setRespuestasPanico({});

    // Insertar alerta en Supabase
    try {
      await supabase.from("alertas").insert({
        id: alertaId,
        usuario_id: authUser?.id || null,
        tipo: "panico",
        modulo: "boton_flotante",
        mensaje: "ALERTA - Botón de pánico activado. Necesito ayuda urgente.",
        latitud: location?.lat || null,
        longitud: location?.lng || null,
        link_mapa: location?.lat ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null,
        enviado_a: contactos.map(function(c) { return c.telefono; }),
        creado_en: new Date().toISOString()
      });
    } catch(dbErr) { console.warn("DB alerta:", dbErr); }

    // Enviar WhatsApp a TODOS los contactos con link
    const linkAlerta = "https://traza360.app/alerta/" + alertaId;
    const msgConLink = "ALERTA - Botón de pánico activado. Necesito ayuda urgente. Ver: " + linkAlerta;
    const msg = buildMessageWithReply(msgConLink, location);

    for (const c of contactos) {
      try { await enviarWhatsApp(c.telefono, msg); } catch(e) { console.warn("WA:", e); }
    }

    reproducirSonido();
    setPanicoEnviado(true);
  }

  function aceptarGps() {
    try { localStorage.setItem("traza360_gps_consent", new Date().toISOString()); } catch(e){}
    setShowGpsModal(false);
    if (pendingGpsAction) {
      const fn = pendingGpsAction;
      setPendingGpsAction(null);
      setTimeout(() => fn(), 100);
    }
  }

  function rechazarGps() {
    setShowGpsModal(false);
    setPendingGpsAction(null);
    alert("Sin GPS, los contactos recibirán alertas sin tu ubicación. Podés aceptarlo después desde el panel.");
  }

  return (
    <div className="min-h-screen px-5 py-8 pb-24" style={{ background: BRAND.blackBg, color: BRAND.white }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <PinEyeLogo size={80} showText={false} />
          <p className="text-[11px] uppercase tracking-[4px] mt-2 font-semibold" style={{ color: BRAND.gold }}>{TAGLINE}</p>
        </div>

        {/* Dashboard Estado del Sistema — sin nombre de usuario */}
        <div className="mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.border}` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[3px] mb-1 font-semibold" style={{ color: BRAND.gold }}>Estado del sistema</p>
              <p className="text-sm mt-0.5" style={{ color: BRAND.textLight }}>Plan: <span style={{ color: BRAND.gold }} className="font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span></p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <SystemStatusPanel
                contactos={contactos}
                onGoToContactos={() => setActiveScreen("contactos")}
              />
            </div>
          </div>

          {/* Alerta si sin contactos */}
          {contactos.length === 0 && (
            <button onClick={() => setActiveScreen("contactos")} className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "rgba(220,38,38,0.1)", border: `1px solid ${BRAND.red}40`, color: "#fca5a5" }}>
              {"\u26A0\u{FE0F}"} Agregá un contacto para activar la protección →
            </button>
          )}

          <div className="mt-3 flex gap-2 flex-wrap">
            <button onClick={handleLogout} disabled={loggingOut} className="rounded-xl px-3 py-1.5 text-sm disabled:opacity-50" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
              {loggingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
            <button onClick={() => setActiveScreen("borrar_cuenta")} className="rounded-xl px-3 py-1.5 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${BRAND.red}40`, color: "#fca5a5" }}>
              {"\u{1F5D1}\u{FE0F}"} Borrar cuenta
            </button>
          </div>
        </div>

        {activeModule ? (
          <div className="mb-8">
            <button onClick={() => setActiveModule(null)} className="mb-4 rounded-xl px-5 py-3 text-sm font-bold" style={{ color: BRAND.gold, background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)", border: `1px solid ${BRAND.borderStrong}` }}>{"\u2190"} Volver al panel</button>
            <ModuleCard m={activeModule} autoExpand={true} contactos={contactos} onOpenPastillero={() => { setActiveModule(null); setActiveScreen("pastillero"); }} onOpenEvidencias={() => { setActiveModule(null); setActiveScreen("evidencias"); }} />
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-base font-bold uppercase tracking-[2px]" style={{ color: BRAND.white }}>¿Qué necesitás hoy?</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickCards.map(card => {
                const iconMap = {
                  "mi_escudo": "shield", "los_cuido": "teen", "turno_seguro": "night",
                  "te_cuido": "eye", "contactos": "contacts", "instrucciones": "write",
                };
                const iconName = iconMap[card.key];
                const cardColors = {
                  mi_escudo:    { accent: "#E74C3C", glow: "rgba(231,76,60,0.08)",  border: "rgba(231,76,60,0.3)",  iconBg: "rgba(231,76,60,0.12)" },
                  turno_seguro: { accent: "#5DADE2", glow: "rgba(93,173,226,0.08)", border: "rgba(93,173,226,0.25)", iconBg: "rgba(93,173,226,0.12)" },
                  los_cuido:    { accent: "#2ECC71", glow: "rgba(46,204,113,0.08)", border: "rgba(46,204,113,0.25)", iconBg: "rgba(46,204,113,0.12)" },
                  contactos:    { accent: contactos.length === 0 ? BRAND.red : BRAND.gold, glow: "rgba(201,168,76,0.05)", border: contactos.length === 0 ? `${BRAND.red}50` : BRAND.border, iconBg: "rgba(201,168,76,0.1)" },
                  instrucciones:{ accent: BRAND.goldLite, glow: "rgba(201,168,76,0.05)", border: BRAND.border, iconBg: "rgba(201,168,76,0.08)" },
                }[card.key] || { accent: BRAND.gold, glow: "rgba(201,168,76,0.05)", border: BRAND.border, iconBg: "rgba(201,168,76,0.08)" };
                return (
                <button key={card.key} onClick={() => handleCard(card.key)}
                  className="text-left rounded-2xl p-5 active:scale-[0.98] transition-all relative"
                  style={{
                    background: BRAND.cardBg,
                    border: `1px solid ${cardColors.border}`,
                    boxShadow: `5px 5px 14px rgba(0,0,0,0.6), 0 0 20px ${cardColors.glow}`,
                    minHeight: 130,
                  }}>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: cardColors.iconBg, border: `1px solid ${cardColors.border}` }}>
                    {iconName ? <GoldIcon name={iconName} size={28} /> : <span className="text-2xl">{card.emoji}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: BRAND.white, lineHeight: 1.3 }}>{card.title}</div>
                  <p style={{ marginTop: 5, fontSize: 13, lineHeight: 1.5, color: BRAND.textLight }}>{card.text}</p>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: cardColors.accent, textTransform: "uppercase", letterSpacing: "1px" }}>Abrir →</div>
                </button>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(220,38,38,0.05)", border: `1px solid ${BRAND.red}30` }}>
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">{"\u26A0\u{FE0F}"}</span>
                <p className="text-[11px] leading-relaxed" style={{ color: BRAND.textLight }}>
                  Traza 360 <strong style={{ color: BRAND.red }}>NO reemplaza</strong> al 911 ni a los servicios oficiales de emergencia.{" "}
                  <button onClick={() => setActiveScreen("terminos")} className="underline font-semibold" style={{ color: BRAND.gold }}>Ver términos</button>
                </p>
              </div>
            </div>

            {/* Footer privacidad y legal */}
            <div className="mt-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                <button onClick={() => setActiveScreen("pin_setup")}
                  className="rounded-lg px-3 py-1.5 font-semibold"
                  style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                  {"\u{1F510}"} {hasPin ? "Cambiar PIN" : "Configurar PIN"}
                </button>
                {hasPin && (
                  <button onClick={() => setActiveScreen("pin_eliminar")}
                    className="rounded-lg px-3 py-1.5"
                    style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${BRAND.red}30`, color: "#fca5a5" }}>
                    Eliminar PIN
                  </button>
                )}
                <button onClick={() => setActiveScreen("tour_demo")}
                  className="rounded-lg px-3 py-1.5"
                  style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                  {"\u{1F39B}\u{FE0F}"} Tour demo
                </button>
              </div>

              {/* Links legales */}
              <div className="flex items-center justify-center gap-3 text-sm flex-wrap" style={{ color: BRAND.textMute }}>
                <button onClick={() => setActiveScreen("instrucciones")} className="hover:underline" style={{ color: BRAND.gold }}>¿Cómo funciona?</button>
                <span>·</span>
                <button onClick={() => setActiveScreen("sobre_nosotros")} className="hover:underline" style={{ color: BRAND.gold }}>Sobre nosotros</button>
                <span>·</span>
                <button onClick={() => setActiveScreen("privacidad")} className="hover:underline" style={{ color: BRAND.gold }}>Privacidad</button>
                <span>·</span>
                <button onClick={() => setActiveScreen("terminos")} className="hover:underline" style={{ color: BRAND.gold }}>Términos</button>
              </div>

              <div className="text-[11px]" style={{ color: BRAND.textMute }}>
                v{APP_VERSION} · traza360.app
              </div>
            </div>
          </>
        )}
      </div>

      {/* GPS modal se muestra desde App principal, no desde HomeScreen */}

      {/* v19.8: Prompt para configurar PIN de acceso rápido (primera vez) */}
      {showPinPrompt && !hasPin && contactos.length > 0 && (
        <div className="fixed bottom-24 left-5 right-5 z-40 rounded-2xl p-4 shadow-2xl" style={{ background: "linear-gradient(145deg, #111111, #000000)", border: `1px solid ${BRAND.borderStrong}`, maxWidth: "400px", margin: "0 auto" }}>
          <div className="flex items-start gap-3">
            <div className="shrink-0"><GoldIcon name="shield" size={28} /></div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: BRAND.gold }}>¿Querés entrar más rápido?</p>
              <p className="text-sm mt-1" style={{ color: BRAND.textLight }}>Configurá un PIN de 4 dígitos para no escribir email y contraseña cada vez.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowPinPrompt(false); setActiveScreen("pin_setup"); }}
                  className="rounded-lg px-3 py-1.5 text-sm font-bold"
                  style={{ background: BRAND.goldGradient, color: BRAND.black }}>
                  Configurar PIN
                </button>
                <button onClick={() => { setShowPinPrompt(false); try { localStorage.setItem("traza360_pin_prompt_dismissed", "1"); } catch(e){} }}
                  className="rounded-lg px-3 py-1.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.textLight }}>
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={() => { setShowPinPrompt(false); try { localStorage.setItem("traza360_pin_prompt_dismissed", "1"); } catch(e){} }} className="text-base" style={{ color: BRAND.textMute }}>×</button>
          </div>
        </div>
      )}

      {/* PANEL POST-PÁNICO */}
 {panicoEnviado && (
  <PanelPostPanico
    alertaActualId={alertaActualId}
    respuestasPanico={respuestasPanico}
    setRespuestasPanico={setRespuestasPanico}
    contactos={contactos}
    enviarWhatsApp={enviarWhatsApp}
    setPanicoEnviado={setPanicoEnviado}
    setAlertaActualId={setAlertaActualId}
    supabase={supabase}
    BRAND={BRAND}
    GoldIcon={GoldIcon}
  />
)}
      {/* BOTÓN PÁNICO FLOTANTE — v19: con logo de la app + paleta dorada/roja */}
      <div className="fixed bottom-5 right-5 z-50">
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: `2px solid ${BRAND.gold}`, animation: "panicPulse 2.5s infinite", pointerEvents: "none" }} />
          <button onClick={handlePanico} className="flex h-20 w-20 items-center justify-center rounded-full active:scale-95"
            style={{ background: BRAND.black, border: `3px solid ${BRAND.gold}`, boxShadow: `6px 6px 18px rgba(0,0,0,0.8), 0 0 30px ${BRAND.gold}55` }}>
            <PinEyeLogo size={56} showText={false} />
          </button>
        </div>
        <div className="text-[12px] text-center mt-1 font-bold uppercase tracking-wider" style={{ color: BRAND.gold }}>Pánico</div>
      </div>
      <style>{`@keyframes panicPulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.12)} }`}</style>
    </div>
  );
}

// ─── CALCULADORA FALSA ───────────────────────
function CalculadoraScreen({ onUnlock }) {
  const [display, setDisplay] = useState("0");
  const [pin] = useState(() => sessionStorage.getItem("traza360_pin") || "1234");
  function handleKey(key) {
    if (key === "C") { setDisplay("0"); return; }
    if (key === "=") {
      if (display === pin || display.endsWith(pin)) { onUnlock(); return; }
      try { const result = Function('"use strict"; return (' + display.replace(/×/g,"*").replace(/÷/g,"/") + ')')(); setDisplay(String(result)); }
      catch(e) { setDisplay("Error"); }
      return;
    }
    if (display === "0" || display === "Error") setDisplay(key); else setDisplay(display + key);
  }
  const keys = ["7","8","9","÷","4","5","6","×","1","2","3","-","0",".","=","+","C"];
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-end pb-8 px-4">
      <div className="w-full max-w-sm mt-8 mb-auto"><div className="text-center text-slate-400 text-sm mb-2">Calculadora</div></div>
      <div className="w-full max-w-sm mb-4"><div className="rounded-2xl bg-[#222] p-6 text-right"><div className="text-4xl font-light text-white font-mono">{display}</div></div></div>
      <div className="w-full max-w-sm grid grid-cols-4 gap-2">
        {keys.map(k => (
          <button key={k} onClick={() => handleKey(k)}
            className={`rounded-2xl py-4 text-xl font-semibold active:scale-95 ${["÷","×","-","+","="].includes(k) ? "bg-orange-500 text-white" : k==="C" ? "bg-[#a5a5a5] text-black" : "bg-[#333] text-white"}`}>
            {k}
          </button>
        ))}
      </div>
      <div className="mt-6 text-center"><p className="text-[12px] text-slate-700">Ingresá {pin} y tocá = para acceder</p></div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [userProfile, setUserProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [modoCalc, setModoCalc] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false); // v19.12 fix
  // v19.7: Tour demo, GPS explainer
  const [showTour, setShowTour] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("modo") === "calc") { setModoCalc(true); setScreen("calculadora"); return; }
    checkSession();
    // v19.7: pedir GPS con explicación primero
    const gpsAsked = sessionStorage.getItem("traza360_gps_asked");
    if (!gpsAsked) {
      setShowGpsModal(true);
    } else {
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => saveLastLocation(pos.coords.latitude, pos.coords.longitude), () => {}, { enableHighAccuracy: true, timeout: 10000 });
    }
    try { const s = sessionStorage.getItem("traza360_pending_name"); if (s) setPendingName(s); } catch(e){}
  }, []);

  async function checkSession() {
    const r = await getCurrentUser();
    if (r?.authUser) {
      setAuthUser(r.authUser); setUserProfile(r.profile);
      if (!r.profile) await tryCreateProfile(r.authUser);

      // v19.8: Si tiene PIN configurado y NO viene de login fresco, pedir PIN
      const tienePin = localStorage.getItem("traza360_quick_pin");
      const sessionUnlocked = sessionStorage.getItem("traza360_pin_unlocked");
      if (tienePin && !sessionUnlocked) {
        setScreen("pin_auth");
        return;
      }
      setPinUnlocked(true);

      const done = sessionStorage.getItem("traza360_onboarding_done");
      if (!done) { setShowOnboarding(true); setScreen("home"); }
      else setScreen("home");
    } else setScreen("landing");
  }

  async function tryCreateProfile(user) {
    try {
      const n = sessionStorage.getItem("traza360_pending_name") || user.email?.split("@")[0] || "Usuario";
      const { data, error } = await supabase.from("usuarios").insert({ auth_user_id: user.id, nombre: n, email: user.email, plan: "gratis", modo: "me_protejo" }).select().single();
      if (!error && data) setUserProfile(data);
    } catch(e){}
  }

  async function handleLoginSuccess() {
    const r = await getCurrentUser();
    if (r?.authUser) { setAuthUser(r.authUser); setUserProfile(r.profile); if (!r.profile) await tryCreateProfile(r.authUser); }
    // Login fresco = saltar PIN para esta sesión
    try { sessionStorage.setItem("traza360_pin_unlocked", "1"); } catch(e){}
    setPinUnlocked(true);
    const done = sessionStorage.getItem("traza360_onboarding_done");
    if (!done) setShowOnboarding(true);
    setScreen("home");
  }

  function handlePinSuccess() {
    try { sessionStorage.setItem("traza360_pin_unlocked", "1"); } catch(e){}
    setPinUnlocked(true);
    const done = sessionStorage.getItem("traza360_onboarding_done");
    if (!done) { setShowOnboarding(true); setScreen("home"); }
    else setScreen("home");
  }

  async function handlePinFallback() {
    // Fallback: cerrar sesión y volver a login con email
    await signOut();
    try {
      sessionStorage.removeItem("traza360_pin_unlocked");
      sessionStorage.removeItem("traza360_pending_name");
      sessionStorage.removeItem("traza360_onboarding_done");
    } catch(e){}
    setAuthUser(null);
    setUserProfile(null);
    setPinUnlocked(false);
    setScreen("login");
  }

  function handleLogout() {
    setUserProfile(null); setAuthUser(null); setPendingName(null);
    try {
      sessionStorage.removeItem("traza360_pending_name");
      sessionStorage.removeItem("traza360_onboarding_done");
      sessionStorage.removeItem("traza360_pin_unlocked");
    } catch(e){}
    setPinUnlocked(false);
    setScreen("landing");
  }
  function handleUnlockCalc() { setModoCalc(false); checkSession(); }
  // v19.7: Onboarding → Tour Demo → Home
  function handleOnboardingComplete(selectedModule) {
    setShowOnboarding(false);
    const tourDone = sessionStorage.getItem("traza360_tour_done");
    if (!tourDone) { setShowTour(true); } // Mostrar tour si nunca lo hizo
  }

  function handleTourComplete() {
    setShowTour(false);
    try { sessionStorage.setItem("traza360_tour_done", "1"); } catch(e){}
  }

  function handleGpsAceptar() {
    setShowGpsModal(false);
    try { sessionStorage.setItem("traza360_gps_asked", "1"); } catch(e){}
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  function handleGpsRechazar() {
    setShowGpsModal(false);
    try { sessionStorage.setItem("traza360_gps_asked", "1"); } catch(e){}
  }

  if (screen === "calculadora") return <CalculadoraScreen onUnlock={handleUnlockCalc} />;

  if (screen === "loading") return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: BRAND.blackBg }}>
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center"><PinEyeLogo size={80} showText={false} /></div>
        <div className="text-sm mt-2" style={{ color: BRAND.gold }}>Cargando...</div>
      </div>
    </div>
  );

  // v19.8: Pantalla de PIN auth (entre Supabase auth y panel home)
  if (screen === "pin_auth") return <PinAuthScreen onSuccess={handlePinSuccess} onFallback={handlePinFallback} onLogout={handleLogout} />;

  // Onboarding → Tour Demo → Home
  if (screen === "home" && showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  if (screen === "home" && showTour) return <TourDemoScreen onComplete={handleTourComplete} onSkip={handleTourComplete} />;

  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} onRecuperar={() => setScreen("recuperar")} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} setPendingName={setPendingName} onScreen={setScreen} />;
  if (screen === "recuperar") return <RecuperarPasswordScreen onBack={() => setScreen("login")} />;
  if (screen === "terminos") return <TerminosScreen onBack={() => setScreen(authUser ? "home" : "landing")} />;
  if (screen === "privacidad") return <PoliticaPrivacidadScreen onBack={() => setScreen(authUser ? "home" : "landing")} />;
  if (screen === "sobre_nosotros") return <SobreNosotrosScreen onBack={() => setScreen(authUser ? "home" : "landing")} />;
  if (screen === "instrucciones_publico") return <InstruccionesScreen onBack={() => setScreen("landing")} />;
  if (screen === "planes") return <PlanesScreen onBack={() => setScreen("home")} currentPlan={userProfile?.plan || "gratis"} />;
  if (screen === "home") return (
    <>
      {showGpsModal && <GpsExplainerModal onAceptar={handleGpsAceptar} onRechazar={handleGpsRechazar} />}
      <HomeScreen userProfile={userProfile} authUser={authUser} pendingName={pendingName} onLogout={handleLogout} onViewPlans={() => setScreen("planes")} />
    </>
  );
  return <LandingScreen onScreen={setScreen} />;
}
