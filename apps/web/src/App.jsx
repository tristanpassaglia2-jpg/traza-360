import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase, getContactos, addContacto, deleteContacto, getMedicamentos, addMedicamento, deleteMedicamento, getTomasHoy, getTomasSemana, marcarTomado, crearTomasDelDia } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa v16
   Versión: 16.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   CAMBIOS v16:
   1. DISEÑO PREMIUM Dark Luxury + Neomorphism
   2. Logo escudo con ojo de águila (SVG)
   3. Módulo "Zonas de riesgo" (ex Trabajo nocturno)
   4. Daily.co WebRTC audio/video en vivo
   5. WhatsApp automático vía Twilio API
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER_DEFAULT = "5493513956879";
const PIN_DEFAULT = "1234";
const HOME_ADDRESS_DEFAULT = "Mi casa";
const TAXI_NUMBER_DEFAULT = ""; // El usuario lo configura

const PLAN_LIMITS = {
  gratis: { contactos: 2, terceros: 1, zonas: 2, medicamentos: 1, audioMax: 300, storage: "100 MB" },
  mensual: { contactos: 5, terceros: 1, zonas: 5, medicamentos: 5, audioMax: 1800, storage: "1 GB" },
  anual: { contactos: 10, terceros: 5, zonas: -1, medicamentos: -1, audioMax: -1, storage: "10 GB" },
};

const PLAN_PRICES = {
  gratis: { name: "Gratis", price: "US$0" },
  mensual: { name: "Mensual", price: "US$2.99/mes" },
  anual: { name: "Anual", price: "US$24.99/año (30% OFF)" },
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
  { key: "orange", bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-300", dot: "bg-orange-400" },
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
          <span>{pais.flag}</span><span className="text-slate-300">+{pais.prefix}</span><span className="text-slate-500 text-xs">{"\u25BC"}</span>
        </button>
        <input type="tel" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Número sin 0 ni 15"}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 min-w-0" />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#0d1426] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
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

// ─── WHATSAPP VÍA API (v15 — Twilio Sandbox/Producción) ──────
// Envía WhatsApp automático vía API del servidor (no abre wa.me)
async function sendWhatsAppAPI(numero, text) {
  try {
    const numLimpio = numero.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "").replace(/^0+/, "");
    const response = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: numLimpio, message: text }),
    });
    const data = await response.json();
    if (data.success) {
      console.log("WhatsApp enviado OK:", data.sid);
      return { success: true, sid: data.sid };
    } else {
      console.warn("WhatsApp API error:", data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error("WhatsApp fetch error:", error);
    return { success: false, error: error.message };
  }
}

// Envía por API y si falla abre wa.me como respaldo
async function enviarWhatsApp(numero, text) {
  const result = await sendWhatsAppAPI(numero, text);
  if (!result.success) {
    // Fallback: abrir wa.me manualmente
    const numLimpio = numero.replace(/\+/g, "").replace(/\s/g, "");
    window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  return result;
}

// Solo por API (para timers automáticos como pastillero - no puede abrir ventanas)
async function enviarWhatsAppSilencioso(numero, text) {
  return await sendWhatsAppAPI(numero, text);
}

// Mantener compatibilidad con código existente
function openWhatsAppToContact(numero, text) {
  enviarWhatsApp(numero, text);
}

function openWhatsAppDefault(text) {
  enviarWhatsApp(WHATSAPP_NUMBER_DEFAULT, text);
}

function buildMessageWithReply(baseMessage, loc) {
  let msg = baseMessage;
  if (loc) msg += "\n\n\u{1F4CD} Ubicacion: " + buildMapLink(loc);
  msg += "\n\n\u{1F4F1} RESPONDER (toca y envia):\n\u2705 = OK\n\u{1F44D} = Recibi\n\u{1F3C3} = Voy\n\u{1F697} = Salgo ya\n\u23F0 = 5 min\n\u{1F3E0} = En casa\n\u{1F44B} = Llegue\n\u{1F6A8} = Emergencia";
  return msg;
}

async function sendAlertToContact(contact, baseMessage) {
  const { location } = await getCurrentLocationWithFallback();
  enviarWhatsApp(contact.telefono, buildMessageWithReply(baseMessage, location));
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
  if (Notification.permission === "granted") {
    new Notification(titulo, { body, icon: "/favicon.ico", badge: "/favicon.ico" });
  }
}

function reproducirSonido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => { osc.frequency.value = 1000; }, 200);
    setTimeout(() => { osc.frequency.value = 800; }, 400);
    setTimeout(() => { osc.stop(); ctx.close(); }, 600);
  } catch(e){}
}

// ─── ICONS ──────────────────────────────────
function WhatsAppIcon({ size = 20 }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);
}

