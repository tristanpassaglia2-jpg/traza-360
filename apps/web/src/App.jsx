import React, { useEffect, useMemo, useRef, useState } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa
   Versión: 12.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   NOVEDAD v12:
   - Fix: Home muestra nombre del usuario (con fallback a email)
   - Fix: 6 tarjetas del Home son clickeables y abren los módulos
   - Nuevo: botones anti-bullying en Adolescente Seguro
   - Nuevo: si el perfil no se crea bien, se intenta crear al entrar al Home
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER = "5493513956879";
const PIN_DEFAULT = "1234";
const HOME_ADDRESS_DEFAULT = "Mi casa";

const PLAN_LIMITS = {
  gratis: { terceros: 1, vinculacionMax: "24h", audioContinuo: false },
  premium_personal: { terceros: 3, vinculacionMax: "30dias", audioContinuo: true },
  premium_familiar: { terceros: 5, vinculacionMax: "permanente", audioContinuo: true },
};

// ─── GEOLOCALIZACIÓN ────────────────────────
let lastKnownLocation = null;

function saveLastLocation(lat, lng) {
  lastKnownLocation = { lat, lng, timestamp: Date.now() };
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("traza360_last_location", JSON.stringify(lastKnownLocation));
    }
  } catch (e) {}
}

function loadLastLocation() {
  if (lastKnownLocation) return lastKnownLocation;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = window.sessionStorage.getItem("traza360_last_location");
      if (raw) { lastKnownLocation = JSON.parse(raw); return lastKnownLocation; }
    }
  } catch (e) {}
  return null;
}

