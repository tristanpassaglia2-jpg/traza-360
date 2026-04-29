import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase, getContactos, addContacto, deleteContacto, getMedicamentos, addMedicamento, deleteMedicamento, getTomasHoy, getTomasSemana, marcarTomado, crearTomasDelDia } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa v15
   Versión: 15.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   CAMBIOS v15:
   1. WhatsApp AUTOMÁTICO vía Twilio API (no abre wa.me)
   2. Fallback: si API falla, abre wa.me como respaldo
   3. Pastillero envía WhatsApp SILENCIOSO (sin intervención)
   4. Compatible Sandbox y Producción (1 variable en Vercel)
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
  if (loc) msg += "\n\nUbicacion: " + buildMapLink(loc);
  msg += "\n\n--------------\nResponder con:\nRECIBI = Recibi el mensaje\nVOY = Voy en camino\nOK = Todo bien?\n--------------";
  return msg;
}

async function sendAlertToContact(contact, baseMessage) {
  const { location } = await getCurrentLocationWithFallback();
  openWhatsAppToContact(contact.telefono, buildMessageWithReply(baseMessage, location));
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

async function iniciarGrabacion() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunksRef = [];
    mediaRecorderInstance = new MediaRecorder(stream);
    mediaRecorderInstance.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.push(e.data); };
    mediaRecorderInstance.start();
    return { success: true, stream };
  } catch (e) { return { success: false, error: e.message }; }
}

function detenerGrabacion() {
  return new Promise((resolve) => {
    if (!mediaRecorderInstance || mediaRecorderInstance.state === "inactive") { resolve(null); return; }
    mediaRecorderInstance.onstop = () => {
      const blob = new Blob(audioChunksRef, { type: "audio/webm" });
      mediaRecorderInstance.stream.getTracks().forEach(t => t.stop());
      resolve(blob);
    };
    mediaRecorderInstance.stop();
  });
}