function WhatsAppFloatingButton() {
  return (<div className="fixed bottom-5 right-5 z-50"><button onClick={() => openWhatsAppDefault("Hola, quiero información sobre Traza 360.")} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 hover:scale-110 active:scale-95"><WhatsAppIcon size={28} /></button></div>);
}

// ─── GRABACION AUDIO ────────────────────────
let mediaRecorderInstance = null;
let audioChunksRef = [];

// Detectar formato de audio soportado
function getAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
  if (MediaRecorder.isTypeSupported("audio/aac")) return "audio/aac";
  return ""; // dejar que el navegador elija
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

// Guardar evidencia en Supabase Storage
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
    if (blob) {
      const result = await guardarEvidencia(blob, "audio");
      setGuardado(result.cloud ? "nube" : "local");
    }
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#0d1426] p-6 shadow-2xl">
        <div className="text-center">
          <div className="mb-3 text-4xl">{guardado ? "\u2705" : "\u{1F399}\u{FE0F}"}</div>
          <div className="text-lg font-bold text-slate-100">{guardado ? "Evidencia guardada" : "Grabación silenciosa"}</div>
          {guardado ? (
            <><p className="mt-2 text-xs text-slate-400">{guardado === "nube" ? "Guardado en la nube. Accedé desde Mis Evidencias en este módulo." : "Descargado en tu dispositivo."}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">Listo</button></>
          ) : grabando ? (
            <><div className="my-6 rounded-2xl border border-red-500/30 bg-red-500/10 py-6">
              <div className="flex items-center justify-center gap-2 mb-2"><div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs font-semibold text-red-300 uppercase tracking-widest">Grabando</span></div>
              <div className="font-mono text-4xl font-bold text-white tabular-nums">{fmt(tiempo)}</div>
            </div>
            <button onClick={detener} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">Detener y guardar evidencia</button></>
          ) : (
            <><p className="mt-2 text-xs text-slate-400">Se graba audio del entorno sin hacer ruido.</p>
            {error && <p className="text-xs text-red-400 my-2">{error}</p>}
            <button onClick={iniciar} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">Iniciar grabación silenciosa</button>
            <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TIMER LUGAR DESCONOCIDO ────────────────
function TimerLugarModal({ onClose, contactos }) {
  const [minutos, setMinutos] = useState(30);
  const [activo, setActivo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [alertaEnviada, setAlertaEnviada] = useState(false);
  const timerRef = useRef(null);

  function iniciar() {
    setTiempoRestante(minutos * 60);
    setActivo(true);
    // Avisar a contactos que entró a lugar desconocido
    if (contactos.length > 0) {
      getCurrentLocationWithFallback().then(({ location }) => {
        const msg = buildMessageWithReply(`Entro a un lugar desconocido. Si no aviso en ${minutos} minutos, necesito ayuda.`, location);
        enviarWhatsApp(contactos[0].telefono, msg);
      });
    }
  }

  useEffect(() => {
    if (!activo) return;
    timerRef.current = setInterval(() => {
      setTiempoRestante(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          enviarNotificacion("ALERTA TRAZA 360", "No confirmaste que estás bien. Se alertó a tus contactos.");
          reproducirSonido();
          if (contactos.length > 0) {
            getCurrentLocationWithFallback().then(({ location }) => {
              const msg = buildMessageWithReply("ALERTA AUTOMATICA - No confirmó que está bien después de entrar a un lugar desconocido. Verificar urgente.", location);
              enviarWhatsApp(contactos[0].telefono, msg);
            });
          }
          setAlertaEnviada(true);
          setActivo(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activo]);

  function cancelar() {
    clearInterval(timerRef.current);
    setActivo(false);
    setTiempoRestante(0);
  }

  function estoyBien() {
    clearInterval(timerRef.current);
    setActivo(false);
    if (contactos.length > 0) {
      enviarWhatsApp(contactos[0].telefono, "Estoy bien. Salí del lugar sin problemas.");
    }
    onClose();
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-orange-500/30 bg-[#0d1426] p-6 shadow-2xl">
        <div className="text-center">
          {alertaEnviada ? (
            <>
              <div className="text-5xl mb-3">{"\u{1F6A8}"}</div>
              <div className="text-lg font-bold text-red-300">Alerta enviada</div>
              <p className="mt-2 text-xs text-slate-400">Se alertó a tus contactos porque no confirmaste.</p>
              <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-white/10 border border-white/10 py-3 text-sm text-white">Cerrar</button>
            </>
          ) : activo ? (
            <>
              <div className="text-4xl mb-3">{"\u23F1\u{FE0F}"}</div>
              <div className="text-lg font-bold text-slate-100">Timer activo</div>
              <p className="mt-2 text-xs text-slate-400">Si no tocás "Estoy bien" antes de que termine, se alerta a tus contactos.</p>
              <div className="my-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 py-6">
                <div className="font-mono text-4xl font-bold text-white tabular-nums">{fmt(tiempoRestante)}</div>
              </div>
              <button onClick={estoyBien} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">Estoy bien</button>
              <button onClick={cancelar} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar timer</button>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">{"\u23F1\u{FE0F}"}</div>
              <div className="text-lg font-bold text-slate-100">Entro a lugar desconocido</div>
              <p className="mt-2 text-xs text-slate-400">Elegí cuánto tiempo vas a estar. Si no confirmás, se alerta automáticamente.</p>
              <div className="my-4 grid grid-cols-3 gap-2">
                {[15, 30, 60].map(m => (
                  <button key={m} onClick={() => setMinutos(m)}
                    className={`rounded-xl border py-3 text-sm font-semibold ${minutos === m ? "border-orange-400/50 bg-orange-500/10 text-orange-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
                    {m} min
                  </button>
                ))}
              </div>
              <button onClick={iniciar} className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">Iniciar timer ({minutos} min)</button>
              <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar</button>
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
    setAudioUrl(url);
    setAudioName(f.name);
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
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{ color: "#d4af37" }}>{"\u2190"} Volver</button>
        <div className="mb-6 rounded-2xl p-6" style={{ background: "linear-gradient(145deg, #13131d, #0e0e16)", border: "1px solid rgba(212,175,55,0.1)", boxShadow: "6px 6px 18px rgba(0,0,0,0.5), -3px -3px 10px rgba(212,175,55,0.01)" }}>
          <p className="text-[10px] uppercase tracking-[3px]" style={{ color: "#d4af37" }}>Mis archivos protegidos</p>
          <h2 className="mt-2 text-xl font-bold">Mis Evidencias</h2>
          <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Grabaciones guardadas en la nube.</p>
        </div>

        {/* Reproductor de audio visible */}
        {audioUrl && (
          <div className="mb-4 rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{"\u{1F3B5}"}</span>
              <span className="text-xs font-semibold" style={{ color: "#d4af37" }}>Reproduciendo: {audioName}</span>
              <button onClick={() => { setAudioUrl(null); setAudioName(null); }} className="ml-auto text-xs text-slate-500">{"\u2715"}</button>
            </div>
            <audio controls autoPlay src={audioUrl} style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
          </div>
        )}

        {loading ? <div className="text-center py-8 text-slate-400">Cargando...</div>
        : archivos.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(145deg, #12121a, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)" }}>
            <div className="text-5xl mb-3">{"\u{1F4C1}"}</div>
            <h3 className="text-lg font-semibold text-white">Sin evidencias</h3>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Cuando grabes audio desde cualquier módulo, aparecerá acá.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivos.map((f, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #12121a, #0c0c12)", border: audioName === f.name ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(212,175,55,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{f.name?.includes("audio") ? "\u{1F399}\u{FE0F}" : "\u{1F3A5}"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{f.metadata?.size ? (f.metadata.size / 1024).toFixed(0) + " KB" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => reproducir(f)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{
                        background: audioName === f.name ? "rgba(212,175,55,0.15)" : "rgba(212,175,55,0.08)",
                        border: "1px solid rgba(212,175,55,0.2)",
                        color: "#d4af37",
                      }}>
                      {audioName === f.name ? "\u{1F50A} Escuchando" : "\u{25B6}\u{FE0F} Escuchar"}
                    </button>
                    <button onClick={() => descargar(f)} className="rounded-lg px-2 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>{"\u{2B07}\u{FE0F}"}</button>
                    <button onClick={() => eliminar(f)} className="rounded-lg px-2 py-1.5 text-xs" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}>{"\u{1F5D1}\u{FE0F}"}</button>
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
// ═══════════════════════════════════════════════

function PastilleroScreen({ onBack, userPlan = "gratis", contactos = [] }) {
  const [meds, setMeds] = useState([]);
  const [tomasHoy, setTomasHoy] = useState([]);
  const [tomasSemana, setTomasSemana] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("hoy"); // hoy | agregar | semana
  const [error, setError] = useState("");

  // Form agregar
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
          // WhatsApp al familiar si no confirma en 10 min
          if (notifFamiliar && contactos.length > 0) {
            const tid2 = setTimeout(async () => {
              const tomasActualizadas = await getTomasHoy();
              const estaT = tomasActualizadas.find(x => x.id === t.id);
              if (estaT && !estaT.tomado) {
                const familiar = contactos[0];
                enviarWhatsAppSilencioso(familiar.telefono, `AVISO PASTILLERO: No se confirmo la toma de ${medNombre} (${t.horario_programado}). Por favor verificar.`);
              }
            }, 600000); // 10 min
            timersRef.current.push(tid2);
          }
        }, diff);
        timersRef.current.push(tid);
      }
    });
  }

  async function handleTome(tomaId) {
    const r = await marcarTomado(tomaId);
    if (r.success) {
      reproducirSonido();
      cargarTodo();
    }
  }

  async function handleAgregar() {
    setError("");
    if (!nombre.trim()) { setError("Ponele un nombre al medicamento."); return; }
    if (horarios.length === 0) { setError("Agregá al menos 1 horario."); return; }
    if (diasSel.length === 0) { setError("Seleccioná al menos 1 día."); return; }
    if (maxMeds > 0 && meds.length >= maxMeds) { setError(`Tu plan permite solo ${maxMeds} medicamento(s). Pasate a Mensual.`); return; }

    setSaving(true);
    const r = await addMedicamento({
      nombre: nombre.trim(), dosis: dosis.trim(), horarios, dias_semana: diasSel,
      color: colorSel, notificar_familiar: notifFamiliar,
      contacto_familiar_id: notifFamiliar && contactos.length > 0 ? contactos[0].id : null,
    });
    setSaving(false);
    if (r.success) {
      setVista("hoy"); setNombre(""); setDosis(""); setHorarios(["08:00"]); setDiasSel([1,2,3,4,5,6,7]);
      cargarTodo();
    } else setError(r.error || "Error al guardar.");
  }

  async function handleEliminar(id) {
    if (!window.confirm("Eliminar este medicamento?")) return;
    await deleteMedicamento(id);
    cargarTodo();
  }

  function addHorario() { setHorarios([...horarios, "12:00"]); }
  function removeHorario(i) { setHorarios(horarios.filter((_, idx) => idx !== i)); }
  function updateHorario(i, val) { const h = [...horarios]; h[i] = val; setHorarios(h); }
  function toggleDia(d) { setDiasSel(diasSel.includes(d) ? diasSel.filter(x => x !== d) : [...diasSel, d].sort()); }

  function getColorObj(key) { return COLORES_MED.find(c => c.key === key) || COLORES_MED[0]; }

  // Calcular calendario semanal
  function getCalendarioSemana() {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const fecha = d.toISOString().split("T")[0];
      const tomasDia = tomasSemana.filter(t => t.fecha === fecha);
      const total = tomasDia.length;
      const tomadas = tomasDia.filter(t => t.tomado).length;
      const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      dias.push({ fecha, dia: dayNames[d.getDay()], total, tomadas, hoy: i === 0 });
    }
    return dias;
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver</button>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs uppercase tracking-[0.18em] text-amber-300">Pastillero virtual</p>
              <h2 className="mt-2 text-2xl font-bold">Mis Medicamentos</h2></div>
            <span className="text-3xl">{"\u{1F48A}"}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Plan: <span className="text-amber-300 font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span> · {meds.length}/{maxMeds === -1 ? "∞" : maxMeds} medicamentos
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          {[{k:"hoy",l:"Hoy"},{k:"semana",l:"Semana"},{k:"agregar",l:"+ Agregar"}].map(tab => (
            <button key={tab.k} onClick={() => setVista(tab.k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${vista === tab.k ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-white/5 text-slate-400 border border-white/10"}`}>
              {tab.l}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-8 text-slate-400">Cargando...</div> : null}

        {/* VISTA HOY */}
        {!loading && vista === "hoy" && (
          <>
            {tomasHoy.length === 0 && meds.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">{"\u{1F48A}"}</div>
                <h3 className="text-lg font-semibold text-slate-100">Sin medicamentos</h3>
                <p className="mt-2 text-sm text-slate-400">Agregá tu primer medicamento.</p>
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
                            <div className="text-sm font-semibold text-slate-100">{t.medicamentos?.nombre || "Medicamento"}</div>
                            <div className="text-xs text-slate-400">{t.medicamentos?.dosis} · {t.horario_programado}hs</div>
                          </div>
                        </div>
                        {t.tomado ? (
                          <span className="text-xs text-emerald-300 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">Tomado {t.tomado_en ? new Date(t.tomado_en).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        ) : (
                          <button onClick={() => handleTome(t.id)} className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shrink-0">Tome</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Medicamentos activos */}
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
                            <span className="text-xs text-slate-400 ml-2">{med.dosis}</span>
                            <div className="text-[11px] text-slate-500">{(med.horarios || []).join(" · ")}hs · {(med.dias_semana || []).map(d => DIAS_SEMANA.find(x => x.num === d)?.short).join(", ")}</div>
                          </div>
                        </div>
                        <button onClick={() => handleEliminar(med.id)} className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-1.5 shrink-0">Eliminar</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* VISTA SEMANA */}
        {!loading && vista === "semana" && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Calendario semanal</h3>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {getCalendarioSemana().map(d => (
                <div key={d.fecha} className={`rounded-xl border p-3 text-center ${d.hoy ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
                  <div className="text-xs text-slate-400 mb-1">{d.dia}</div>
                  <div className="text-lg mb-1">{d.total === 0 ? "\u2796" : d.tomadas === d.total ? "\u2705" : d.tomadas > 0 ? "\u26A0\u{FE0F}" : "\u274C"}</div>
                  <div className="text-[10px] text-slate-500">{d.total > 0 ? `${d.tomadas}/${d.total}` : "-"}</div>
                </div>
              ))}
            </div>
            {tomasSemana.length > 0 && (
              <div className="space-y-2">
                {tomasSemana.map(t => (
                  <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{t.fecha} · {t.horario_programado} · {t.medicamentos?.nombre}</span>
                    <span>{t.tomado ? "\u2705" : "\u274C"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA AGREGAR */}
        {!loading && vista === "agregar" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-bold mb-4">Agregar medicamento</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre del medicamento</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Losartán"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Dosis</label>
                <input type="text" value={dosis} onChange={e => setDosis(e.target.value)} placeholder="Ej: 50mg, 1 comprimido"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50" />
              </div>

              {/* HORARIOS */}
              <div>
                <label className="text-xs text-slate-400 block mb-2">Horarios de toma</label>
                {horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input type="time" value={h} onChange={e => updateHorario(i, e.target.value)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                    {horarios.length > 1 && <button onClick={() => removeHorario(i)} className="text-red-400 text-xs">Quitar</button>}
                  </div>
                ))}
                <button onClick={addHorario} className="text-xs text-amber-300 mt-1">+ Agregar otro horario</button>
              </div>

              {/* DIAS */}
              <div>
                <label className="text-xs text-slate-400 block mb-2">Días de la semana</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(d => (
                    <button key={d.num} onClick={() => toggleDia(d.num)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${diasSel.includes(d.num) ? "border-amber-400/50 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR */}
              <div>
                <label className="text-xs text-slate-400 block mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORES_MED.map(c => (
                    <button key={c.key} onClick={() => setColorSel(c.key)}
                      className={`h-8 w-8 rounded-full ${c.dot} ${colorSel === c.key ? "ring-2 ring-white ring-offset-2 ring-offset-[#07111f]" : "opacity-60"}`} />
                  ))}
                </div>
              </div>

              {/* NOTIF FAMILIAR */}
              <div className="flex items-center gap-3">
                <button onClick={() => setNotifFamiliar(!notifFamiliar)}
                  className={`h-6 w-11 rounded-full shrink-0 ${notifFamiliar ? "bg-amber-500" : "bg-white/20"} relative`}>
                  <div className={`h-5 w-5 rounded-full bg-white absolute top-0.5 transition-all ${notifFamiliar ? "left-5.5" : "left-0.5"}`}
                    style={{ left: notifFamiliar ? "22px" : "2px" }} />
                </button>
                <span className="text-sm text-slate-300">Avisar a familiar si no confirmo en 10 min</span>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {maxMeds > 0 && meds.length >= maxMeds ? (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                  <div className="text-sm font-semibold text-orange-300">Límite alcanzado</div>
                  <p className="mt-1 text-xs text-slate-300">Pasate a Mensual (US$2.99/mes) para más medicamentos.</p>
                </div>
              ) : (
                <button onClick={handleAgregar} disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar medicamento"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONTACTOS SCREEN ───────────────────────
function ContactosScreen({ onBack, userPlan = "gratis" }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista");
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("Madre");
  const [telefono, setTelefono] = useState("");
  const [prefijo, setPrefijo] = useState("54");
  const [saving, setSaving] = useState(false);
  const limites = PLAN_LIMITS[userPlan] || PLAN_LIMITS.gratis;
  const maxContactos = limites.contactos;

  useEffect(() => { cargar(); }, []);
  async function cargar() { setLoading(true); setContactos(await getContactos()); setLoading(false); }

  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  async function handleAgregar() {
    setError("");
    if (!nombre.trim() || !telefono.trim()) { setError("Completá nombre y teléfono."); return; }
    if (contactos.length >= maxContactos) { setError(`Límite de ${maxContactos} contactos. Pasate a Mensual.`); return; }
    setSaving(true);
    const r = await addContacto({ nombre: nombre.trim(), telefono: prefijo + limpiarNumero(telefono), relacion, prioridad: contactos.length + 1 });
    setSaving(false);
    if (r.success) { setVista("lista"); setNombre(""); setTelefono(""); cargar(); }
    else setError(r.error || "Error al guardar.");
  }

  async function handleEliminar(id) { if (!window.confirm("Eliminar?")) return; await deleteContacto(id); cargar(); }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver al panel</button>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Mi red de contención</p>
              <h2 className="mt-2 text-2xl font-bold">Mis Contactos de Confianza</h2></div>
            <span className="text-3xl">{"\u{1F465}"}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Plan: <span className="text-cyan-300 font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span> · {contactos.length}/{maxContactos} contactos.</p>
        </div>
        {vista === "lista" && (
          <>
            {loading ? <div className="text-center py-8 text-slate-400">Cargando...</div>
            : contactos.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">{"\u{1F465}"}</div>
                <h3 className="text-lg font-semibold">Sin contactos</h3>
                <p className="mt-2 text-sm text-slate-400">Agregá al menos 1.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {contactos.map(c => (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-3xl shrink-0">{getRelEmoji(c.relacion)}</div>
                      <div><div className="text-base font-semibold">{c.nombre}</div><div className="text-xs text-cyan-300">{c.relacion}</div><div className="text-xs text-slate-400 mt-1">+{c.telefono}</div></div>
                    </div>
                    <button onClick={() => handleEliminar(c.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 shrink-0">Eliminar</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => contactos.length >= maxContactos ? null : setVista("agregar")} disabled={contactos.length >= maxContactos}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 py-4 font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">+ Agregar contacto</button>
            {contactos.length >= maxContactos && (
              <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                <div className="text-sm font-semibold text-orange-300">Límite alcanzado</div>
                <p className="mt-1 text-xs text-slate-300">Pasate a Mensual (US$2.99/mes) para más contactos.</p>
              </div>
            )}
          </>
        )}
        {vista === "agregar" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <button onClick={() => { setVista("lista"); setError(""); }} className="text-xs text-slate-400 mb-4">← Volver</button>
            <h3 className="text-lg font-bold mb-4">Agregar contacto</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" /></div>
              <div><label className="text-xs text-slate-400 block mb-2">Relación</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RELACIONES.map(r => (
                    <button key={r} onClick={() => setRelacion(r)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${relacion === r ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-300"}`}>
                      {getRelEmoji(r)} {r}
                    </button>))}
                </div></div>
              <div><label className="text-xs text-slate-400 block mb-1">Teléfono</label>
                <PhoneInput value={telefono} onChange={setTelefono} prefix={prefijo} onPrefixChange={setPrefijo} /></div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button onClick={handleAgregar} disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar contacto"}</button>
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
    if (elegidos.length > 0) enviarWhatsApp(elegidos[0].telefono, msg);
    setEnviando(false); setSent(true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="py-4">
              <div className="text-4xl mb-2">{"\u2705"}</div>
              <h3 className="text-lg font-bold" style={{ color: "#d4af37" }}>Alerta enviada</h3>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Tu contacto recibió el WhatsApp.</p>
            </div>

            {/* Respuestas rápidas para seguir comunicando */}
            <div className="rounded-xl p-3" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(212,175,55,0.5)" }}>Respuesta rápida</div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u2705", text: "OK" },
                  { emoji: "\u{1F44D}", text: "Recibí" },
                  { emoji: "\u{1F3C3}", text: "Voy" },
                  { emoji: "\u{1F697}", text: "Salgo" },
                ].map((r, i) => (
                  <button key={i} onClick={() => {
                    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
                    if (elegidos.length > 0) enviarWhatsApp(elegidos[0].telefono, `${r.emoji} ${r.text}`);
                  }}
                    className="rounded-lg py-2 text-center active:scale-95" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)",
                      border: "1px solid rgba(212,175,55,0.08)",
                    }}>
                    <div className="text-xl">{r.emoji}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u{1F3E0}", text: "En casa" },
                  { emoji: "\u23F0", text: "5 min" },
                  { emoji: "\u{1F4CD}", text: "Ubicación" },
                  { emoji: "\u{1F44B}", text: "Llegué" },
                ].map((r, i) => (
                  <button key={i} onClick={() => {
                    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
                    if (elegidos.length > 0) enviarWhatsApp(elegidos[0].telefono, `${r.emoji} ${r.text}`);
                  }}
                    className="rounded-lg py-2 text-center active:scale-95" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)",
                      border: "1px solid rgba(212,175,55,0.08)",
                    }}>
                    <div className="text-xl">{r.emoji}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
                    if (elegidos.length > 0) enviarWhatsApp(elegidos[0].telefono, "\u{1F6A8} AYUDA URGENTE");
                  }}
                  className="rounded-lg py-2 text-center active:scale-95" style={{
                    background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)",
                  }}>
                  <div className="text-xl">{"\u{1F6A8}"}</div>
                  <div className="text-[8px] mt-0.5 text-red-400">AYUDA</div>
                </button>
                <button onClick={() => {
                    const txt = prompt("Escribí tu mensaje:");
                    const elegidos = contactos.filter(c => seleccionados.includes(c.id));
                    if (txt && elegidos.length > 0) enviarWhatsApp(elegidos[0].telefono, txt);
                  }}
                  className="rounded-lg py-2 text-center active:scale-95" style={{
                    background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)",
                  }}>
                  <div className="text-xl">{"\u270D\u{FE0F}"}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>Escribir</div>
                </button>
              </div>
            </div>

            <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-semibold" style={{
              background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
            }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">A quién avisar?</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            {tieneCompletar && (
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">Completá el detalle</label>
                <input type="text" value={detalle} onChange={e => setDetalle(e.target.value)}
                  placeholder="Nombre de la persona o lugar"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
              </div>
            )}
            {contactos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No tenés contactos configurados.</p>
            ) : (
              <>
                <button onClick={() => setSeleccionados(contactos.map(c => c.id))} className="w-full mb-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-300">Seleccionar todos ({contactos.length})</button>
                <div className="space-y-2 mb-4">
                  {contactos.map(c => (
                    <button key={c.id} onClick={() => toggle(c.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${seleccionados.includes(c.id) ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl shrink-0">{getRelEmoji(c.relacion)}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{c.nombre}</div><div className="text-[11px] text-slate-400">{c.relacion} · +{c.telefono}</div></div>
                        <div className={`h-5 w-5 rounded-full border-2 shrink-0 ${seleccionados.includes(c.id) ? "border-cyan-400 bg-cyan-400" : "border-slate-500"}`}>
                          {seleccionados.includes(c.id) && <div className="text-slate-950 text-xs text-center leading-4">{"\u2713"}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={enviar} disabled={enviando || seleccionados.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40">
                  {enviando ? "Enviando..." : `Enviar alerta (${seleccionados.length})`}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── TERCERO REMOTO MODAL (v15 — Daily.co WebRTC) ───────────────────
function CuidadoModal({ onClose, contactos = [] }) {
  const [modo, setModo] = useState(null); // null | cuidador | victima
  const [paso, setPaso] = useState("inicio");
  // Cuidador
  const [contactoSel, setContactoSel] = useState(null);
  const [solicitudes, setSolicitudes] = useState({ ubicacion: false, audio: false, video: false });
  // Daily.co
  const [roomUrl, setRoomUrl] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [creandoSala, setCreandoSala] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const [audioActivo, setAudioActivo] = useState(false);
  const [videoActivo, setVideoActivo] = useState(false);
  const dailyFrameRef = useRef(null);
  const iframeContainerRef = useRef(null);
  // Víctima
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [cuidadorNombre, setCuidadorNombre] = useState("");
  const [permisosActivos, setPermisosActivos] = useState({});

  function toggleSolicitud(key) { setSolicitudes({ ...solicitudes, [key]: !solicitudes[key] }); }

  // Crear sala Daily.co
  async function crearSalaDaily() {
    setCreandoSala(true);
    try {
      const resp = await fetch("/api/daily-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await resp.json();
      if (data.success) {
        setRoomUrl(data.roomUrl);
        setRoomName(data.roomName);
        return data.roomUrl;
      } else {
        alert("Error al crear sala: " + (data.error || "desconocido"));
        return null;
      }
    } catch (e) {
      alert("Error de conexión al crear sala");
      return null;
    } finally {
      setCreandoSala(false);
    }
  }

  // Unirse a la sala con iframe de Daily Prebuilt
  function unirseSala(url) {
    if (!url || !iframeContainerRef.current) return;
    iframeContainerRef.current.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = url + "?showLeaveButton=true&showFullscreenButton=true";
    iframe.style.width = "100%";
    iframe.style.height = "300px";
    iframe.style.borderRadius = "12px";
    iframe.style.border = "1px solid rgba(255,255,255,0.1)";
    iframe.allow = "microphone; camera; autoplay; display-capture";
    iframeContainerRef.current.appendChild(iframe);
    dailyFrameRef.current = iframe;
    setEnVivo(true);
    setAudioActivo(true);
  }

  // Terminar sesión
  function terminarSesion() {
    if (dailyFrameRef.current) {
      dailyFrameRef.current.remove();
      dailyFrameRef.current = null;
    }
    if (roomName) {
      fetch("/api/daily-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", roomName }),
      }).catch(() => {});
    }
    setEnVivo(false);
    setAudioActivo(false);
    setVideoActivo(false);
    setRoomUrl(null);
    setRoomName(null);
    onClose();
  }

  // CUIDADOR envía solicitudes + crea sala DIRECTAMENTE
  async function enviarSolicitudes() {
    if (!contactoSel) return;
    const items = [];
    if (solicitudes.ubicacion) items.push("Ver tu ubicacion en tiempo real");
    if (solicitudes.audio) items.push("Escuchar tu entorno (audio en vivo)");
    if (solicitudes.video) items.push("Ver tu camara (video en vivo) [Premium]");
    if (items.length === 0) { alert("Selecciona al menos 1 solicitud."); return; }

    // Crear sala Daily.co
    const salaUrl = await crearSalaDaily();
    if (!salaUrl) return;

    const msg = `TRAZA 360 - TE VIGILO ACTIVADO\n\nEstoy cuidandote. Abri este link para conectar audio/video en vivo:\n\n${salaUrl}\n\nSi no queres ser vigilado/a, ignora este mensaje.\n\nApp: https://traza-360-web.vercel.app`;
    enviarWhatsApp(contactoSel.telefono, msg);
    setPaso("panel_cuidador");
    // Cuidador se une automáticamente
    setTimeout(() => unirseSala(salaUrl), 500);
  }

  // VÍCTIMA simula recibir solicitudes
  function simularRecepcion() {
    setCuidadorNombre("Cuidador");
    setSolicitudesRecibidas([
      { key: "ubicacion", icon: "\u{1F4CD}", texto: "quiere ver tu ubicación", estado: null },
      { key: "audio", icon: "\u{1F3A7}", texto: "quiere escuchar tu entorno", estado: null },
      { key: "video", icon: "\u{1F4F9}", texto: "quiere ver tu cámara (Premium)", estado: null },
    ]);
    setPaso("solicitudes");
  }

  function responderSolicitud(key, aceptar) {
    setSolicitudesRecibidas(prev => prev.map(s => s.key === key ? { ...s, estado: aceptar ? "aceptado" : "rechazado" } : s));
    if (aceptar) setPermisosActivos(prev => ({ ...prev, [key]: true }));
  }

  async function confirmarPermisos() {
    const aceptados = solicitudesRecibidas.filter(s => s.estado === "aceptado").map(s => s.key);
    if (aceptados.length > 0) {
      // Crear sala para víctima si no existe
      let url = roomUrl;
      if (!url) {
        url = await crearSalaDaily();
      }
      if (contactos.length > 0) {
        const textos = [];
        if (aceptados.includes("ubicacion")) textos.push("Ver mi ubicacion");
        if (aceptados.includes("audio")) textos.push("Escuchar mi entorno");
        if (aceptados.includes("video")) textos.push("Ver mi camara");
        enviarWhatsApp(contactos[0].telefono, `TRAZA 360 - Acepte que me cuides.\n\nPermisos:\n${textos.map(t => "- " + t).join("\n")}\n\nSala segura: ${url || "Abri la app"}\n\nEstoy protegido/a.`);
      }
      if (url) setTimeout(() => unirseSala(url), 500);
    }
    setPaso("cuidado_activo");
  }

  function handleEstoyBien() {
    if (contactos.length > 0) enviarWhatsApp(contactos[0].telefono, "Estoy bien. Todo en orden.");
  }

  function handleAyuda() {
    if (contactos.length > 0) {
      getCurrentLocationWithFallback().then(({ location }) => {
        enviarWhatsApp(contactos[0].telefono, buildMessageWithReply("AYUDA URGENTE - Necesito ayuda ahora.", location));
      });
    }
  }

  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{"\u{1FAC2}"} Te vigilo</h3>
          <button onClick={terminarSesion} className="text-slate-400 hover:text-white text-2xl">{"\u00D7"}</button>
        </div>

        {/* ELEGIR MODO - Solo Te cuido */}
        {!modo && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-3">Activá vigilancia sobre tu contacto.</p>
            <button onClick={() => { setModo("cuidador"); setPaso("elegir_contacto"); }}
              className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-4 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\u{1F441}\u{FE0F}"}</span>
                <div><div className="text-sm font-semibold text-cyan-300">Te cuido</div>
                  <div className="text-[11px] text-slate-400">Rastreá, escuchá o mirá a tu contacto en vivo.</div></div>
              </div>
            </button>
          </div>
        )}

        {/* CUIDADOR: ELEGIR CONTACTO */}
        {modo === "cuidador" && paso === "elegir_contacto" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">A quién querés cuidar?</p>
            {contactos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Primero agregá contactos de confianza.</p>
            ) : (
              <>
                {contactos.map(c => (
                  <button key={c.id} onClick={() => { setContactoSel(c); setPaso("solicitudes_cuidador"); }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRelEmoji(c.relacion)}</span>
                      <div><div className="text-sm font-semibold text-slate-100">{c.nombre}</div>
                        <div className="text-[11px] text-slate-400">{c.relacion} · +{c.telefono}</div></div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* CUIDADOR: ELEGIR QUÉ SOLICITAR */}
        {modo === "cuidador" && paso === "solicitudes_cuidador" && contactoSel && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">Qué activás para {contactoSel.nombre}?</p>

            <button onClick={() => toggleSolicitud("ubicacion")}
              className={`w-full rounded-xl border px-4 py-3 text-left ${solicitudes.ubicacion ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl"><MapPin size={20} /></span>
                <div className="flex-1"><div className="text-sm font-semibold text-slate-100">Te rastreo?</div><div className="text-[11px] text-slate-400">Ver su ubicación en tiempo real</div></div>
                <div className={`h-5 w-5 rounded-full border-2 ${solicitudes.ubicacion ? "border-cyan-400 bg-cyan-400" : "border-slate-500"}`}>
                  {solicitudes.ubicacion && <div className="text-slate-950 text-xs text-center leading-4">{"\u2713"}</div>}
                </div>
              </div>
            </button>

            <button onClick={() => toggleSolicitud("audio")}
              className={`w-full rounded-xl border px-4 py-3 text-left ${solicitudes.audio ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{"\u{1F3A7}"}</span>
                <div className="flex-1"><div className="text-sm font-semibold text-slate-100">Te escucho?</div><div className="text-[11px] text-slate-400">Escuchar su entorno en vivo</div></div>
                <div className={`h-5 w-5 rounded-full border-2 ${solicitudes.audio ? "border-cyan-400 bg-cyan-400" : "border-slate-500"}`}>
                  {solicitudes.audio && <div className="text-slate-950 text-xs text-center leading-4">{"\u2713"}</div>}
                </div>
              </div>
            </button>

            <button onClick={() => toggleSolicitud("video")}
              className={`w-full rounded-xl border px-4 py-3 text-left ${solicitudes.video ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{"\u{1F4F9}"}</span>
                <div className="flex-1"><div className="text-sm font-semibold text-slate-100">Te veo?</div><div className="text-[11px] text-amber-300">Ver su cámara · Premium</div></div>
                <div className={`h-5 w-5 rounded-full border-2 ${solicitudes.video ? "border-amber-400 bg-amber-400" : "border-slate-500"}`}>
                  {solicitudes.video && <div className="text-slate-950 text-xs text-center leading-4">{"\u2713"}</div>}
                </div>
              </div>
            </button>

            <button onClick={enviarSolicitudes}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg">
              Enviar solicitud a {contactoSel.nombre}
            </button>
          </div>
        )}

        {/* CUIDADOR: PANEL EN VIVO (Daily.co) */}
        {modo === "cuidador" && paso === "panel_cuidador" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
              <div className="text-sm font-semibold text-emerald-300">
                {enVivo ? `${"\u{1F7E2}"} EN VIVO — Cuidando a ${contactoSel?.nombre}` : `${"\u{1F4E9}"} Esperando que ${contactoSel?.nombre} se una...`}
              </div>
              {roomUrl && <div className="text-[10px] text-slate-500 mt-1 break-all">Sala: {roomUrl}</div>}
            </div>

            {/* Panel de audio/video Daily.co */}
            <div ref={iframeContainerRef} className="rounded-xl overflow-hidden">
              {!enVivo && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <div className="text-3xl mb-2 animate-pulse">{"\u{1F4E1}"}</div>
                  <div className="text-sm text-slate-400">{creandoSala ? "Creando sala segura..." : "Sala creada. Esperando conexión..."}</div>
                  <div className="text-[10px] text-slate-500 mt-2">El link fue enviado por WhatsApp a {contactoSel?.nombre}</div>
                </div>
              )}
            </div>

            {/* Controles del cuidador */}
            {enVivo && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAudioActivo(!audioActivo)}
                  className={`rounded-xl py-3 text-center border ${audioActivo ? "bg-emerald-500/20 border-emerald-500/30" : "bg-red-500/20 border-red-500/30"}`}>
                  <div className="text-lg">{audioActivo ? "\u{1F3A7}" : "\u{1F507}"}</div>
                  <div className={`text-[10px] mt-1 ${audioActivo ? "text-emerald-300" : "text-red-300"}`}>{audioActivo ? "Audio ON" : "Audio OFF"}</div>
                </button>
                <button onClick={() => setVideoActivo(!videoActivo)}
                  className={`rounded-xl py-3 text-center border ${videoActivo ? "bg-emerald-500/20 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
                  <div className="text-lg">{videoActivo ? "\u{1F4F9}" : "\u{1F4F7}"}</div>
                  <div className={`text-[10px] mt-1 ${videoActivo ? "text-emerald-300" : "text-slate-400"}`}>{videoActivo ? "Video ON" : "Video OFF"}</div>
                </button>
              </div>
            )}

            <button onClick={terminarSesion}
              className="w-full rounded-xl bg-red-500/20 border border-red-500/30 py-3 text-sm font-semibold text-red-300">
              {"\u23F9\u{FE0F}"} Terminar sesión
            </button>
          </div>
        )}

        {/* VÍCTIMA: VER SOLICITUDES */}
        {modo === "victima" && paso === "solicitudes" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 mb-3">
              <div className="text-sm font-semibold text-cyan-300 text-center">Alguien quiere cuidarte</div>
              <div className="text-[11px] text-slate-400 text-center mt-1">Aceptá o rechazá cada permiso</div>
            </div>

            {solicitudesRecibidas.map(s => (
              <div key={s.key} className={`rounded-xl border p-4 ${s.estado === "aceptado" ? "border-emerald-500/40 bg-emerald-500/10" : s.estado === "rechazado" ? "border-red-500/30 bg-red-500/5 opacity-50" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex-1 text-sm text-slate-200">{s.texto}</div>
                </div>
                {s.estado === null ? (
                  <div className="flex gap-2">
                    <button onClick={() => responderSolicitud(s.key, true)}
                      className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 py-2 text-xs font-semibold text-emerald-300">Permitir</button>
                    <button onClick={() => responderSolicitud(s.key, false)}
                      className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 py-2 text-xs font-semibold text-red-300">Rechazar</button>
                  </div>
                ) : (
                  <div className={`text-xs font-semibold text-center ${s.estado === "aceptado" ? "text-emerald-300" : "text-red-300"}`}>
                    {s.estado === "aceptado" ? "Permitido" : "Rechazado"}
                  </div>
                )}
              </div>
            ))}

            {solicitudesRecibidas.every(s => s.estado !== null) && (
              <button onClick={confirmarPermisos}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">
                Confirmar y activar cuidado
              </button>
            )}
          </div>
        )}

        {/* VÍCTIMA: CUIDADO ACTIVO CON AUDIO/VIDEO */}
        {paso === "cuidado_activo" && (
          <div className="text-center space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="text-2xl mb-2">{"\u{1FAC2}"}</div>
              <div className="text-sm font-semibold text-emerald-300">Te están cuidando</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {permisosActivos.ubicacion && <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-300">{"\u{1F4CD}"} Ubicación</span>}
                {permisosActivos.audio && <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300">{"\u{1F3A7}"} Audio EN VIVO</span>}
                {permisosActivos.video && <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-[11px] text-cyan-300">{"\u{1F4F9}"} Video EN VIVO</span>}
              </div>
            </div>

            {/* Daily.co iframe para víctima */}
            <div ref={iframeContainerRef} className="rounded-xl overflow-hidden" />

            {(permisosActivos.audio || permisosActivos.video) && !enVivo && roomUrl && (
              <button onClick={() => unirseSala(roomUrl)}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">
                {"\u{1F3A7}"} Conectar audio/video en vivo
              </button>
            )}

            {/* Respuestas rápidas con emojis */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #13131d, #0e0e16)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(212,175,55,0.5)" }}>Respuesta rápida</div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u2705", text: "OK" },
                  { emoji: "\u{1F44D}", text: "Recibí" },
                  { emoji: "\u{1F3C3}", text: "Voy" },
                  { emoji: "\u{1F697}", text: "Salgo" },
                ].map((r, i) => (
                  <button key={i} onClick={() => { if (contactos.length > 0) enviarWhatsApp(contactos[0].telefono, `${r.emoji} ${r.text}`); }}
                    className="rounded-xl py-3 text-center active:scale-95 transition-all" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)",
                      border: "1px solid rgba(212,175,55,0.08)",
                      boxShadow: "3px 3px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(212,175,55,0.01)",
                    }}>
                    <div className="text-2xl">{r.emoji}</div>
                    <div className="text-[9px] mt-1" style={{ color: "rgba(212,175,55,0.5)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u{1F3E0}", text: "En casa" },
                  { emoji: "\u23F0", text: "5 min" },
                  { emoji: "\u{1F4CD}", text: "Ubicación" },
                  { emoji: "\u{1F44B}", text: "Llegué" },
                ].map((r, i) => (
                  <button key={i} onClick={() => { if (contactos.length > 0) enviarWhatsApp(contactos[0].telefono, `${r.emoji} ${r.text}`); }}
                    className="rounded-xl py-3 text-center active:scale-95 transition-all" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)",
                      border: "1px solid rgba(212,175,55,0.08)",
                      boxShadow: "3px 3px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(212,175,55,0.01)",
                    }}>
                    <div className="text-2xl">{r.emoji}</div>
                    <div className="text-[9px] mt-1" style={{ color: "rgba(212,175,55,0.5)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { if (contactos.length > 0) enviarWhatsApp(contactos[0].telefono, "\u{1F6A8} AYUDA URGENTE"); }}
                  className="rounded-xl py-3 text-center active:scale-95 transition-all" style={{
                    background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)",
                  }}>
                  <div className="text-2xl">{"\u{1F6A8}"}</div>
                  <div className="text-[9px] mt-1 text-red-400">AYUDA</div>
                </button>
                <button onClick={() => { setShowGrabacion && setShowGrabacion(true); }}
                  className="rounded-xl py-3 text-center active:scale-95 transition-all" style={{
                    background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                  }}>
                  <div className="text-2xl">{"\u{1F399}\u{FE0F}"}</div>
                  <div className="text-[9px] mt-1" style={{ color: "#d4af37" }}>Audio</div>
                </button>
                <button onClick={() => {
                    const txt = prompt("Escribí tu mensaje:");
                    if (txt && contactos.length > 0) enviarWhatsApp(contactos[0].telefono, txt);
                  }}
                  className="rounded-xl py-3 text-center active:scale-95 transition-all" style={{
                    background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)",
                  }}>
                  <div className="text-2xl">{"\u270D\u{FE0F}"}</div>
                  <div className="text-[9px] mt-1" style={{ color: "rgba(212,175,55,0.5)" }}>Escribir</div>
                </button>
              </div>
            </div>

            <button onClick={terminarSesion}
              className="w-full rounded-xl py-3 text-sm font-semibold" style={{
                background: "linear-gradient(145deg, #16161f, #0c0c12)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
              }}>
              {"\u23F9\u{FE0F}"} Terminar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MÓDULOS ────────────────────────────────
const MODULES = [
  { key: "violencia", emoji: "\u{1F6E1}\u{FE0F}", title: "Violencia de género", desc: "Alerta silenciosa, ubicación y red de apoyo.",
    color: "from-fuchsia-500 to-rose-500", border: "border-fuchsia-500/20", accentBg: "bg-fuchsia-500/10", accentBorder: "border-fuchsia-500/30", accentText: "text-fuchsia-300",
    actions: [
      { key: "panico", icon: "\u{1F6A8}", name: "Botón de pánico", desc: "Alerta inmediata + ubicación.", type: "alert_contacts", message: "ALERTA - Botón de pánico activado. Necesito ayuda urgente." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío mi ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación en vivo." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis Evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "entro", icon: "\u{1F3D8}\u{FE0F}", name: "Entro a la casa de...", desc: "Aviso con ubicación.", type: "alert_contacts", message: "Entro a la casa de [completar]." },
      { key: "reuno", icon: "\u{1F465}", name: "Me reúno con...", desc: "Aviso.", type: "alert_contacts", message: "Me reúno con [completar]." },
      { key: "lugar_desc", icon: "\u23F1\u{FE0F}", name: "Entro a lugar desconocido", desc: "Timer: si no avisás, se alerta.", type: "timer_lugar" },
      { key: "uber", icon: "\u{1F697}", name: "Llamar transporte", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", icon: "\u{1F696}", name: "Llamar taxi de confianza", desc: "Llama a tu taxi preestablecido.", type: "taxi" },
    ]},
  { key: "adolescente", emoji: "\u{1F9D1}\u200D\u{1F393}", title: "Adolescente seguro", desc: "Salidas, regresos y protección anti-bullying.",
    color: "from-sky-400 to-cyan-500", border: "border-sky-500/20", accentBg: "bg-sky-500/10", accentBorder: "border-sky-500/30", accentText: "text-sky-300",
    actions: [
      { key: "peligro", icon: "\u{1F6A8}", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata.", type: "alert_contacts", message: "SOS - Estoy en peligro." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "cole", icon: "\u{1F3EB}", name: "Buscame por el cole", desc: "Aviso silencioso.", type: "alert_contacts", message: "URGENTE - Necesito que me busquen por el colegio." },
      { key: "bullying", icon: "\u{1F399}\u{FE0F}", name: "Bullying - Grabar evidencia", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis Evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "sali", icon: "\u{1F6B6}", name: "Salí de casa, voy a lo de...", desc: "Aviso.", type: "alert_contacts", message: "Salí de casa. Voy a lo de [completar]." },
      { key: "lugar_desc", icon: "\u23F1\u{FE0F}", name: "Entro a lugar desconocido", desc: "Timer: si no avisás, se alerta.", type: "timer_lugar" },
      { key: "maps", icon: "\u{1F5FA}\u{FE0F}", name: "Llegar a casa (GPS)", desc: "Abre Maps.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue", icon: "\u2705", name: "Llegué bien", desc: "Confirmación.", type: "alert_contacts", message: "Llegué bien." },
      { key: "perdido", icon: "\u{1F4CD}", name: "Estoy perdido", desc: "Envía ubicación.", type: "alert_contacts", message: "Estoy perdido." },
      { key: "uber", icon: "\u{1F697}", name: "Llamar transporte", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", icon: "\u{1F696}", name: "Llamar taxi de confianza", desc: "Llama a tu taxi preestablecido.", type: "taxi" },
    ]},
  { key: "adulto_mayor", emoji: "\u{1FAF6}", title: "Adulto mayor seguro", desc: "Seguimiento, medicamentos y asistencia.",
    color: "from-amber-400 to-orange-500", border: "border-amber-500/20", accentBg: "bg-amber-500/10", accentBorder: "border-amber-500/30", accentText: "text-amber-300",
    actions: [
      { key: "cai", icon: "\u{1F198}", name: "Me caí", desc: "Alerta inmediata.", type: "alert_contacts", message: "ALERTA - Me caí." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "pastillero", icon: "\u{1F48A}", name: "Mis Medicamentos", desc: "Pastillero virtual con alarmas.", type: "pastillero" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis Evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "medicacion", icon: "\u2705", name: "Tomé la medicación", desc: "Confirmación.", type: "alert_contacts", message: "Tomé la medicación del horario." },
      { key: "familiar", icon: "\u{1F4DE}", name: "Llamar a familiar", desc: "Contactar.", type: "alert_contacts", message: "Necesito hablar con mi familiar." },
      { key: "perdi", icon: "\u{1F4CD}", name: "Me perdí", desc: "Envía ubicación.", type: "alert_contacts", message: "Me perdí." },
      { key: "mal", icon: "\u{1F494}", name: "No me siento bien", desc: "Aviso.", type: "alert_contacts", message: "No me siento bien." },
      { key: "casa", icon: "\u{1F3E0}", name: "Llegar a casa", desc: "Abre GPS con tu dirección.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "ambulancia", icon: "\u{1F691}", name: "Llamar ambulancia", desc: "Emergencia médica.", type: "ambulancia" },
    ]},
  { key: "hogar", emoji: "\u{1F3E0}", title: "Hogar seguro", desc: "Intrusos, vecinos y emergencias.",
    color: "from-violet-500 to-purple-500", border: "border-violet-500/20", accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/30", accentText: "text-violet-300",
    actions: [
      { key: "intruso", icon: "\u{1F6A8}", name: "Intruso en domicilio", desc: "Alerta inmediata.", type: "alert_contacts", message: "ALERTA - Posible intruso." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "maps_casa", icon: "\u{1F5FA}\u{FE0F}", name: "Llegar a casa (GPS)", desc: "Abre Google Maps.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "camaras", icon: "\u{1F4F9}", name: "Ver mis cámaras", desc: "Abre tu app de cámaras.", type: "camaras" },
      { key: "ruido", icon: "\u{1F442}", name: "Ruido sospechoso", desc: "Aviso preventivo.", type: "alert_contacts", message: "Ruido sospechoso en mi domicilio." },
      { key: "accidente", icon: "\u{1FA79}", name: "Accidente doméstico", desc: "Aviso.", type: "alert_contacts", message: "ALERTA - Accidente doméstico." },
      { key: "emergencia", icon: "\u{1F198}", name: "Emergencia en el hogar", desc: "Alerta máxima.", type: "alert_contacts", message: "EMERGENCIA en el hogar." },
    ]},
  { key: "trabajo", emoji: "\u{1F303}", title: "Trabajo de riesgo", desc: "Protección en áreas peligrosas.",
    color: "from-pink-500 to-purple-500", border: "border-[rgba(212,175,55,0.25)]", accentBg: "bg-[rgba(212,175,55,0.1)]", accentBorder: "border-[rgba(212,175,55,0.3)]", accentText: "text-[#d4af37]",
    actions: [
      { key: "peligro", icon: "\u{1F6A8}", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata.", type: "alert_contacts", message: "SOS - En peligro durante mi trabajo." },
      { key: "sospechoso_lugar", icon: "\u26A0\u{FE0F}", name: "Entro a lugar sospechoso", desc: "Envía ubicación en tiempo real.", type: "timer_lugar", message: "Estoy entrando a un lugar sospechoso." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis Evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "desconocido", icon: "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", name: "Salgo con desconocido/a", desc: "Nombre o lugar del encuentro.", type: "alert_contacts", message: "Salgo con desconocido/a: [completar]." },
      { key: "sospechoso", icon: "\u{1F440}", name: "Cliente sospechoso", desc: "Envía ubicación actual + aviso.", type: "alert_contacts", message: "ALERTA - Cliente con actitud sospechosa. Estoy en esta ubicación." },
      { key: "uber", icon: "\u{1F697}", name: "Llamar transporte", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "taxi", icon: "\u{1F696}", name: "Llamar taxi de confianza", desc: "Llama a tu taxi preestablecido.", type: "taxi" },
      { key: "llegue", icon: "\u2705", name: "Llegué bien", desc: "Confirmación.", type: "alert_contacts", message: "Terminé mi trabajo y estoy bien." },
    ]},
];

// ─── MODULE CARD ────────────────────────────
function ModuleCard({ m, autoExpand = false, contactos = [], onOpenPastillero, onOpenEvidencias }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showGrabacion, setShowGrabacion] = useState(false);
  const [showTimerLugar, setShowTimerLugar] = useState(false);

  function handleAction(action) {
    switch (action.type) {
      case "alert_contacts":
        if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza."); return; }
        setCurrentMessage(action.message); setSelectorOpen(true); return;
      case "record_audio": setShowGrabacion(true); return;
      case "maps": openMapsTo(action.destination); return;
      case "uber": openUber(action.destination); return;
      case "pastillero": if (onOpenPastillero) onOpenPastillero(); return;
      case "evidencias": if (onOpenEvidencias) onOpenEvidencias(); return;
      case "timer_lugar":
        if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza."); return; }
        setShowTimerLugar(true); return;
      case "camaras":
        alert("Abrí la app de tus cámaras de seguridad (Ej: Ring, Xiaomi Home, TP-Link Tapo, Alfred). Próximamente integración directa.");
        return;
      case "taxi": {
        const taxiNum = sessionStorage.getItem("traza360_taxi") || "";
        if (!taxiNum) {
          const num = prompt("Configurá tu número de taxi de confianza (con código de área, ej: 3515551234):");
          if (num && num.trim()) {
            sessionStorage.setItem("traza360_taxi", num.trim());
            window.open(`tel:${num.trim()}`);
          }
        } else {
          window.open(`tel:${taxiNum}`);
        }
        return;
      }
      case "ambulancia": {
        const ambNum = sessionStorage.getItem("traza360_ambulancia") || "107";
        const opciones = prompt(`Llamar ambulancia al ${ambNum}?\n\nSi querés cambiar el número, escribilo.\nPor defecto: 107 (SAME Argentina)\nOtras opciones: 911, número privado.\n\nDejá vacío para llamar al ${ambNum}:`);
        const numFinal = (opciones && opciones.trim()) ? opciones.trim() : ambNum;
        if (numFinal !== ambNum) sessionStorage.setItem("traza360_ambulancia", numFinal);
        window.open(`tel:${numFinal}`);
        if (contactos.length > 0) {
          getCurrentLocationWithFallback().then(({ location }) => {
            enviarWhatsApp(contactos[0].telefono, buildMessageWithReply("EMERGENCIA MEDICA - Llamé a la ambulancia. Necesito ayuda.", location));
          });
        }
        return;
      }
      default: return;
    }
  }

  return (
    <>
      <div className={`rounded-2xl border p-5 flex flex-col`} style={{
        background: "linear-gradient(145deg, #12121a, #0c0c12)",
        border: "1px solid rgba(212,175,55,0.1)",
        boxShadow: "6px 6px 18px rgba(0,0,0,0.5), -3px -3px 10px rgba(212,175,55,0.01), inset 0 1px 0 rgba(212,175,55,0.04)",
      }}>
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}><span className="text-2xl">{m.emoji}</span></div>
          <h4 className="text-base font-bold" style={{ color: "#d4af37" }}>{m.title}</h4>
        </div>
        <p className="mb-4 text-sm text-slate-400">{m.desc}</p>
        <button onClick={() => setExpanded(!expanded)}
          className={`w-full rounded-2xl border ${m.accentBorder} ${m.accentBg} ${m.accentText} px-4 py-3 text-sm font-semibold flex items-center justify-between`}>
          <span>{expanded ? "Ocultar" : "Ver opciones"}</span><span className={`text-xs ${expanded ? "rotate-180" : ""}`}>{"\u25BC"}</span>
        </button>
        {expanded && (
          <div className="mt-4 space-y-2">
            {m.actions.map(a => (
              <button key={a.key} onClick={() => handleAction(a)}
                className="w-full rounded-xl px-4 py-3 text-left active:scale-[0.98]" style={{
                  background: "linear-gradient(145deg, #16161f, #0c0c12)",
                  border: "1px solid rgba(212,175,55,0.06)",
                  boxShadow: "3px 3px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(212,175,55,0.01)",
                }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{a.icon}</span>
                  <div><div className="text-sm font-semibold text-white">{a.name}</div><div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{a.desc}</div></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectorOpen && <SelectorContactoModal contactos={contactos} mensaje={currentMessage} onClose={() => setSelectorOpen(false)} />}
      {showGrabacion && <GrabacionModal onClose={() => setShowGrabacion(false)} />}
      {showTimerLugar && <TimerLugarModal contactos={contactos} onClose={() => setShowTimerLugar(false)} />}
    </>
  );
}

// ─── AUTH SCREENS ────────────────────────────
function Field({ label, type = "text", placeholder, value, onChange }) {
  return (<label className="block space-y-2 text-left"><span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(212,175,55,0.6)" }}>{label}</span>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" style={{ background: "linear-gradient(145deg, #121218, #0a0a0e)", border: "1px solid rgba(212,175,55,0.1)", boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(212,175,55,0.02)" }} /></label>);
}

function AccessCard({ children }) { return <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl md:p-8" style={{ background: "linear-gradient(145deg, #13131d, #0a0a12)", border: "1px solid rgba(212,175,55,0.1)", boxShadow: "8px 8px 24px rgba(0,0,0,0.6), -4px -4px 12px rgba(212,175,55,0.01)" }}>{children}</div>; }

function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function handle() {
    setError(""); if (!email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    setLoading(true); const r = await signIn(email.trim(), password); setLoading(false);
    if (r.success) onSuccess(); else setError(r.error.includes("Invalid") ? "Email o contraseña incorrectos." : r.error);
  }
  return (<div className="flex min-h-screen items-center justify-center px-5 py-8 text-white" style={{ background: "linear-gradient(180deg, #050508 0%, #0a0a14 100%)" }}><AccessCard>
    <button onClick={onBack} className="text-sm font-semibold" style={{ color: "#d4af37" }}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold text-white">Ingresar</h2>
    <div className="mt-6 space-y-4">
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button onClick={handle} disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-black shadow-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg, #d4af37, #f5e6a3, #d4af37)", boxShadow: "0 6px 20px rgba(212,175,55,0.25)" }}>{loading ? "Ingresando..." : "Ingresar"}</button>
    </div></AccessCard></div>);
}

function RegisterScreen({ onBack, onSuccess, setPendingName }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function handle() {
    setError(""); if (!name.trim() || !email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    if (password.length < 6) { setError("Contraseña mínimo 6 caracteres."); return; }
    setLoading(true); try { sessionStorage.setItem("traza360_pending_name", name.trim()); } catch(e){} setPendingName(name.trim());
    const r = await signUp(email.trim(), password, name.trim()); setLoading(false);
    if (r.success) onSuccess(); else setError(r.error.includes("already") ? "Email ya registrado." : r.error);
  }
  return (<div className="flex min-h-screen items-center justify-center px-5 py-8 text-white" style={{ background: "linear-gradient(180deg, #050508 0%, #0a0a14 100%)" }}><AccessCard>
    <button onClick={onBack} className="text-sm font-semibold" style={{ color: "#d4af37" }}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold text-white">Crear cuenta</h2>
    <div className="mt-6 space-y-4">
      <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={e => setName(e.target.value)} />
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button onClick={handle} disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-black shadow-lg disabled:opacity-50" style={{ background: "linear-gradient(135deg, #d4af37, #f5e6a3, #d4af37)", boxShadow: "0 6px 20px rgba(212,175,55,0.25)" }}>{loading ? "Creando..." : "Crear cuenta"}</button>
    </div></AccessCard></div>);
}

// ─── EAGLE EYE LOGO ─────────────────────────
function EagleEyeLogo({ size = 80 }) {
  return (
    <div style={{ display: "inline-block" }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#d4af37"/><stop offset="50%" stopColor="#f5e6a3"/><stop offset="100%" stopColor="#d4af37"/></linearGradient>
          <linearGradient id="shieldDark" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a2e"/><stop offset="100%" stopColor="#0a0a14"/></linearGradient>
          <linearGradient id="eyeGlow" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#d4af37"/><stop offset="100%" stopColor="#b8860b"/></linearGradient>
          <filter id="goldGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
        </defs>
        <path d="M100 10 L185 50 L185 110 C185 155 145 185 100 195 C55 185 15 155 15 110 L15 50 Z" fill="url(#shieldDark)" stroke="url(#shieldGold)" strokeWidth="3"/>
        <path d="M100 22 L175 57 L175 112 C175 150 140 177 100 186 C60 177 25 150 25 112 L25 57 Z" fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth="1"/>
        <ellipse cx="100" cy="105" rx="52" ry="32" fill="none" stroke="url(#eyeGlow)" strokeWidth="2.5" filter="url(#goldGlow)"/>
        <path d="M52 105 Q76 78 100 78 Q124 78 148 105 Q124 132 100 132 Q76 132 52 105 Z" fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.4)" strokeWidth="1"/>
        <circle cx="100" cy="105" r="20" fill="url(#eyeGlow)" opacity="0.9"/>
        <circle cx="100" cy="105" r="10" fill="#0a0a14"/>
        <circle cx="106" cy="99" r="4" fill="rgba(245,230,163,0.7)"/>
        <circle cx="94" cy="109" r="2" fill="rgba(245,230,163,0.4)"/>
        <path d="M48 90 Q74 65 100 68" fill="none" stroke="url(#eyeGlow)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M152 90 Q126 65 100 68" fill="none" stroke="url(#eyeGlow)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M38 100 L28 92" stroke="rgba(212,175,55,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M40 108 L28 108" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M162 100 L172 92" stroke="rgba(212,175,55,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M160 108 L172 108" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
        <polygon points="100,28 103,36 111,36 105,41 107,49 100,45 93,49 95,41 89,36 97,36" fill="#d4af37" opacity="0.9"/>
        <polygon points="60,48 62,52 66,52 63,55 64,59 60,57 56,59 57,55 54,52 58,52" fill="#d4af37" opacity="0.5"/>
        <polygon points="140,48 142,52 146,52 143,55 144,59 140,57 136,59 137,55 134,52 138,52" fill="#d4af37" opacity="0.5"/>
        <text x="100" y="165" textAnchor="middle" fill="#d4af37" fontSize="11" fontWeight="800" letterSpacing="4" fontFamily="sans-serif">TRAZA 360</text>
        <text x="100" y="178" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="7" letterSpacing="2" fontFamily="sans-serif">PROTECCIÓN</text>
      </svg>
    </div>
  );
}

// ─── MAP PIN (estilo Google Maps) ────────────
function MapPin({ size = 24 }) {
  return (
    <svg viewBox="0 0 24 36" width={size} height={size * 1.5} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <defs>
        <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EA4335"/>
          <stop offset="100%" stopColor="#C5221F"/>
        </linearGradient>
        <filter id="pinShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3"/>
        </filter>
      </defs>
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="url(#pinGrad)" filter="url(#pinShadow)"/>
      <circle cx="12" cy="11" r="5" fill="white"/>
      <circle cx="12" cy="11" r="2.5" fill="#EA4335"/>
    </svg>
  );
}
function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #050508 0%, #0a0a14 50%, #050508 100%)" }}>
      <section className="px-5 pt-16 pb-12 text-center">
        <div className="mb-4 flex justify-center">
          <EagleEyeLogo size={100} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[5px]" style={{ color: "rgba(212,175,55,0.4)" }}>Última señal. Respuesta real.</p>
        <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-tight md:text-4xl mx-auto text-white">
          Cuando cada segundo importa,<br/><span style={{ background: "linear-gradient(135deg, #d4af37, #f5e6a3, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> Traza 360 responde.</span>
        </h2>
      </section>
      <div className="px-5 pb-12"><div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <button onClick={() => onScreen("login")} className="w-full rounded-2xl px-4 py-4 font-semibold text-black shadow-lg" style={{
          background: "linear-gradient(135deg, #d4af37, #f5e6a3, #d4af37)",
          boxShadow: "0 8px 30px rgba(212,175,55,0.25)",
        }}>Ingresar</button>
        <button onClick={() => onScreen("register")} className="w-full rounded-2xl px-4 py-4 font-semibold text-white" style={{
          background: "linear-gradient(145deg, #13131d, #0e0e16)",
          border: "1px solid rgba(212,175,55,0.15)",
          boxShadow: "5px 5px 14px rgba(0,0,0,0.5), -3px -3px 10px rgba(212,175,55,0.01)",
        }}>Crear cuenta</button>
      </div></div>
      <WhatsAppFloatingButton />
    </div>
  );
}

// ─── HOME SCREEN ────────────────────────────
function HomeScreen({ userProfile, authUser, pendingName, onLogout }) {
  const [activeScreen, setActiveScreen] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [showTerceroModal, setShowTerceroModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [contactos, setContactos] = useState([]);

  const nombreUsuario = userProfile?.nombre || pendingName || sessionStorage.getItem("traza360_pending_name") || authUser?.email?.split("@")[0] || "Usuario";
  const userPlan = userProfile?.plan || "gratis";

  useEffect(() => { cargarContactos(); }, []);
  async function cargarContactos() { setContactos(await getContactos()); }

  async function handleLogout() {
    setLoggingOut(true); try { sessionStorage.removeItem("traza360_pending_name"); } catch(e){} await signOut(); setLoggingOut(false); onLogout();
  }

  if (activeScreen === "contactos") return <ContactosScreen onBack={() => { setActiveScreen("home"); cargarContactos(); }} userPlan={userPlan} />;
  if (activeScreen === "pastillero") return <PastilleroScreen onBack={() => setActiveScreen("home")} userPlan={userPlan} contactos={contactos} />;
  if (activeScreen === "evidencias") return <EvidenciasScreen onBack={() => setActiveScreen("home")} />;

  const quickCards = [
    { key: "cuidado", emoji: "\u{1F985}", title: "Te vigilo", text: "Alguien te cuida. Vos elegís qué ve.", big: true },
    { key: "violencia", emoji: "\u{1F6E1}\u{FE0F}", title: "Violencia de género", text: "Pánico, grabación y red de apoyo." },
    { key: "trabajo", emoji: "\u{1F303}", title: "Trabajo de riesgo", text: "Protección en áreas peligrosas." },
    { key: "adolescente", emoji: "\u{1F9D1}\u200D\u{1F393}", title: "Adolescente seguro", text: "Anti-bullying, GPS y geocercas." },
    { key: "adulto_mayor", emoji: "\u{1FAF6}", title: "Adulto mayor seguro", text: "Medicamentos, caídas y geocercas." },
    { key: "hogar", emoji: "\u{1F3E0}", title: "Hogar seguro", text: "Intrusos, vecinos y accidentes." },
    { key: "contactos", emoji: "\u{1F465}", title: "Mis Contactos", text: `${contactos.length}/${(PLAN_LIMITS[userPlan]||PLAN_LIMITS.gratis).contactos} configurados` },
  ];

  function handleCard(key) {
    if (key === "contactos") setActiveScreen("contactos");
    else if (key === "pastillero") setActiveScreen("pastillero");
    else if (key === "evidencias") setActiveScreen("evidencias");
    else if (key === "cuidado") setShowTerceroModal(true);
    else { const mod = MODULES.find(m => m.key === key); if (mod) setActiveModule(mod); }
  }

  const [panicoEnviado, setPanicoEnviado] = useState(false);

  async function handlePanico() {
    if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza."); return; }
    const { location } = await getCurrentLocationWithFallback();
    const msg = buildMessageWithReply("ALERTA - Botón de pánico activado. Necesito ayuda urgente.", location);
    enviarWhatsApp(contactos[0].telefono, msg);
    setPanicoEnviado(true);
  }

  function enviarRespuestaPanico(emoji, texto) {
    if (contactos.length > 0) enviarWhatsApp(contactos[0].telefono, `${emoji} ${texto}`);
  }

  return (
    <div className="min-h-screen px-5 py-8 pb-24 text-white" style={{ background: "linear-gradient(180deg, #0a0a10 0%, #0d0d16 40%, #0a0a10 100%)" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header con logo águila */}
        <div className="mb-6 text-center">
          <EagleEyeLogo size={80} />
          <p className="text-[10px] uppercase tracking-[4px] mt-1" style={{ color: "rgba(212,175,55,0.4)" }}>Sistema de protección</p>
        </div>

        {/* Bienvenida */}
        <div className="mb-6 rounded-2xl p-5" style={{
          background: "linear-gradient(145deg, #13131d, #0e0e16)",
          border: "1px solid rgba(212,175,55,0.1)",
          boxShadow: "6px 6px 18px rgba(0,0,0,0.5), -3px -3px 10px rgba(212,175,55,0.01), inset 0 1px 0 rgba(212,175,55,0.04)",
        }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[3px]" style={{ color: "#d4af37" }}>Panel inicial</p>
              <h2 className="mt-2 text-xl font-bold text-white">Bienvenido/a, {nombreUsuario} {"\u{1F44B}"}</h2>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Plan: <span className="font-semibold" style={{ color: "#d4af37" }}>{PLAN_PRICES[userPlan]?.name || "Gratis"}</span>
                {contactos.length === 0 && <span className="text-orange-300"> · Agregá contactos</span>}
              </p>
            </div>
            <button onClick={handleLogout} disabled={loggingOut} className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50" style={{
              background: "linear-gradient(145deg, #16161f, #0c0c12)",
              border: "1px solid rgba(212,175,55,0.1)",
              boxShadow: "3px 3px 8px rgba(0,0,0,0.5), -2px -2px 6px rgba(212,175,55,0.01)",
            }}>
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}</button>
          </div>
        </div>

        {activeModule ? (
          <div className="mb-8">
            <button onClick={() => setActiveModule(null)} className="mb-4 rounded-xl px-5 py-3 text-sm font-bold" style={{ color: "#d4af37", background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.15)" }}>{"\u2190"} Volver al panel</button>
            <ModuleCard m={activeModule} autoExpand={true} contactos={contactos} onOpenPastillero={() => { setActiveModule(null); setActiveScreen("pastillero"); }} onOpenEvidencias={() => { setActiveModule(null); setActiveScreen("evidencias"); }} />
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[2px]" style={{ color: "rgba(212,175,55,0.5)" }}>Qué necesitás hoy?</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickCards.map(card => (
                <button key={card.key} onClick={() => handleCard(card.key)}
                  className={`text-left rounded-2xl p-5 active:scale-[0.98] transition-all ${card.big ? "sm:col-span-2 xl:col-span-3" : ""}`}
                  style={{
                    background: card.big
                      ? "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(184,134,11,0.04))"
                      : card.key === "contactos" && contactos.length === 0
                      ? "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.05))"
                      : "linear-gradient(145deg, #12121a, #0c0c12)",
                    border: card.big
                      ? "1px solid rgba(212,175,55,0.2)"
                      : card.key === "contactos" && contactos.length === 0
                      ? "1px solid rgba(234,88,12,0.3)"
                      : "1px solid rgba(212,175,55,0.08)",
                    boxShadow: "5px 5px 14px rgba(0,0,0,0.4), -2px -2px 8px rgba(212,175,55,0.01), inset 0 1px 0 rgba(212,175,55,0.03)",
                  }}>
                  <div className={`mb-2 ${card.big ? "text-4xl" : "text-2xl"}`}>{card.emoji}</div>
                  <div className={`font-bold ${card.big ? "text-lg" : "text-sm"}`} style={{ color: "#d4af37" }}>{card.title}</div>
                  <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{card.text}</p>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(212,175,55,0.5)" }}>Abrir {"\u2192"}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {showTerceroModal && <CuidadoModal contactos={contactos} onClose={() => setShowTerceroModal(false)} />}

      {/* PANEL POST-PÁNICO con emojis */}
      {panicoEnviado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: "linear-gradient(145deg, #13131d, #0a0a12)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{"\u{1F6A8}"}</div>
              <h3 className="text-lg font-bold" style={{ color: "#d4af37" }}>Alerta enviada</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Tu contacto recibió la alerta por WhatsApp</p>
            </div>

            <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(212,175,55,0.5)" }}>Seguí comunicándote</div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u2705", text: "Estoy bien" },
                  { emoji: "\u{1F3C3}", text: "Me muevo" },
                  { emoji: "\u{1F4CD}", text: "Acá estoy" },
                  { emoji: "\u{1F6B6}", text: "Caminando" },
                ].map((r, i) => (
                  <button key={i} onClick={() => enviarRespuestaPanico(r.emoji, r.text)}
                    className="rounded-lg py-2 text-center active:scale-95" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)",
                    }}>
                    <div className="text-xl">{r.emoji}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { emoji: "\u{1F3E0}", text: "En casa" },
                  { emoji: "\u{1F44B}", text: "Llegué" },
                  { emoji: "\u{1F6D1}", text: "Peligro" },
                  { emoji: "\u{1F510}", text: "Seguro/a" },
                ].map((r, i) => (
                  <button key={i} onClick={() => enviarRespuestaPanico(r.emoji, r.text)}
                    className="rounded-lg py-2 text-center active:scale-95" style={{
                      background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)",
                    }}>
                    <div className="text-xl">{r.emoji}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>{r.text}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => enviarRespuestaPanico("\u{1F6A8}", "SIGO EN PELIGRO")}
                  className="rounded-lg py-2 text-center active:scale-95" style={{
                    background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)",
                  }}>
                  <div className="text-xl">{"\u{1F6A8}"}</div>
                  <div className="text-[8px] mt-0.5 text-red-400">SIGO EN PELIGRO</div>
                </button>
                <button onClick={() => {
                    const txt = prompt("Escribí tu mensaje:");
                    if (txt) enviarRespuestaPanico("", txt);
                  }}
                  className="rounded-lg py-2 text-center active:scale-95" style={{
                    background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(212,175,55,0.08)",
                  }}>
                  <div className="text-xl">{"\u270D\u{FE0F}"}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }}>Escribir</div>
                </button>
              </div>
            </div>

            <button onClick={() => setPanicoEnviado(false)} className="w-full rounded-xl py-3 text-sm font-semibold" style={{
              background: "linear-gradient(145deg, #16161f, #0c0c12)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
            }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* BOTÓN DE PÁNICO FLOTANTE - Premium */}
      <div className="fixed bottom-5 right-5 z-50">
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: "-6px", borderRadius: "50%", border: "1px solid rgba(212,175,55,0.12)", animation: "panicPulse 2.5s infinite", pointerEvents: "none" }} />
          <button onClick={handlePanico}
            className="flex h-16 w-16 items-center justify-center rounded-full text-white active:scale-95"
            style={{
              background: "linear-gradient(145deg, #b91c1c, #991b1b)",
              border: "2px solid rgba(212,175,55,0.25)",
              boxShadow: "6px 6px 18px rgba(0,0,0,0.7), -3px -3px 10px rgba(139,0,0,0.1), 0 0 40px rgba(185,28,28,0.15)",
            }}>
            <span className="text-2xl">{"\u{1F6A8}"}</span>
          </button>
        </div>
        <div className="text-[9px] text-center mt-1 font-bold uppercase tracking-wider" style={{ color: "#d4af37" }}>Pánico</div>
      </div>
      <style>{`@keyframes panicPulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.08)} }`}</style>
    </div>
  );
}

// ─── CALCULADORA FALSA (Modo disfraz) ───────
function CalculadoraScreen({ onUnlock }) {
  const [display, setDisplay] = useState("0");
  const [pin] = useState(() => sessionStorage.getItem("traza360_pin") || "1234");

  function handleKey(key) {
    if (key === "C") { setDisplay("0"); return; }
    if (key === "=") {
      // Verificar si el display contiene el PIN
      if (display === pin || display.endsWith(pin)) {
        onUnlock();
        return;
      }
      // Intentar evaluar como calculadora real
      try {
        const result = Function('"use strict"; return (' + display.replace(/×/g, "*").replace(/÷/g, "/") + ')')();
        setDisplay(String(result));
      } catch(e) {
        setDisplay("Error");
      }
      return;
    }
    if (display === "0" || display === "Error") setDisplay(key);
    else setDisplay(display + key);
  }

  const keys = ["7","8","9","÷","4","5","6","×","1","2","3","-","0",".","=","+","C"];

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-end pb-8 px-4">
      {/* Barra superior falsa */}
      <div className="w-full max-w-sm mt-8 mb-auto">
        <div className="text-center text-slate-500 text-xs mb-2">Calculadora</div>
      </div>

      {/* Display */}
      <div className="w-full max-w-sm mb-4">
        <div className="rounded-2xl bg-[#222] p-6 text-right">
          <div className="text-4xl font-light text-white font-mono tracking-wider overflow-hidden">{display}</div>
        </div>
      </div>

      {/* Teclado */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-2">
        {keys.map(k => {
          const isOp = ["÷","×","-","+","="].includes(k);
          const isClear = k === "C";
          return (
            <button key={k} onClick={() => handleKey(k)}
              className={`rounded-2xl py-4 text-xl font-semibold active:scale-95 ${
                isOp ? "bg-orange-500 text-white" :
                isClear ? "bg-[#a5a5a5] text-black" :
                "bg-[#333] text-white"
              }`}>
              {k}
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-[10px] text-slate-700">Ingresá {pin} y tocá = para acceder</p>
      </div>
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

  useEffect(() => {
    // Calculadora SOLO si la URL tiene ?modo=calc
    const params = new URLSearchParams(window.location.search);
    if (params.get("modo") === "calc") {
      setModoCalc(true);
      setScreen("calculadora");
      return;
    }
    checkSession();
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => saveLastLocation(pos.coords.latitude, pos.coords.longitude), () => {}, { enableHighAccuracy: true, timeout: 10000 });
    try { const s = sessionStorage.getItem("traza360_pending_name"); if (s) setPendingName(s); } catch(e){}
  }, []);

  async function checkSession() {
    const r = await getCurrentUser();
    if (r?.authUser) { setAuthUser(r.authUser); setUserProfile(r.profile); if (!r.profile) await tryCreateProfile(r.authUser); setScreen("home"); }
    else setScreen("landing");
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
    setScreen("home");
  }

  function handleLogout() { setUserProfile(null); setAuthUser(null); setPendingName(null); try { sessionStorage.removeItem("traza360_pending_name"); } catch(e){} setScreen("landing"); }

  function handleUnlockCalc() {
    setModoCalc(false);
    checkSession();
  }

  if (screen === "calculadora") return <CalculadoraScreen onUnlock={handleUnlockCalc} />;

  if (screen === "loading") return (
    <div className="flex min-h-screen items-center justify-center text-white" style={{ background: "linear-gradient(180deg, #050508 0%, #0a0a14 100%)" }}><div className="text-center">
      <div className="mb-4 flex items-center justify-center"><EagleEyeLogo size={80} /></div>
      <div className="text-xs mt-2" style={{ color: "rgba(212,175,55,0.4)" }}>Cargando...</div>
    </div></div>
  );

  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} setPendingName={setPendingName} />;
  if (screen === "home") return <HomeScreen userProfile={userProfile} authUser={authUser} pendingName={pendingName} onLogout={handleLogout} />;
  return <LandingScreen onScreen={setScreen} />;
}