function getCurrentLocationWithFallback() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ location: loadLastLocation(), source: "fallback" }); return; }
    const timeoutId = setTimeout(() => resolve({ location: loadLastLocation(), source: "fallback" }), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
        saveLastLocation(loc.lat, loc.lng);
        resolve({ location: loc, source: "live" });
      },
      () => { clearTimeout(timeoutId); resolve({ location: loadLastLocation(), source: "fallback" }); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

function buildMapLink(loc) { return loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null; }

// ─── GEOFENCING ─────────────────────────────
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function saveZones(moduleKey, zones) {
  try { window.sessionStorage?.setItem(`traza360_zones_${moduleKey}`, JSON.stringify(zones)); } catch (e) {}
}
function loadZones(moduleKey) {
  try {
    const raw = window.sessionStorage?.getItem(`traza360_zones_${moduleKey}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
  } catch (e) {}
  return null;
}

// ─── TERCERO REMOTO ─────────────────────────
function saveTerceros(terceros) {
  try { window.sessionStorage?.setItem("traza360_terceros", JSON.stringify(terceros)); } catch (e) {}
}
function loadTerceros() {
  try {
    const raw = window.sessionStorage?.getItem("traza360_terceros");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function generarCodigoVinculacion() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const DURACIONES = [
  { key: "6h", label: "6 horas", minutos: 360, plan: "gratis" },
  { key: "12h", label: "12 horas", minutos: 720, plan: "gratis" },
  { key: "24h", label: "24 horas", minutos: 1440, plan: "gratis" },
  { key: "30dias", label: "30 días", minutos: 43200, plan: "premium_personal" },
  { key: "permanente", label: "Permanente", minutos: -1, plan: "premium_familiar" },
];

const DURACIONES_AUDIO = [
  { key: "5min", label: "5 minutos", segundos: 300, plan: "gratis" },
  { key: "15min", label: "15 minutos", segundos: 900, plan: "gratis" },
  { key: "1h", label: "1 hora", segundos: 3600, plan: "premium_personal" },
  { key: "continuo", label: "Continuo (24/7)", segundos: -1, plan: "premium_personal" },
];

// ─── WHATSAPP ───────────────────────────────
function openWhatsAppWithMessage(text) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function sendSilentWhatsApp(text) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  const popup = window.open(url, "_blank", "noopener,noreferrer,width=1,height=1,left=-1000,top=-1000");
  if (popup) {
    setTimeout(() => { try { popup.close(); } catch(e) {} }, 3000);
  }
}

async function sendAlertWithLocation(baseMessage, silent = false) {
  const { location, source } = await getCurrentLocationWithFallback();
  let finalMessage = baseMessage;
  if (location) {
    const tag = source === "live" ? "📍 Ubicación en tiempo real" : "📍 Última ubicación registrada";
    finalMessage += `\n\n${tag}:\n${buildMapLink(location)}`;
  } else {
    finalMessage += "\n\n⚠️ No se pudo obtener ubicación. Contacten por otros medios.";
  }
  if (silent) sendSilentWhatsApp(finalMessage);
  else openWhatsAppWithMessage(finalMessage);
}

async function shareLiveLocation() {
  const { location, source } = await getCurrentLocationWithFallback();
  if (!location) { openWhatsAppWithMessage("📍 Quiero compartir mi ubicación pero no logro obtenerla."); return; }
  const tag = source === "live" ? "en tiempo real" : "(última registrada)";
  openWhatsAppWithMessage(`📍 Comparto mi ubicación ${tag} y activo seguimiento continuo:\n${buildMapLink(location)}\n\nTraza 360 seguirá actualizando mientras la app esté activa.`);
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}, { enableHighAccuracy: true, maximumAge: 15000 }
    );
  }
}

function openMapsTo(d) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }
function openUber(d) { window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }

// ─── ICONS ──────────────────────────────────
function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WhatsAppFloatingButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button onClick={() => openWhatsAppWithMessage("Hola, quiero información sobre Traza 360.")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 hover:scale-110 active:scale-95">
        <WhatsAppIcon size={28} />
      </button>
    </div>
  );
}

// ─── ACCIONES COMPARTIDAS ───────────────────
const SHARE_LOCATION_ACTION = { key: "compartir_ubicacion", icon: "📡", name: "Compartir ubicación en tiempo real", desc: "Envío mi ubicación y activo seguimiento continuo.", type: "share_location" };
const GEOFENCING_ACTION = { key: "geofencing", icon: "🗺️", name: "Alertas de lugares (Geofencing)", desc: "Aviso automático al entrar/salir de lugares predefinidos.", type: "geofencing" };

// ─── BULLYING: GRABACIÓN DE AUDIO REAL ──────
let mediaRecorderInstance = null;
let audioChunksRef = [];

async function iniciarGrabacionBullying() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunksRef = [];
    mediaRecorderInstance = new MediaRecorder(stream);

    mediaRecorderInstance.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.push(event.data);
    };

    mediaRecorderInstance.onstop = () => {
      const audioBlob = new Blob(audioChunksRef, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `evidencia_bullying_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      sendSilentWhatsApp(`🎙️ EVIDENCIA BULLYING · Grabación de audio guardada como evidencia. Fecha: ${new Date().toLocaleString("es-AR")}`);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderInstance.start();
    return { success: true };
  } catch (error) {
    console.error("Error grabando audio:", error);
    return { success: false, error: error.message };
  }
}

function detenerGrabacionBullying() {
  if (mediaRecorderInstance && mediaRecorderInstance.state !== "inactive") {
    mediaRecorderInstance.stop();
    return true;
  }
  return false;
}

// ─── MODAL: BULLYING GRABACIÓN ──────────────
function BullyingModal({ onClose }) {
  const [grabando, setGrabando] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!grabando) return;
    const id = setInterval(() => setTiempo((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [grabando]);

  async function iniciar() {
    setError("");
    const result = await iniciarGrabacionBullying();
    if (result.success) {
      setGrabando(true);
      setTiempo(0);
    } else {
      setError("No se pudo acceder al micrófono. Dale permiso al navegador.");
    }
  }

  function detener() {
    detenerGrabacionBullying();
    setGrabando(false);
  }

  const formatTiempo = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#0d1426] p-6 shadow-2xl">
        <div className="text-center">
          <div className="mb-3 text-4xl">🎙️</div>
          <div className="text-lg font-bold text-slate-100">Evidencia de bullying</div>
          <p className="mt-2 text-xs text-slate-400">
            Grabación silenciosa. El audio se guarda como evidencia para denunciar.
          </p>

          {grabando ? (
            <>
              <div className="my-6 rounded-2xl border border-red-500/30 bg-red-500/10 py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-red-300 uppercase tracking-widest">Grabando</span>
                </div>
                <div className="font-mono text-4xl font-bold text-white tabular-nums">{formatTiempo(tiempo)}</div>
              </div>

              <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                <p className="text-[11px] text-sky-200 leading-5">
                  ℹ️ Mantené la pantalla encendida. Tocá "Detener y guardar" cuando termines.
                </p>
              </div>

              <button onClick={detener} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">
                Detener y guardar evidencia
              </button>
            </>
          ) : (
            <>
              <div className="my-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-xs leading-5 text-slate-300">
                  Al tocar <strong className="text-sky-300">"Iniciar grabación"</strong>:
                </p>
                <ul className="mt-2 text-[11px] text-slate-400 text-left space-y-1 list-disc list-inside">
                  <li>Se graba el audio del entorno sin hacer ruido</li>
                  <li>Se guarda automáticamente como archivo</li>
                  <li>Se avisa en silencio a tus contactos</li>
                  <li>La pantalla muestra que está grabando para vos</li>
                </ul>
              </div>

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button onClick={iniciar} className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">
                🎙️ Iniciar grabación silenciosa
              </button>
              <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-400">
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PREFIJOS TELEFÓNICOS ────────────────────
const PAISES = [
  { code: "AR", flag: "🇦🇷", prefix: "54",  label: "+54 Argentina" },
  { code: "MX", flag: "🇲🇽", prefix: "52",  label: "+52 México" },
  { code: "CO", flag: "🇨🇴", prefix: "57",  label: "+57 Colombia" },
  { code: "CL", flag: "🇨🇱", prefix: "56",  label: "+56 Chile" },
  { code: "UY", flag: "🇺🇾", prefix: "598", label: "+598 Uruguay" },
  { code: "PY", flag: "🇵🇾", prefix: "595", label: "+595 Paraguay" },
  { code: "BO", flag: "🇧🇴", prefix: "591", label: "+591 Bolivia" },
  { code: "PE", flag: "🇵🇪", prefix: "51",  label: "+51 Perú" },
  { code: "BR", flag: "🇧🇷", prefix: "55",  label: "+55 Brasil" },
  { code: "US", flag: "🇺🇸", prefix: "1",   label: "+1 USA" },
  { code: "ES", flag: "🇪🇸", prefix: "34",  label: "+34 España" },
];

// Selector de código de país reutilizable
function PhoneInput({ value, onChange, prefix, onPrefixChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const pais = PAISES.find((p) => p.prefix === prefix) || PAISES[0];

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* Selector de país */}
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white whitespace-nowrap hover:bg-white/10 shrink-0">
          <span>{pais.flag}</span>
          <span className="text-slate-300">+{pais.prefix}</span>
          <span className="text-slate-500 text-xs">▼</span>
        </button>

        {/* Campo de número */}
        <input type="tel" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Número sin 0 ni 15"}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 min-w-0" />
      </div>

      {/* Dropdown de países */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#0d1426] shadow-2xl overflow-hidden">
          {PAISES.map((p) => (
            <button key={p.code} type="button"
              onClick={() => { onPrefixChange(p.prefix); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 text-left ${p.prefix === prefix ? "bg-white/10 text-cyan-300" : "text-slate-200"}`}>
              <span className="text-lg">{p.flag}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MODAL: TERCERO REMOTO ──────────────────
function TerceroRemotoModal({ onClose }) {
  const [vista, setVista] = useState("menu");
  const [terceros, setTerceros] = useState(loadTerceros());
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [prefijo, setPrefijo] = useState("54"); // Argentina por defecto
  const [duracion, setDuracion] = useState("24h");
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [error, setError] = useState("");

  const [audioActivo, setAudioActivo] = useState(false);
  const [audioDuracion, setAudioDuracion] = useState("15min");
  const [audioRestante, setAudioRestante] = useState(0);
  const [terceroSeleccionado, setTerceroSeleccionado] = useState(null);

  const plan = "gratis";
  const limites = PLAN_LIMITS[plan];
  const maxTerceros = limites.terceros;

  const colors = {
    accentBorder: "border-pink-500/30",
    accentBg: "bg-pink-500/10",
    accentText: "text-pink-300",
  };

  useEffect(() => { saveTerceros(terceros); }, [terceros]);

  useEffect(() => {
    if (!audioActivo || audioRestante <= 0) return;
    const id = setInterval(() => {
      setAudioRestante((t) => {
        if (t <= 1) {
          setAudioActivo(false);
          openWhatsAppWithMessage(`🔇 Audio remoto finalizado. Ya no estoy compartiendo sonido con ${terceroSeleccionado?.nombre || "mi cuidador"}.`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [audioActivo, audioRestante, terceroSeleccionado]);

  function handleVincular() {
    setError("");
    if (!nombre.trim() || !telefono.trim()) { setError("Completá nombre y teléfono del cuidador."); return; }
    if (terceros.length >= maxTerceros) {
      setError(`Tu plan ${plan === "gratis" ? "Gratis" : "actual"} permite solo ${maxTerceros} tercero(s). Pasate a Premium para vincular más.`);
      return;
    }
    const duracionData = DURACIONES.find((d) => d.key === duracion);
    if (duracionData.plan !== "gratis" && plan === "gratis") {
      setError(`La duración "${duracionData.label}" requiere Premium. Las opciones gratis son: 6h, 12h, 24h.`);
      return;
    }

    // Armar número completo (elimina 0 inicial y 15 si es Argentina)
    const numLimpio = telefono.trim().replace(/\s/g, '').replace(/^0+/, '').replace(/^15/, '');
    const telefonoCompleto = prefijo + numLimpio;

    const codigo = generarCodigoVinculacion();
    setCodigoGenerado(codigo);

    const expira = duracionData.minutos === -1 ? null : Date.now() + duracionData.minutos * 60 * 1000;
    const nuevoTercero = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      telefono: telefonoCompleto,
      codigo,
      duracionKey: duracion,
      duracionLabel: duracionData.label,
      creado: Date.now(),
      expira,
      activo: true,
    };
    setTerceros((prev) => [...prev, nuevoTercero]);

    const mensaje = `Hola ${nombre}! Te vinculaste como Tercero Remoto en Traza 360. Tu código es: ${codigo}. Vinculación activa por ${duracionData.label}. Instalá la app: https://traza360.com`;
    // Envía el código directo al número del tercero por WhatsApp
    window.open(`https://wa.me/${telefonoCompleto}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
  }

  function removeTercero(id) {
    setTerceros((prev) => prev.filter((t) => t.id !== id));
  }

  function iniciarAudioRemoto(tercero) {
    setTerceroSeleccionado(tercero);
    setVista("audio");
  }

  function activarAudio() {
    const duracionData = DURACIONES_AUDIO.find((d) => d.key === audioDuracion);
    if (duracionData.plan !== "gratis" && plan === "gratis") {
      setError(`La duración "${duracionData.label}" requiere Premium.`);
      return;
    }
    setError("");
    setAudioRestante(duracionData.segundos === -1 ? 86400 : duracionData.segundos);
    setAudioActivo(true);

    const mensaje = `🎙️ AUDIO REMOTO ACTIVADO · ${terceroSeleccionado.nombre} puede escuchar mi entorno durante ${duracionData.label}. Ubicación compartida en tiempo real: ${buildMapLink(loadLastLocation()) || "(sin datos)"}`;
    openWhatsAppWithMessage(mensaje);
  }

  function detenerAudio() {
    setAudioActivo(false);
    setAudioRestante(0);
    openWhatsAppWithMessage(`🔇 Detuve el audio remoto manualmente. Ya no estoy compartiendo sonido con ${terceroSeleccionado?.nombre || "mi cuidador"}.`);
  }

  const formatSeg = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  function formatExpira(expira) {
    if (expira === null) return "Permanente";
    const diff = expira - Date.now();
    if (diff <= 0) return "Expirada";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <h3 className="text-lg font-bold text-slate-100">Tercero Remoto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {vista === "menu" && (
          <>
            <p className="mb-5 text-xs leading-5 text-slate-400">
              Vinculá a un cuidador de confianza que pueda acceder a tu audio y ubicación cuando <strong>vos</strong> lo activás. Vos controlás cuándo y por cuánto tiempo.
            </p>

            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-[11px] text-amber-300 font-semibold mb-1">Tu plan: {plan === "gratis" ? "Gratis" : plan === "premium_personal" ? "Premium Personal" : "Premium Familiar"}</div>
              <div className="text-[11px] text-slate-400">
                Terceros permitidos: {terceros.length}/{maxTerceros} · Duración máx vinculación: {limites.vinculacionMax}
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => setVista("vincular")} disabled={terceros.length >= maxTerceros}
                className={`w-full rounded-xl border ${colors.accentBorder} ${colors.accentBg} ${colors.accentText} px-4 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed`}>
                ➕ Vincular nuevo tercero
              </button>

              <button onClick={() => setVista("lista")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100">
                📋 Ver mis terceros vinculados ({terceros.length})
              </button>
            </div>
          </>
        )}

        {vista === "vincular" && (
          <>
            <button onClick={() => { setVista("menu"); setCodigoGenerado(""); setError(""); }} className="text-xs text-slate-400 mb-3">← Volver</button>

            {codigoGenerado ? (
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-lg font-bold text-slate-100 mb-2">Vinculación creada</div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 my-4">
                  <div className="text-xs text-emerald-300 mb-2">Código para {nombre}:</div>
                  <div className="font-mono text-3xl font-bold text-white tracking-widest">{codigoGenerado}</div>
                </div>
                <button onClick={() => { setVista("lista"); setCodigoGenerado(""); setNombre(""); setTelefono(""); }}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">
                  Ir a mis terceros
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-xs text-slate-400">
                  El tercero recibirá un código por WhatsApp para vincularse. Vos decidís la duración.
                </div>

                <div className="space-y-3">
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del tercero"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />

                  <PhoneInput
                    value={telefono}
                    onChange={setTelefono}
                    prefix={prefijo}
                    onPrefixChange={setPrefijo}
                    placeholder="Número sin 0 ni 15 (ej: 1123456789)"
                  />

                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Duración de la vinculación</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DURACIONES.map((d) => {
                        const bloqueado = d.plan !== "gratis" && plan === "gratis";
                        return (
                          <button key={d.key} onClick={() => !bloqueado && setDuracion(d.key)}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                              duracion === d.key && !bloqueado
                                ? `${colors.accentBorder} ${colors.accentBg} ${colors.accentText}`
                                : "border-white/10 bg-white/5 text-slate-300"
                            } ${bloqueado ? "opacity-50" : ""}`}>
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button onClick={handleVincular}
                    className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg">
                    Generar código y enviar por WhatsApp
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {vista === "lista" && (
          <>
            <button onClick={() => setVista("menu")} className="text-xs text-slate-400 mb-3">← Volver</button>

            {terceros.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👁️</div>
                <p className="text-sm text-slate-400">No tenés terceros vinculados todavía.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {terceros.map((t) => {
                  const expirado = t.expira !== null && t.expira < Date.now();
                  return (
                    <div key={t.id} className={`rounded-xl border p-3 ${expirado ? "border-red-500/20 bg-red-500/5" : `${colors.accentBorder} ${colors.accentBg}`}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100">{t.nombre}</div>
                          <div className="text-[11px] text-slate-400 truncate">📱 {t.telefono}</div>
                          <div className="text-[10px] text-slate-500">Código: <span className="font-mono">{t.codigo}</span></div>
                        </div>
                        <button onClick={() => removeTercero(t.id)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 shrink-0">
                          Quitar
                        </button>
                      </div>

                      {!expirado && (
                        <button onClick={() => iniciarAudioRemoto(t)}
                          className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 py-2 text-xs font-semibold text-white">
                          🎙️ Activar audio remoto para {t.nombre.split(" ")[0]}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {vista === "audio" && terceroSeleccionado && (
          <>
            <button onClick={() => { setVista("lista"); setError(""); }} className="text-xs text-slate-400 mb-3">← Volver</button>

            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🎙️</div>
              <div className="text-lg font-bold text-slate-100">Audio remoto</div>
              <div className="text-xs text-slate-400">para {terceroSeleccionado.nombre}</div>
            </div>

            {audioActivo ? (
              <>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center mb-4">
                  <div className="text-xs text-emerald-300 mb-2 font-semibold">🟢 TRANSMITIENDO</div>
                  <div className="font-mono text-3xl font-bold text-white">{formatSeg(audioRestante)}</div>
                </div>

                <button onClick={detenerAudio}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg">
                  🔇 Detener audio ahora
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {DURACIONES_AUDIO.map((d) => {
                    const bloqueado = d.plan !== "gratis" && plan === "gratis";
                    return (
                      <button key={d.key} onClick={() => !bloqueado && setAudioDuracion(d.key)}
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold ${
                          audioDuracion === d.key && !bloqueado
                            ? `${colors.accentBorder} ${colors.accentBg} ${colors.accentText}`
                            : "border-white/10 bg-white/5 text-slate-300"
                        } ${bloqueado ? "opacity-50" : ""}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>

                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                <button onClick={activarAudio}
                  className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg">
                  🎙️ Activar audio ahora
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── GEOFENCING MODAL ───────────────────────
function GeofencingModal({ module, onClose }) {
  const [zones, setZones] = useState(() => loadZones(module.key));
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [radiusInput, setRadiusInput] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { saveZones(module.key, zones); }, [module.key, zones]);

  async function handleAddZone() {
    setError("");
    if (!nameInput.trim() || !addressInput.trim()) { setError("Completá nombre y dirección."); return; }
    setLoading(true);
    const geo = await geocodeAddress(addressInput);
    setLoading(false);
    if (!geo) { setError("No se pudo encontrar la dirección."); return; }
    setZones((prev) => [...prev, { id: Date.now().toString(), name: nameInput.trim(), address: addressInput.trim(), lat: geo.lat, lng: geo.lng, radius: parseInt(radiusInput, 10) || 200, active: true }]);
    setNameInput(""); setAddressInput(""); setRadiusInput(200);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><span className="text-2xl">🗺️</span><h3 className="text-lg font-bold text-slate-100">Zonas de Geofencing</h3></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {zones.length > 0 && (
          <div className="mb-5 space-y-2">
            {zones.map((z) => (
              <div key={z.id} className={`rounded-xl border ${module.accentBorder} ${module.accentBg} p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{z.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{z.address}</div>
                  </div>
                  <button onClick={() => setZones((p) => p.filter((zz) => zz.id !== z.id))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">Quitar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-200">➕ Agregar nueva zona</div>
          <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Nombre (ej: Escuela)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500" />
          <input type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="Dirección" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500" />
          <div>
            <label className="text-xs text-slate-400">Radio: {radiusInput}m</label>
            <input type="range" min="50" max="1000" step="50" value={radiusInput} onChange={(e) => setRadiusInput(e.target.value)} className="w-full mt-1" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleAddZone} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
            {loading ? "Buscando..." : "Agregar zona"}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300">Cerrar</button>
      </div>
    </div>
  );
}

// ─── DATOS: 5 MÓDULOS ───────────
const MODULES = [
  {
    key: "violencia", emoji: "🛡️", title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo ante situaciones de riesgo.",
    color: "from-fuchsia-500 to-rose-500", border: "border-fuchsia-500/20",
    accentBg: "bg-fuchsia-500/10", accentBorder: "border-fuchsia-500/30", accentText: "text-fuchsia-300",
    actions: [
      { key: "panico", icon: "🚨", name: "Botón de pánico", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🚨 ALERTA · Botón de pánico activado. Necesito ayuda urgente." },
      SHARE_LOCATION_ACTION,
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Graba audio del entorno como evidencia.", type: "whatsapp", message: "🎙️ Inicié grabación de sonido ambiente como evidencia." },
      { key: "entro_casa_de", icon: "🏘️", name: "Entro a la casa de...", desc: "Aviso y comparto ubicación.", type: "alert", message: "🏘️ Entro a la casa de [completar]." },
      { key: "me_reuno_con", icon: "👥", name: "Me reúno con...", desc: "Aviso que me encuentro con alguien.", type: "alert", message: "👥 Me reúno con [completar]." },
      { key: "ingreso_lugar_desconocido", icon: "⏱️", name: "Ingreso a lugar desconocido", desc: "Timer con PIN + alerta automática.", type: "timer", minutes: 30, triggerMessage: "⚠️ ALERTA · Timer vencido en lugar desconocido." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
    ],
  },
  {
    key: "adolescente", emoji: "🧑‍🎓", title: "Adolescente seguro",
    desc: "Salidas, regresos, trayectos y protección contra bullying.",
    color: "from-sky-400 to-cyan-500", border: "border-sky-500/20",
    accentBg: "bg-sky-500/10", accentBorder: "border-sky-500/30", accentText: "text-sky-300",
    actions: [
      { key: "peligro", icon: "🚨", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🚨 SOS · Estoy en peligro." },
      SHARE_LOCATION_ACTION,
      GEOFENCING_ACTION,
      // NUEVOS BOTONES ANTI-BULLYING
      { key: "buscame_cole", icon: "🏫", name: "Buscame por el cole, algo anda mal", desc: "Aviso silencioso + ubicación. No puedo explicar.", type: "silent_alert", message: "🏫 URGENTE · Necesito que me busquen por el colegio. Algo anda mal. No puedo explicar ahora." },
      { key: "bullying_evidencia", icon: "🎙️", name: "Bullying - Grabar evidencia", desc: "Grabación silenciosa de audio como prueba.", type: "bullying_record" },
      { key: "sali_voy_a", icon: "🚶", name: "Salí de casa, voy a lo de...", desc: "Aviso con ubicación.", type: "alert", message: "🚶 Salí de casa. Voy a lo de [completar]." },
      { key: "llegar_a_casa", icon: "🗺️", name: "Llegar a casa (GPS)", desc: "Abre Google Maps a tu casa.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue_bien", icon: "✅", name: "Llegué bien", desc: "Cierra el seguimiento.", type: "whatsapp", message: "✅ Llegué bien." },
      { key: "lugar_desconocido", icon: "⏱️", name: "Entré a un lugar desconocido", desc: "Timer con PIN.", type: "timer", minutes: 45, triggerMessage: "⚠️ ALERTA · Timer vencido en lugar desconocido." },
      { key: "perdido", icon: "📍", name: "Estoy perdido", desc: "Envía ubicación.", type: "alert", message: "📍 Estoy perdido." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
    ],
  },
  {
    key: "adulto_mayor", emoji: "🫶", title: "Adulto mayor seguro",
    desc: "Seguimiento, medicamentos y asistencia ante caídas o desorientación.",
    color: "from-amber-400 to-orange-500", border: "border-amber-500/20",
    accentBg: "bg-amber-500/10", accentBorder: "border-amber-500/30", accentText: "text-amber-300",
    actions: [
      { key: "me_cai", icon: "🆘", name: "Me caí", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🆘 ALERTA · Me caí." },
      SHARE_LOCATION_ACTION,
      GEOFENCING_ACTION,
      { key: "medicamentos", icon: "💊", name: "Tomé la medicación", desc: "Confirmación de toma.", type: "whatsapp", message: "💊 Tomé la medicación del horario." },
      { key: "llamar_familiar", icon: "📞", name: "Llamar a familiar", desc: "Contactar familiar/cuidador.", type: "whatsapp", message: "📞 Necesito hablar con mi familiar." },
      { key: "me_perdi", icon: "📍", name: "Me perdí", desc: "Envía ubicación.", type: "alert", message: "📍 Me perdí." },
      { key: "no_me_siento_bien", icon: "💔", name: "No me siento bien", desc: "Aviso de descompensación.", type: "alert", message: "💔 No me siento bien." },
    ],
  },
  {
    key: "hogar", emoji: "🏠", title: "Hogar seguro",
    desc: "Protección en domicilio: intrusos, vecinos, emergencias y accidentes.",
    color: "from-violet-500 to-purple-500", border: "border-violet-500/20",
    accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/30", accentText: "text-violet-300",
    actions: [
      { key: "intruso", icon: "🚨", name: "Intruso en domicilio", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🚨 ALERTA · Posible intruso." },
      SHARE_LOCATION_ACTION,
      { key: "ruido_sospechoso", icon: "👂", name: "Ruido sospechoso", desc: "Aviso preventivo.", type: "alert", message: "👂 Ruido sospechoso en mi domicilio." },
      { key: "accidente_domestico", icon: "🩹", name: "Accidente doméstico", desc: "Aviso + ubicación.", type: "alert", message: "🩹 ALERTA · Accidente doméstico." },
      { key: "emergencia_hogar", icon: "🆘", name: "Emergencia en el hogar", desc: "Alerta máxima.", type: "alert", message: "🆘 EMERGENCIA en el hogar." },
    ],
  },
  {
    key: "trabajo", emoji: "💼", title: "Trabajo seguro",
    desc: "Protección para acompañantes nocturnas, trabajos a domicilio y situaciones de riesgo laboral.",
    color: "from-emerald-500 to-teal-500", border: "border-emerald-500/20",
    accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/30", accentText: "text-emerald-300",
    actions: [
      { key: "ingreso_domicilio_desconocido", icon: "⏱️", name: "Ingreso a domicilio desconocido", desc: "Timer con PIN al entrar a trabajar.", type: "timer", minutes: 60, triggerMessage: "⚠️ ALERTA · Timer laboral vencido." },
      { key: "peligro", icon: "🚨", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🚨 SOS · En peligro durante mi trabajo." },
      SHARE_LOCATION_ACTION,
      { key: "cliente_sospechoso", icon: "⚠️", name: "Cliente sospechoso", desc: "Aviso preventivo.", type: "alert", message: "⚠️ Cliente con actitud sospechosa." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue_bien", icon: "✅", name: "Llegué bien / terminé", desc: "Confirmación.", type: "whatsapp", message: "✅ Terminé mi trabajo y estoy bien." },
    ],
  },
];

// ─── TIMER MODAL ────────────────────────────
function TimerModal({ action, moduleColor, onClose }) {
  const [timeLeft, setTimeLeft] = useState(action.minutes * 60);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!triggeredRef.current) { triggeredRef.current = true; sendAlertWithLocation(action.triggerMessage); }
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, action.triggerMessage]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  function handleCancel() {
    if (pin === PIN_DEFAULT) onClose();
    else { setError("PIN incorrecto"); setPin(""); }
  }

  const expired = timeLeft <= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl">
        <div className="text-center">
          <div className="mb-3 text-4xl">⏱️</div>
          <div className="text-lg font-bold text-slate-100">{action.name}</div>
          {!expired ? (
            <>
              <div className={`my-6 rounded-2xl border ${moduleColor.accentBorder} ${moduleColor.accentBg} py-6`}>
                <div className="font-mono text-5xl font-bold text-white tabular-nums">{mm}:{ss}</div>
              </div>
              <div className="space-y-3">
                <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setError(""); }} placeholder="Ingresá tu PIN"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-base text-white outline-none focus:border-cyan-400/50" />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button onClick={handleCancel} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">Cancelar timer con PIN</button>
                <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-400">Cerrar sin cancelar</button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-red-400">⚠️ Tiempo agotado</p>
              <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-white">Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE CARD ────────────────────────────
function ModuleCard({ m, autoExpand = false }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showGeofencing, setShowGeofencing] = useState(false);
  const [showBullying, setShowBullying] = useState(false);
  const [silentConfirm, setSilentConfirm] = useState(false);

  function handleAction(action) {
    switch (action.type) {
      case "timer": setActiveTimer(action); return;
      case "maps": openMapsTo(action.destination); return;
      case "uber": openUber(action.destination); return;
      case "share_location": shareLiveLocation(); return;
      case "geofencing": setShowGeofencing(true); return;
      case "silent_alert":
        sendAlertWithLocation(action.message, true);
        setSilentConfirm(true);
        setTimeout(() => setSilentConfirm(false), 2500);
        return;
      case "bullying_record": setShowBullying(true); return;
      case "alert": sendAlertWithLocation(action.message); return;
      case "whatsapp":
      default: openWhatsAppWithMessage(action.message); return;
    }
  }

  return (
    <>
      <div className={`rounded-2xl border ${m.border} bg-[#11182e] p-5 flex flex-col`}>
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}>
            <span className="text-2xl">{m.emoji}</span>
          </div>
          <h4 className="text-base font-bold text-slate-100">{m.title}</h4>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">{m.desc}</p>
        <button onClick={() => setExpanded(!expanded)}
          className={`w-full rounded-2xl border ${m.accentBorder} ${m.accentBg} ${m.accentText} px-4 py-3 text-sm font-semibold flex items-center justify-between hover:brightness-125`}>
          <span>{expanded ? "Ocultar opciones" : "Ver opciones"}</span>
          <span className={`text-xs transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>▼</span>
        </button>

        {expanded && (
          <div className="mt-4 space-y-2">
            {m.actions.map((action) => (
              <button key={action.key} onClick={() => handleAction(action)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 active:scale-[0.98]">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{action.name}</div>
                    <div className="mt-0.5 text-[11px] leading-5 text-slate-400">{action.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTimer && <TimerModal action={activeTimer} moduleColor={m} onClose={() => setActiveTimer(null)} />}
      {showGeofencing && <GeofencingModal module={m} onClose={() => setShowGeofencing(false)} />}
      {showBullying && <BullyingModal onClose={() => setShowBullying(false)} />}

      {silentConfirm && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] rounded-xl border border-indigo-500/30 bg-indigo-500/20 backdrop-blur-md px-4 py-2 shadow-xl">
          <p className="text-xs text-indigo-200 font-semibold">🤫 Alerta silenciosa enviada con ubicación</p>
        </div>
      )}
    </>
  );
}

// ─── TERCERO REMOTO CARD ─────────
function TerceroRemotoCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative rounded-2xl border-2 border-pink-500/40 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent p-6 overflow-hidden">
        <div className="absolute top-0 right-0 rounded-bl-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">⭐ Función estrella</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30">
            <span className="text-3xl">👁️</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xl font-bold text-slate-100 mb-2">Tercero Remoto</h4>
            <p className="text-sm leading-relaxed text-slate-400 mb-4">
              Vinculá a un cuidador de confianza que pueda acceder a tu audio y ubicación cuando <strong className="text-slate-200">vos</strong> lo activás.
            </p>
          </div>
        </div>

        <button onClick={() => setShowModal(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-4 font-semibold text-white shadow-lg shadow-pink-500/30">
          👁️ Gestionar mis terceros remotos
        </button>
      </div>

      {showModal && <TerceroRemotoModal onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── LANDING ─────────────────────────────────
function Hero() {
  return (
    <section className="px-5 pt-16 pb-12 text-center">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg shadow-purple-500/20">
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-3xl font-extrabold text-transparent">TRAZA 360</h1>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Última señal. Respuesta real.</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
          Cuando cada segundo importa,
          <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent"> Traza 360 responde.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
          Protección, seguimiento y asistencia para personas en situación de riesgo o vulnerabilidad.
        </p>
      </div>
    </section>
  );
}

function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <Hero />
      <div className="px-5 pb-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
          <button onClick={() => onScreen("login")} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20">Ingresar con mi cuenta</button>
          <button onClick={() => onScreen("register")} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white">Crear cuenta</button>
        </div>
      </div>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">Función destacada</h3>
          <TerceroRemotoCard />
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-6 text-center text-xl font-bold md:text-2xl">Soluciones según tu necesidad</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => <ModuleCard key={m.key} m={m} />)}
          </div>
        </div>
      </section>

      <WhatsAppFloatingButton />
    </div>
  );
}

// ─── FIELD + ACCESS CARD ────────────────────
function Field({ label, type = "text", placeholder, value, onChange }) {
  return (
    <label className="block space-y-2 text-left">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
    </label>
  );
}

function AccessCard({ children }) {
  return <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">{children}</div>;
}

// ─── LOGIN / REGISTER ───────────────────────
function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Completá email y contraseña."); return; }
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.success) onSuccess();
    else {
      if (result.error.includes("Invalid login credentials")) setError("Email o contraseña incorrectos.");
      else setError(result.error || "Error al iniciar sesión.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white">
      <AccessCard>
        <button onClick={onBack} className="text-sm font-medium text-cyan-300">← Volver</button>
        <h2 className="mt-5 text-center text-2xl font-bold">Ingresar</h2>
        <div className="mt-6 space-y-4">
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button onClick={handleLogin} disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </AccessCard>
    </div>
  );
}

function RegisterScreen({ onBack, onSuccess, setPendingName }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setLoading(true);

    // GUARDAR EL NOMBRE EN sessionStorage para usarlo como fallback
    try { window.sessionStorage.setItem("traza360_pending_name", name.trim()); } catch(e){}
    setPendingName(name.trim());

    const result = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (result.success) onSuccess();
    else {
      if (result.error.includes("already registered") || result.error.includes("already been registered")) {
        setError("Este email ya está registrado. Probá ingresar con tu cuenta.");
      } else setError(result.error || "Error al crear la cuenta.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white">
      <AccessCard>
        <button onClick={onBack} className="text-sm font-medium text-cyan-300">← Volver</button>
        <h2 className="mt-5 text-center text-2xl font-bold">Crear cuenta</h2>
        <div className="mt-6 space-y-4">
          <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button onClick={handleRegister} disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </div>
      </AccessCard>
    </div>
  );
}

// ─── HOME SCREEN (CON MÓDULOS FUNCIONALES) ──
function HomeScreen({ userProfile, authUser, pendingName, onLogout }) {
  const [activeModule, setActiveModule] = useState(null);
  const [showTerceroModal, setShowTerceroModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // NOMBRE DEL USUARIO con fallbacks
  const nombreUsuario = userProfile?.nombre
    || pendingName
    || (typeof window !== "undefined" && window.sessionStorage?.getItem("traza360_pending_name"))
    || authUser?.email?.split("@")[0]
    || "Usuario";

  const planNombre = userProfile?.plan === "premium_personal" ? "Premium Personal"
    : userProfile?.plan === "premium_familiar" ? "Premium Familiar"
    : "Gratis";

  async function handleLogout() {
    setLoggingOut(true);
    try { window.sessionStorage.removeItem("traza360_pending_name"); } catch(e){}
    await signOut();
    setLoggingOut(false);
    onLogout();
  }

  const quickCards = [
    { key: "tercero", emoji: "👁️", title: "Tercero Remoto", text: "Cuidadores con audio y ubicación en vivo." },
    { key: "violencia", emoji: "🛡️", title: "Violencia de género", text: "Pánico, grabación y red de apoyo." },
    { key: "adolescente", emoji: "🧑‍🎓", title: "Adolescente seguro", text: "Anti-bullying, GPS y geocercas." },
    { key: "adulto_mayor", emoji: "🫶", title: "Adulto mayor seguro", text: "Medicamentos, caídas y geocercas." },
    { key: "hogar", emoji: "🏠", title: "Hogar seguro", text: "Intrusos, vecinos y accidentes." },
    { key: "trabajo", emoji: "💼", title: "Trabajo seguro", text: "Acompañantes y domicilios." },
  ];

  function handleQuickCardClick(key) {
    if (key === "tercero") {
      setShowTerceroModal(true);
    } else {
      const mod = MODULES.find((m) => m.key === key);
      if (mod) setActiveModule(mod);
    }
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Panel inicial</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Bienvenido/a, {nombreUsuario} 👋</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Tu red de protección está activa. Plan actual: <span className="text-cyan-300 font-semibold">{planNombre}</span>.
              </p>
            </div>
            <button onClick={handleLogout} disabled={loggingOut} className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>

        {/* MÓDULO ACTIVO (cuando clickeás una tarjeta) */}
        {activeModule && (
          <div className="mb-8">
            <button onClick={() => setActiveModule(null)} className="mb-4 text-sm text-cyan-300 hover:text-cyan-200">
              ← Volver al panel
            </button>
            <ModuleCard m={activeModule} autoExpand={true} />
          </div>
        )}

        {/* TARJETAS CLICKEABLES */}
        {!activeModule && (
          <>
            <h3 className="mb-4 text-lg font-bold text-slate-200">¿Qué necesitás hoy?</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickCards.map((card) => (
                <button key={card.key} onClick={() => handleQuickCardClick(card.key)}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-cyan-400/30 active:scale-[0.98] transition-all">
                  <div className="mb-2 text-2xl">{card.emoji}</div>
                  <div className="text-base font-semibold text-slate-100">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{card.text}</p>
                  <div className="mt-3 text-xs font-semibold text-cyan-300">Abrir →</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showTerceroModal && <TerceroRemotoModal onClose={() => setShowTerceroModal(false)} />}
      <WhatsAppFloatingButton />
    </div>
  );
}

// ─── APP PRINCIPAL ──────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [userProfile, setUserProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [pendingName, setPendingName] = useState(null);

  useEffect(() => {
    checkSession();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
        () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
    // Recuperar nombre pendiente al recargar
    try {
      const stored = window.sessionStorage?.getItem("traza360_pending_name");
      if (stored) setPendingName(stored);
    } catch(e){}
  }, []);

  async function checkSession() {
    const result = await getCurrentUser();
    if (result && result.authUser) {
      setAuthUser(result.authUser);
      setUserProfile(result.profile);

      // FIX: Si no hay perfil pero hay authUser, intentar crearlo
      if (!result.profile && result.authUser) {
        await tryCreateProfile(result.authUser);
      }

      setScreen("home");
    } else {
      setScreen("landing");
    }
  }

  // Si no se creó el perfil al registrarse, se intenta acá
  async function tryCreateProfile(user) {
    try {
      const storedName = window.sessionStorage?.getItem("traza360_pending_name");
      const fallbackName = storedName || user.email?.split("@")[0] || "Usuario";

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: user.id,
          nombre: fallbackName,
          email: user.email,
          plan: 'gratis',
          modo: 'me_protejo',
        })
        .select()
        .single();

      if (!error && data) {
        setUserProfile(data);
      } else {
        console.log("No se pudo crear perfil (posiblemente ya existe):", error);
      }
    } catch (e) {
      console.error("Error en tryCreateProfile:", e);
    }
  }

  async function handleLoginSuccess() {
    const result = await getCurrentUser();
    if (result && result.authUser) {
      setAuthUser(result.authUser);
      setUserProfile(result.profile);
      if (!result.profile) await tryCreateProfile(result.authUser);
    }
    setScreen("home");
  }

  function handleLogout() {
    setUserProfile(null);
    setAuthUser(null);
    setPendingName(null);
    try { window.sessionStorage.removeItem("traza360_pending_name"); } catch(e){}
    setScreen("landing");
  }

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05080f] text-slate-100">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg shadow-purple-500/20 animate-pulse">
              <span className="text-3xl">🛡️</span>
            </div>
          </div>
          <div className="text-lg font-bold">TRAZA 360</div>
          <div className="text-xs text-slate-400 mt-1">Cargando...</div>
        </div>
      </div>
    );
  }

  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={handleLoginSuccess} setPendingName={setPendingName} />;
  if (screen === "home") return <HomeScreen userProfile={userProfile} authUser={authUser} pendingName={pendingName} onLogout={handleLogout} />;
  return <LandingScreen onScreen={setScreen} />;
}