// Guardar evidencia en Supabase Storage
async function guardarEvidencia(blob, tipo = "audio") {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = "webm";
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const path = `${user.id}/${tipo}_${ts}.${ext}`;
    const { data, error } = await supabase.storage.from("evidencias").upload(path, blob, { contentType: "audio/webm", upsert: false });
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
        openWhatsAppToContact(contactos[0].telefono, msg);
      });
    }
  }

  useEffect(() => {
    if (!activo) return;
    timerRef.current = setInterval(() => {
      setTiempoRestante(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // ALERTA AUTOMÁTICA
          enviarNotificacion("ALERTA TRAZA 360", "No confirmaste que estás bien. Se alertó a tus contactos.");
          reproducirSonido();
          if (contactos.length > 0) {
            getCurrentLocationWithFallback().then(({ location }) => {
              const msg = buildMessageWithReply("ALERTA AUTOMATICA - No confirmó que está bien después de entrar a un lugar desconocido. Verificar urgente.", location);
              openWhatsAppToContact(contactos[0].telefono, msg);
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
      openWhatsAppToContact(contactos[0].telefono, "Estoy bien. Salí del lugar sin problemas.");
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
  const [reproduciendo, setReproduciendo] = useState(null);

  useEffect(() => { cargar(); }, []);
  async function cargar() { setLoading(true); setArchivos(await listarEvidencias()); setLoading(false); }

  async function reproducir(f) {
    const url = await getEvidenciaUrl(f.fullPath);
    if (!url) { alert("No se pudo obtener el archivo."); return; }
    setReproduciendo(f.name);
    try {
      const audio = new Audio(url);
      audio.onended = () => setReproduciendo(null);
      audio.onerror = () => { setReproduciendo(null); window.open(url, "_blank"); };
      await audio.play();
    } catch(e) {
      setReproduciendo(null);
      window.open(url, "_blank");
    }
  }

  async function eliminar(f) {
    if (!window.confirm("Eliminar esta evidencia?")) return;
    await eliminarEvidencia(f.fullPath);
    cargar();
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">{"\u2190"} Volver</button>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Mis archivos protegidos</p>
          <h2 className="mt-2 text-2xl font-bold">Mis Evidencias</h2>
          <p className="mt-2 text-sm text-slate-400">Grabaciones guardadas en la nube.</p>
        </div>
        {loading ? <div className="text-center py-8 text-slate-400">Cargando...</div>
        : archivos.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-5xl mb-3">{"\u{1F4C1}"}</div>
            <h3 className="text-lg font-semibold text-slate-100">Sin evidencias</h3>
            <p className="mt-2 text-sm text-slate-400">Cuando grabes audio desde cualquier módulo, aparecerá acá.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivos.map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{f.name?.includes("audio") ? "\u{1F399}\u{FE0F}" : "\u{1F3A5}"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">{f.name}</div>
                      <div className="text-xs text-slate-400">{f.metadata?.size ? (f.metadata.size / 1024).toFixed(0) + " KB" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => reproducir(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${reproduciendo === f.name ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 animate-pulse" : "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"}`}>
                      {reproduciendo === f.name ? "Escuchando..." : "Escuchar"}
                    </button>
                    <button onClick={() => eliminar(f)} className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs text-red-300">Borrar</button>
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
    if (elegidos.length > 0) openWhatsAppToContact(elegidos[0].telefono, msg);
    setEnviando(false); setSent(true);
    setTimeout(() => onClose(), 2000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl">
        {sent ? (
          <div className="text-center py-8"><div className="text-5xl mb-3">{"\u2705"}</div><h3 className="text-lg font-bold">Alerta enviada</h3><p className="mt-2 text-sm text-slate-400">Enviá el mensaje en WhatsApp.</p></div>
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

// ─── TERCERO REMOTO MODAL ───────────────────
function CuidadoModal({ onClose, contactos = [] }) {
  const [modo, setModo] = useState(null); // null | cuidador | victima
  const [paso, setPaso] = useState("inicio");
  // Cuidador
  const [contactoSel, setContactoSel] = useState(null);
  const [solicitudes, setSolicitudes] = useState({ ubicacion: false, audio: false, video: false });
  // Víctima
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [cuidadorNombre, setCuidadorNombre] = useState("");
  const [permisosActivos, setPermisosActivos] = useState({});

  function toggleSolicitud(key) { setSolicitudes({ ...solicitudes, [key]: !solicitudes[key] }); }

  // CUIDADOR envía solicitudes
  function enviarSolicitudes() {
    if (!contactoSel) return;
    const items = [];
    if (solicitudes.ubicacion) items.push("Te ubico? (ver tu ubicacion en tiempo real)");
    if (solicitudes.audio) items.push("Te escucho? (escuchar tu entorno)");
    if (solicitudes.video) items.push("Te grabo? (ver tu camara) [Premium]");
    if (items.length === 0) { alert("Seleccioná al menos 1 solicitud."); return; }

    getCurrentLocationWithFallback().then(({ location }) => {
      const msg = `TRAZA 360 - SOLICITUD DE CUIDADO\n\nQuiero cuidarte. Te pido permiso para:\n\n${items.map((it, i) => `${i+1}. ${it}`).join("\n")}\n\nAbri la app Traza 360 y acepta o rechaza cada permiso.\nApp: https://traza360.app\n\nResponder con:\nSI = Acepto todo\nNO = Rechazo`;
      openWhatsAppToContact(contactoSel.telefono, msg);
    });
    setPaso("esperando");
  }

  // VÍCTIMA simula recibir solicitudes (en producción viene por Supabase Realtime)
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

  function confirmarPermisos() {
    const aceptados = solicitudesRecibidas.filter(s => s.estado === "aceptado").map(s => s.key);
    if (aceptados.length > 0 && contactos.length > 0) {
      const textos = [];
      if (aceptados.includes("ubicacion")) textos.push("Ver mi ubicacion");
      if (aceptados.includes("audio")) textos.push("Escuchar mi entorno");
      if (aceptados.includes("video")) textos.push("Ver mi camara");
      openWhatsAppToContact(contactos[0].telefono, `TRAZA 360 - Acepte que me cuides.\n\nPermisos:\n${textos.map(t => "- " + t).join("\n")}\n\nEstoy protegido/a.`);
    }
    setPaso("cuidado_activo");
  }

  function handleEstoyBien() {
    if (contactos.length > 0) openWhatsAppToContact(contactos[0].telefono, "Estoy bien. Todo en orden.");
  }

  function handleAyuda() {
    if (contactos.length > 0) {
      getCurrentLocationWithFallback().then(({ location }) => {
        openWhatsAppToContact(contactos[0].telefono, buildMessageWithReply("AYUDA URGENTE - Necesito ayuda ahora.", location));
      });
    }
  }

  function getRelEmoji(r) { return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}"; }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{"\u{1FAC2}"} Estoy a tu cuidado</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">{"\u00D7"}</button>
        </div>

        {/* ELEGIR MODO */}
        {!modo && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-3">Elegí tu rol en esta sesión.</p>
            <button onClick={() => { setModo("cuidador"); setPaso("elegir_contacto"); }}
              className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-4 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\u{1F441}\u{FE0F}"}</span>
                <div><div className="text-sm font-semibold text-cyan-300">Quiero cuidar a alguien</div>
                  <div className="text-[11px] text-slate-400">Enviá solicitudes: te ubico? te escucho? te grabo?</div></div>
              </div>
            </button>
            <button onClick={() => { setModo("victima"); simularRecepcion(); }}
              className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\u{1F6E1}\u{FE0F}"}</span>
                <div><div className="text-sm font-semibold text-emerald-300">Alguien me está cuidando</div>
                  <div className="text-[11px] text-slate-400">Ver solicitudes pendientes y aceptar/rechazar</div></div>
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
            <p className="text-xs text-slate-400 mb-2">Qué querés pedirle a {contactoSel.nombre}?</p>

            <button onClick={() => toggleSolicitud("ubicacion")}
              className={`w-full rounded-xl border px-4 py-3 text-left ${solicitudes.ubicacion ? "border-cyan-400/50 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{"\u{1F4CD}"}</span>
                <div className="flex-1"><div className="text-sm font-semibold text-slate-100">Te ubico?</div><div className="text-[11px] text-slate-400">Ver su ubicación en tiempo real</div></div>
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
                <div className="flex-1"><div className="text-sm font-semibold text-slate-100">Te grabo?</div><div className="text-[11px] text-amber-300">Ver su cámara · Premium</div></div>
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

        {/* CUIDADOR: ESPERANDO */}
        {modo === "cuidador" && paso === "esperando" && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3 animate-pulse">{"\u{1F4E9}"}</div>
            <div className="text-lg font-bold text-slate-100">Solicitud enviada</div>
            <p className="mt-2 text-sm text-slate-400">Esperando que {contactoSel?.nombre} acepte tus permisos en su app.</p>
            <p className="mt-4 text-xs text-slate-500">Cuando acepte, podrás ver su ubicación, escuchar su entorno o ver su cámara desde acá.</p>
            <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-[11px] text-slate-400">Próximamente: panel en vivo del cuidador con mapa, audio y video.</div>
            </div>
            <button onClick={onClose} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-slate-400">Cerrar</button>
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

        {/* VÍCTIMA: CUIDADO ACTIVO */}
        {paso === "cuidado_activo" && (
          <div className="text-center space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="text-2xl mb-2">{"\u{1FAC2}"}</div>
              <div className="text-sm font-semibold text-emerald-300">Te están cuidando</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {permisosActivos.ubicacion && <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-300">{"\u{1F4CD}"} Ubicación</span>}
                {permisosActivos.audio && <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-300">{"\u{1F3A7}"} Audio</span>}
                {permisosActivos.video && <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-300">{"\u{1F4F9}"} Video</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleEstoyBien} className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 py-3 text-center">
                <div className="text-xl">{"\u{1F44D}"}</div><div className="text-[10px] text-emerald-300 mt-1">Estoy bien</div>
              </button>
              <button onClick={handleAyuda} className="rounded-xl bg-red-500/20 border border-red-500/30 py-3 text-center">
                <div className="text-xl">{"\u{1F198}"}</div><div className="text-[10px] text-red-300 mt-1">Ayuda</div>
              </button>
              <button onClick={onClose} className="rounded-xl bg-white/5 border border-white/10 py-3 text-center">
                <div className="text-xl">{"\u23F9\u{FE0F}"}</div><div className="text-[10px] text-slate-400 mt-1">Terminar</div>
              </button>
            </div>
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
  { key: "trabajo", emoji: "\u{1F303}", title: "Trabajo seguro", desc: "Protección nocturna y domicilios.",
    color: "from-emerald-500 to-teal-500", border: "border-emerald-500/20", accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/30", accentText: "text-emerald-300",
    actions: [
      { key: "peligro", icon: "\u{1F6A8}", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata.", type: "alert_contacts", message: "SOS - En peligro durante mi trabajo." },
      { key: "share", icon: "\u{1F4E1}", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "Compartiendo mi ubicación." },
      { key: "grabar", icon: "\u{1F399}\u{FE0F}", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "evidencias", icon: "\u{1F4C1}", name: "Mis Evidencias", desc: "Ver grabaciones guardadas.", type: "evidencias" },
      { key: "desconocido", icon: "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", name: "Salgo con desconocido/a", desc: "Nombre o lugar del encuentro.", type: "alert_contacts", message: "Salgo con desconocido/a: [completar]." },
      { key: "sospechoso", icon: "\u26A0\u{FE0F}", name: "Cliente sospechoso", desc: "Envía ubicación actual + aviso.", type: "alert_contacts", message: "ALERTA - Cliente con actitud sospechosa. Estoy en esta ubicación." },
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
      default: return;
    }
  }

  return (
    <>
      <div className={`rounded-2xl border ${m.border} bg-[#11182e] p-5 flex flex-col`}>
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}><span className="text-2xl">{m.emoji}</span></div>
          <h4 className="text-base font-bold text-slate-100">{m.title}</h4>
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 active:scale-[0.98]">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{a.icon}</span>
                  <div><div className="text-sm font-semibold text-slate-100">{a.name}</div><div className="mt-0.5 text-[11px] text-slate-400">{a.desc}</div></div>
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
  return (<label className="block space-y-2 text-left"><span className="text-sm font-medium text-slate-300">{label}</span>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" /></label>);
}

function AccessCard({ children }) { return <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">{children}</div>; }

function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function handle() {
    setError(""); if (!email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    setLoading(true); const r = await signIn(email.trim(), password); setLoading(false);
    if (r.success) onSuccess(); else setError(r.error.includes("Invalid") ? "Email o contraseña incorrectos." : r.error);
  }
  return (<div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white"><AccessCard>
    <button onClick={onBack} className="text-sm text-cyan-300">← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold">Ingresar</h2>
    <div className="mt-6 space-y-4">
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button onClick={handle} disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50">{loading ? "Ingresando..." : "Ingresar"}</button>
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
  return (<div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white"><AccessCard>
    <button onClick={onBack} className="text-sm text-cyan-300">← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold">Crear cuenta</h2>
    <div className="mt-6 space-y-4">
      <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={e => setName(e.target.value)} />
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      <Field label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button onClick={handle} disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50">{loading ? "Creando..." : "Crear cuenta"}</button>
    </div></AccessCard></div>);
}

// ─── LANDING ────────────────────────────────
function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <section className="px-5 pt-16 pb-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500"><span className="text-xl">{"\u{1F6E1}\u{FE0F}"}</span></div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-3xl font-extrabold text-transparent">TRAZA 360</h1>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Última señal. Respuesta real.</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl mx-auto">
          Cuando cada segundo importa,<span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent"> Traza 360 responde.</span>
        </h2>
      </section>
      <div className="px-5 pb-12"><div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <button onClick={() => onScreen("login")} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg">Ingresar</button>
        <button onClick={() => onScreen("register")} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white">Crear cuenta</button>
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
    { key: "trabajo", emoji: "\u{1F303}", title: "Trabajo seguro", text: "Protección nocturna y domicilios." },
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

  async function handlePanico() {
    if (contactos.length === 0) { alert("Configurá al menos 1 contacto de confianza."); return; }
    const { location } = await getCurrentLocationWithFallback();
    const msg = buildMessageWithReply("ALERTA - Botón de pánico activado. Necesito ayuda urgente.", location);
    openWhatsAppToContact(contactos[0].telefono, msg);
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 pb-24 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Panel inicial</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Bienvenido/a, {nombreUsuario} {"\u{1F44B}"}</h2>
              <p className="mt-2 text-sm text-slate-400">
                Plan: <span className="text-cyan-300 font-semibold">{PLAN_PRICES[userPlan]?.name || "Gratis"}</span>
                {contactos.length === 0 && <span className="text-orange-300"> · Agregá contactos de confianza</span>}
              </p></div>
            <button onClick={handleLogout} disabled={loggingOut} className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}</button>
          </div>
        </div>

        {activeModule ? (
          <div className="mb-8">
            <button onClick={() => setActiveModule(null)} className="mb-4 text-sm text-cyan-300">{"\u2190"} Volver al panel</button>
            <ModuleCard m={activeModule} autoExpand={true} contactos={contactos} onOpenPastillero={() => { setActiveModule(null); setActiveScreen("pastillero"); }} onOpenEvidencias={() => { setActiveModule(null); setActiveScreen("evidencias"); }} />
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-bold text-slate-200">Qué necesitás hoy?</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickCards.map(card => (
                <button key={card.key} onClick={() => handleCard(card.key)}
                  className={`text-left rounded-2xl border p-5 hover:bg-white/10 hover:border-cyan-400/30 active:scale-[0.98] ${
                    card.big ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 sm:col-span-2 xl:col-span-3" :
                    (card.key === "contactos" && contactos.length === 0) ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-white/5"
                  }`}>
                  <div className={`mb-2 ${card.big ? "text-5xl" : "text-2xl"}`}>{card.emoji}</div>
                  <div className={`font-semibold text-slate-100 ${card.big ? "text-xl" : "text-base"}`}>{card.title}</div>
                  <p className="mt-2 text-sm text-slate-400">{card.text}</p>
                  <div className="mt-3 text-xs font-semibold text-cyan-300">Abrir {"\u2192"}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {showTerceroModal && <CuidadoModal contactos={contactos} onClose={() => setShowTerceroModal(false)} />}

      {/* BOTÓN DE PÁNICO FLOTANTE */}
      <div className="fixed bottom-5 right-5 z-50">
        <button onClick={handlePanico}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/30 hover:scale-110 active:scale-95 animate-pulse">
          <span className="text-2xl">{"\u{1F6A8}"}</span>
        </button>
        <div className="text-[9px] text-red-300 text-center mt-1 font-semibold">PÁNICO</div>
      </div>
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
    <div className="flex min-h-screen items-center justify-center bg-[#05080f] text-slate-100"><div className="text-center">
      <div className="mb-4 flex items-center justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg animate-pulse"><span className="text-3xl">{"\u{1F6E1}\u{FE0F}"}</span></div></div>
      <div className="text-lg font-bold">TRAZA 360</div><div className="text-xs text-slate-400 mt-1">Cargando...</div>
    </div></div>
  );

  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} setPendingName={setPendingName} />;
  if (screen === "home") return <HomeScreen userProfile={userProfile} authUser={authUser} pendingName={pendingName} onLogout={handleLogout} />;
  return <LandingScreen onScreen={setScreen} />;
}
