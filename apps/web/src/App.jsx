import React, { useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa (single file)
   Versión: 6.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   5 MÓDULOS:
   - Violencia de género
   - Adolescente seguro
   - Adulto mayor seguro
   - Hogar seguro
   - Trabajo seguro
   
   FUNCIONES TRANSVERSALES:
   - Abanico expandible con sub-botones
   - Timers con PIN de cancelación
   - GPS a casa (Google Maps)
   - Transporte de confianza (Uber)
   - Compartir ubicación en tiempo real
   - Ubicación automática en toda alerta crítica (con fallback a última conocida)
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER = "549XXXXXXXXXX"; // ← REEMPLAZAR con tu número real
const PIN_DEFAULT = "1234";              // ← PIN para cancelar timers
const HOME_ADDRESS_DEFAULT = "Mi casa";  // ← Alias o dirección real del hogar

// ─── GEOLOCALIZACIÓN ────────────────────────
// Guardamos la última ubicación conocida para fallback en alertas críticas
let lastKnownLocation = null;

function saveLastLocation(lat, lng) {
  lastKnownLocation = { lat, lng, timestamp: Date.now() };
  try {
    // Guardamos también en memoria del browser para persistencia entre sesiones
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("traza360_last_location", JSON.stringify(lastKnownLocation));
    }
  } catch (e) {
    // Si sessionStorage no está disponible, seguimos con la variable en memoria
  }
}

function loadLastLocation() {
  if (lastKnownLocation) return lastKnownLocation;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = window.sessionStorage.getItem("traza360_last_location");
      if (raw) {
        lastKnownLocation = JSON.parse(raw);
        return lastKnownLocation;
      }
    }
  } catch (e) {}
  return null;
}

// Obtiene ubicación actual. Si falla, usa la última conocida.
function getCurrentLocationWithFallback() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ location: loadLastLocation(), source: "fallback" });
      return;
    }
    const timeoutId = setTimeout(() => {
      resolve({ location: loadLastLocation(), source: "fallback" });
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
        saveLastLocation(loc.lat, loc.lng);
        resolve({ location: loc, source: "live" });
      },
      () => {
        clearTimeout(timeoutId);
        resolve({ location: loadLastLocation(), source: "fallback" });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

// Construye link de Google Maps desde coords
function buildMapLink(loc) {
  if (!loc) return null;
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

// ─── WHATSAPP CORE ──────────────────────────
function openWhatsAppWithMessage(text) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Envía alerta por WhatsApp incluyendo ubicación (live o última conocida)
async function sendAlertWithLocation(baseMessage) {
  const { location, source } = await getCurrentLocationWithFallback();
  let finalMessage = baseMessage;
  if (location) {
    const mapLink = buildMapLink(location);
    const tag = source === "live" ? "📍 Ubicación en tiempo real" : "📍 Última ubicación registrada";
    finalMessage += `\n\n${tag}:\n${mapLink}`;
  } else {
    finalMessage += "\n\n⚠️ No se pudo obtener ubicación. Contacten por otros medios.";
  }
  openWhatsAppWithMessage(finalMessage);
}

// Compartir ubicación en tiempo real: inicia el tracking + envía mensaje
async function shareLiveLocation() {
  const { location, source } = await getCurrentLocationWithFallback();
  if (!location) {
    openWhatsAppWithMessage("📍 Quiero compartir mi ubicación pero no logro obtenerla. Por favor contáctenme.");
    return;
  }
  const mapLink = buildMapLink(location);
  const tag = source === "live" ? "en tiempo real" : "(última registrada)";
  const message = `📍 Comparto mi ubicación ${tag} y activo seguimiento continuo:\n${mapLink}\n\nTraza 360 seguirá actualizando mi ubicación mientras la app esté activa.`;
  openWhatsAppWithMessage(message);

  // Activar watchPosition para ir actualizando ubicación en segundo plano
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
  }
}

// Abre Google Maps con navegación a un destino (dirección o coords)
function openMapsTo(destination) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Abre Uber con destino
function openUber(destination) {
  const url = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(destination)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─── SVG ICONS ──────────────────────────────
function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WhatsAppFloatingButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        type="button"
        aria-label="Abrir WhatsApp"
        onClick={() => openWhatsAppWithMessage("Hola, quiero información sobre Traza 360.")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        <WhatsAppIcon size={28} />
      </button>
    </div>
  );
}

// ─── ACCIÓN: COMPARTIR UBICACIÓN (común a todos los módulos) ───
const SHARE_LOCATION_ACTION = {
  key: "compartir_ubicacion",
  icon: "📡",
  name: "Compartir ubicación en tiempo real",
  desc: "Envío mi ubicación y activo seguimiento continuo a mis contactos.",
  type: "share_location",
};

// ─── DATOS: 5 MÓDULOS CON ABANICO ───────────
// Tipos de action:
//   - "whatsapp"        : abre WhatsApp con mensaje (sin ubicación)
//   - "alert"           : alerta crítica - envía mensaje + ubicación automática
//   - "timer"           : modal con timer + PIN; al expirar dispara alerta con ubicación
//   - "maps"            : abre Google Maps con navegación
//   - "uber"            : abre Uber con destino
//   - "share_location"  : comparte ubicación en vivo + activa seguimiento
const MODULES = [
  {
    key: "violencia",
    emoji: "🛡️",
    title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo ante situaciones de riesgo.",
    color: "from-fuchsia-500 to-rose-500",
    border: "border-fuchsia-500/20",
    accentBg: "bg-fuchsia-500/10",
    accentBorder: "border-fuchsia-500/30",
    accentText: "text-fuchsia-300",
    actions: [
      {
        key: "panico",
        icon: "🚨",
        name: "Botón de pánico",
        desc: "Alerta inmediata + ubicación automática + red de apoyo activa.",
        type: "alert",
        message: "🚨 ALERTA · Botón de pánico activado. Necesito ayuda urgente.",
      },
      SHARE_LOCATION_ACTION,
      {
        key: "grabar_audio",
        icon: "🎙️",
        name: "Grabar sonido ambiente",
        desc: "Graba audio del entorno como evidencia.",
        type: "whatsapp",
        message: "🎙️ Inicié grabación de sonido ambiente como evidencia. Situación en curso.",
      },
      {
        key: "grabar_video",
        icon: "🎥",
        name: "Grabar video",
        desc: "Activa grabación de video como respaldo.",
        type: "whatsapp",
        message: "🎥 Activé grabación de video como evidencia. Situación en curso.",
      },
      {
        key: "archivos",
        icon: "📁",
        name: "Carpeta de archivos",
        desc: "Accedé a tus evidencias guardadas (audios, videos, fotos).",
        type: "whatsapp",
        message: "📁 Quiero consultar mis archivos y evidencias guardadas en Traza 360.",
      },
      {
        key: "entro_casa_de",
        icon: "🏘️",
        name: "Entro a la casa de...",
        desc: "Aviso que entro a un domicilio y comparto ubicación.",
        type: "alert",
        message: "🏘️ Entro a la casa de [completar nombre]. Aviso a mis contactos.",
      },
      {
        key: "me_reuno_con",
        icon: "👥",
        name: "Me reúno con...",
        desc: "Aviso que me encuentro con alguien en un lugar.",
        type: "alert",
        message: "👥 Me reúno con [completar nombre]. Les comparto ubicación y horario.",
      },
      {
        key: "ingreso_lugar_desconocido",
        icon: "⏱️",
        name: "Ingreso a lugar desconocido",
        desc: "Timer de seguridad. Si no cancelás con PIN, se dispara alerta + ubicación.",
        type: "timer",
        minutes: 30,
        triggerMessage: "⚠️ ALERTA · Ingresé a un lugar desconocido y no cancelé el timer. Revisen mi ubicación urgente.",
      },
      {
        key: "transporte",
        icon: "🚗",
        name: "Llamar transporte de confianza",
        desc: "Abre Uber con destino a tu casa para movilidad segura.",
        type: "uber",
        destination: HOME_ADDRESS_DEFAULT,
      },
    ],
  },
  {
    key: "adolescente",
    emoji: "🧑‍🎓",
    title: "Adolescente seguro",
    desc: "Salidas, regresos y trayectos con trazabilidad. Autonomía con respaldo.",
    color: "from-sky-400 to-cyan-500",
    border: "border-sky-500/20",
    accentBg: "bg-sky-500/10",
    accentBorder: "border-sky-500/30",
    accentText: "text-sky-300",
    actions: [
      {
        key: "peligro",
        icon: "🚨",
        name: "Estoy en peligro (SOS)",
        desc: "Alerta inmediata + ubicación automática + seguimiento en tiempo real.",
        type: "alert",
        message: "🚨 SOS · Estoy en peligro. Necesito ayuda urgente.",
      },
      SHARE_LOCATION_ACTION,
      {
        key: "sali_voy_a",
        icon: "🚶",
        name: "Salí de casa, voy a lo de...",
        desc: "Aviso que salí y a qué lugar o persona voy.",
        type: "alert",
        message: "🚶 Salí de casa. Voy a lo de [completar]. Les aviso cuando llegue.",
      },
      {
        key: "vuelvo_a_las",
        icon: "🕐",
        name: "Vuelvo a las...",
        desc: "Indico hora estimada de regreso. Si no vuelvo, avisa a mis contactos.",
        type: "whatsapp",
        message: "🕐 Vuelvo a casa a las [completar hora]. Si no regreso en tiempo, avisen a mis contactos.",
      },
      {
        key: "llegar_a_casa",
        icon: "🗺️",
        name: "Llegar a casa (GPS)",
        desc: "Abre Google Maps con navegación directa a tu casa.",
        type: "maps",
        destination: HOME_ADDRESS_DEFAULT,
      },
      {
        key: "llegue_bien",
        icon: "✅",
        name: "Llegué bien",
        desc: "Confirmación de llegada. Cierra el seguimiento.",
        type: "whatsapp",
        message: "✅ Llegué bien. Todo en orden.",
      },
      {
        key: "lugar_desconocido",
        icon: "⏱️",
        name: "Entré a un lugar desconocido",
        desc: "Timer de seguridad. Si no cancelás con PIN, se dispara alerta + ubicación.",
        type: "timer",
        minutes: 45,
        triggerMessage: "⚠️ ALERTA · Entré a un lugar desconocido y no cancelé el timer. Revisen mi ubicación.",
      },
      {
        key: "perdido",
        icon: "📍",
        name: "Estoy perdido",
        desc: "Envía mi ubicación actual a contactos elegidos.",
        type: "alert",
        message: "📍 Estoy perdido. Necesito ayuda.",
      },
      {
        key: "transporte",
        icon: "🚗",
        name: "Llamar transporte de confianza",
        desc: "Abre Uber con destino a tu casa para movilidad segura.",
        type: "uber",
        destination: HOME_ADDRESS_DEFAULT,
      },
    ],
  },
  {
    key: "adulto_mayor",
    emoji: "🫶",
    title: "Adulto mayor seguro",
    desc: "Seguimiento, medicamentos y asistencia ante caídas o desorientación.",
    color: "from-amber-400 to-orange-500",
    border: "border-amber-500/20",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    accentText: "text-amber-300",
    actions: [
      {
        key: "me_cai",
        icon: "🆘",
        name: "Me caí",
        desc: "Alerta inmediata por caída + ubicación a cuidadores.",
        type: "alert",
        message: "🆘 ALERTA · Me caí. Necesito asistencia.",
      },
      SHARE_LOCATION_ACTION,
      {
        key: "medicamentos",
        icon: "💊",
        name: "Tomé la medicación",
        desc: "Confirmo que tomé la medicación del horario.",
        type: "whatsapp",
        message: "💊 Tomé la medicación del horario correspondiente. Todo en orden.",
      },
      {
        key: "recordatorio_meds",
        icon: "⏰",
        name: "Recordatorio de medicamentos",
        desc: "Solicitar configuración de avisos programados.",
        type: "whatsapp",
        message: "⏰ Quiero configurar recordatorios de medicamentos para los horarios diarios.",
      },
      {
        key: "llamar_familiar",
        icon: "📞",
        name: "Llamar a familiar",
        desc: "Contactar rápido con familiar o cuidador asignado.",
        type: "whatsapp",
        message: "📞 Necesito hablar con mi familiar o cuidador. ¿Pueden contactarlo?",
      },
      {
        key: "llegar_a_casa",
        icon: "🗺️",
        name: "Llegar a casa (GPS)",
        desc: "Abre Google Maps con navegación directa a tu casa.",
        type: "maps",
        destination: HOME_ADDRESS_DEFAULT,
      },
      {
        key: "me_perdi",
        icon: "📍",
        name: "Me perdí",
        desc: "Envía mi ubicación actual a familiares y cuidadores.",
        type: "alert",
        message: "📍 Me perdí. No sé dónde estoy. Necesito ayuda.",
      },
      {
        key: "no_me_siento_bien",
        icon: "💔",
        name: "No me siento bien",
        desc: "Aviso de descompensación + ubicación + llamado a cuidador.",
        type: "alert",
        message: "💔 No me siento bien. Necesito asistencia médica o de mi cuidador.",
      },
      {
        key: "check_in",
        icon: "✅",
        name: "Estoy bien - Check-in",
        desc: "Confirmación diaria de que todo está en orden.",
        type: "whatsapp",
        message: "✅ Check-in diario: Estoy bien, todo en orden.",
      },
    ],
  },
  {
    key: "hogar",
    emoji: "🏠",
    title: "Hogar seguro",
    desc: "Protección en domicilio: intrusos, vecinos, emergencias y accidentes.",
    color: "from-violet-500 to-purple-500",
    border: "border-violet-500/20",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/30",
    accentText: "text-violet-300",
    actions: [
      {
        key: "intruso",
        icon: "🚨",
        name: "Intruso en domicilio",
        desc: "Alerta inmediata + ubicación del hogar + llamado a contactos.",
        type: "alert",
        message: "🚨 ALERTA · Posible intruso en mi domicilio. Necesito ayuda urgente.",
      },
      SHARE_LOCATION_ACTION,
      {
        key: "ruido_sospechoso",
        icon: "👂",
        name: "Ruido sospechoso",
        desc: "Aviso preventivo a contactos con ubicación del hogar.",
        type: "alert",
        message: "👂 Escucho ruido sospechoso en mi domicilio. Estén atentos.",
      },
      {
        key: "llamar_vecino",
        icon: "🏘️",
        name: "Llamar a vecino",
        desc: "Contactar rápido con un vecino de confianza.",
        type: "whatsapp",
        message: "🏘️ Necesito contactar a mi vecino de confianza. ¿Pueden avisarle?",
      },
      {
        key: "problema_vecino",
        icon: "⚠️",
        name: "Problema con vecino",
        desc: "Reportá un conflicto o situación con un vecino.",
        type: "alert",
        message: "⚠️ Tengo un problema con un vecino. Necesito ayuda o mediación.",
      },
      {
        key: "accidente_domestico",
        icon: "🩹",
        name: "Accidente doméstico",
        desc: "Aviso de accidente en el hogar + ubicación a contactos.",
        type: "alert",
        message: "🩹 ALERTA · Tuve un accidente doméstico. Necesito asistencia en mi domicilio.",
      },
      {
        key: "ingreso_hogar",
        icon: "⏱️",
        name: "Ingreso con timer",
        desc: "Timer de seguridad al entrar. Si no cancelás con PIN, se dispara alerta.",
        type: "timer",
        minutes: 15,
        triggerMessage: "⚠️ ALERTA · No cancelé el timer de ingreso al domicilio. Revisen mi situación.",
      },
      {
        key: "emergencia_hogar",
        icon: "🆘",
        name: "Emergencia en el hogar",
        desc: "Alerta máxima + ubicación + contactos de emergencia.",
        type: "alert",
        message: "🆘 EMERGENCIA en el hogar. Necesito asistencia inmediata.",
      },
    ],
  },
  {
    key: "trabajo",
    emoji: "💼",
    title: "Trabajo seguro",
    desc: "Protección para acompañantes nocturnas, trabajos a domicilio y situaciones de riesgo laboral.",
    color: "from-emerald-500 to-teal-500",
    border: "border-emerald-500/20",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    accentText: "text-emerald-300",
    actions: [
      {
        key: "ingreso_domicilio_desconocido",
        icon: "⏱️",
        name: "Ingreso a domicilio desconocido",
        desc: "Timer al entrar a trabajar. Si no cancelás con PIN, se dispara alerta + ubicación.",
        type: "timer",
        minutes: 60,
        triggerMessage: "⚠️ ALERTA · Ingresé a un domicilio desconocido por trabajo y no cancelé el timer. Revisen mi ubicación urgente.",
      },
      {
        key: "peligro",
        icon: "🚨",
        name: "Estoy en peligro (SOS)",
        desc: "Alerta inmediata + ubicación automática + seguimiento en tiempo real.",
        type: "alert",
        message: "🚨 SOS · Estoy en peligro durante mi trabajo. Necesito ayuda urgente.",
      },
      SHARE_LOCATION_ACTION,
      {
        key: "salgo_con_desconocido",
        icon: "🧑‍🤝‍🧑",
        name: "Salgo con desconocido/a",
        desc: "Aviso que salgo con un cliente o persona no conocida + ubicación.",
        type: "alert",
        message: "🧑‍🤝‍🧑 Salgo con un/a cliente desconocido/a. Les comparto mi ubicación por seguridad.",
      },
      {
        key: "cliente_sospechoso",
        icon: "⚠️",
        name: "Cliente sospechoso",
        desc: "Aviso preventivo si algo no se siente bien con el cliente.",
        type: "alert",
        message: "⚠️ Cliente con actitud sospechosa. Estén atentos por si necesito ayuda.",
      },
      {
        key: "cambio_planes",
        icon: "🔄",
        name: "Cambio de planes / lugar",
        desc: "Aviso que cambié de lugar o extendí el trabajo, con ubicación actualizada.",
        type: "alert",
        message: "🔄 Cambio de planes o lugar durante el trabajo. Les actualizo mi ubicación.",
      },
      {
        key: "transporte",
        icon: "🚗",
        name: "Llamar transporte de confianza",
        desc: "Abre Uber con destino a tu casa al terminar el trabajo.",
        type: "uber",
        destination: HOME_ADDRESS_DEFAULT,
      },
      {
        key: "llegue_bien",
        icon: "✅",
        name: "Llegué bien / terminé el trabajo",
        desc: "Confirmación de que el trabajo terminó sin problemas. Cierra seguimiento.",
        type: "whatsapp",
        message: "✅ Terminé mi trabajo y estoy bien. Todo en orden.",
      },
    ],
  },
];

const PLANS = [
  {
    name: "Gratis",
    price: "US$0",
    sub: "Ideal para empezar y activar tu red básica de protección.",
    features: ["1 perfil", "2 contactos de confianza", "Alerta manual", "Ubicación en vivo en incidente"],
    cta: "Empezar gratis",
  },
  {
    name: "Premium Personal",
    price: "US$4.99/mes",
    sub: "Más seguimiento, historial y automatización para uso individual.",
    features: ["Todo lo gratis", "Historial de ubicaciones", "Hasta 5 contactos", "Geocercas", "Alertas automáticas"],
    cta: "Quiero Premium",
    highlight: true,
  },
  {
    name: "Premium Familiar",
    price: "US$9.99/mes",
    sub: "Diseñado para familias, cuidadores y varios perfiles protegidos.",
    features: ["Todo Premium Personal", "Varios perfiles protegidos", "Reportes", "Prioridad", "Módulos avanzados"],
    cta: "Consultar plan familiar",
  },
];

// ─── TIMER MODAL (PIN para cancelar) ────────
function TimerModal({ action, moduleColor, onClose }) {
  const [timeLeft, setTimeLeft] = useState(action.minutes * 60);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const triggeredRef = useRef(false);

  // Trackea ubicación mientras el timer corre
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!triggeredRef.current) {
        triggeredRef.current = true;
        // Al expirar, envía alerta CON ubicación automática
        sendAlertWithLocation(action.triggerMessage);
      }
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, action.triggerMessage]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  function handleCancel() {
    if (pin === PIN_DEFAULT) {
      onClose();
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
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
              <p className="mt-2 text-xs text-slate-400">
                Si no ingresás tu PIN antes de que termine el tiempo, se enviará una alerta automática con tu ubicación a tus contactos.
              </p>

              <div className={`my-6 rounded-2xl border ${moduleColor.accentBorder} ${moduleColor.accentBg} py-6`}>
                <div className="font-mono text-5xl font-bold text-white tabular-nums">
                  {mm}:{ss}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">Tiempo restante</div>
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError("");
                  }}
                  placeholder="Ingresá tu PIN"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-base text-white outline-none focus:border-cyan-400/50"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  onClick={handleCancel}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  Cancelar timer con PIN
                </button>

                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-400"
                >
                  Cerrar sin cancelar (mantiene el timer)
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-red-400">⚠️ Tiempo agotado</p>
              <p className="mt-2 text-xs text-slate-400">
                Se disparó la alerta automática con tu ubicación a tus contactos vía WhatsApp.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-white"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE CARD con abanico expandible ─────
function ModuleCard({ m }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);

  function handleAction(action) {
    switch (action.type) {
      case "timer":
        setActiveTimer(action);
        return;
      case "maps":
        openMapsTo(action.destination);
        return;
      case "uber":
        openUber(action.destination);
        return;
      case "share_location":
        shareLiveLocation();
        return;
      case "alert":
        // Alerta: envía mensaje + ubicación automática
        sendAlertWithLocation(action.message);
        return;
      case "whatsapp":
      default:
        openWhatsAppWithMessage(action.message);
        return;
    }
  }

  // Badge según tipo de acción
  function renderBadge(action) {
    if (action.type === "timer") {
      return (
        <div className={`mt-1.5 inline-block rounded-full ${m.accentBg} ${m.accentText} px-2 py-0.5 text-[10px] font-semibold`}>
          ⏱️ Timer {action.minutes} min
        </div>
      );
    }
    if (action.type === "maps") {
      return (
        <div className="mt-1.5 inline-block rounded-full bg-blue-500/10 text-blue-300 px-2 py-0.5 text-[10px] font-semibold">
          🗺️ Abre GPS
        </div>
      );
    }
    if (action.type === "uber") {
      return (
        <div className="mt-1.5 inline-block rounded-full bg-slate-700/50 text-slate-200 px-2 py-0.5 text-[10px] font-semibold">
          🚗 Abre Uber
        </div>
      );
    }
    if (action.type === "share_location") {
      return (
        <div className="mt-1.5 inline-block rounded-full bg-cyan-500/10 text-cyan-300 px-2 py-0.5 text-[10px] font-semibold">
          📡 Tracking en vivo
        </div>
      );
    }
    if (action.type === "alert") {
      return (
        <div className="mt-1.5 inline-block rounded-full bg-red-500/10 text-red-300 px-2 py-0.5 text-[10px] font-semibold">
          🚨 Alerta + Ubicación
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className={`rounded-2xl border ${m.border} bg-[#11182e] p-5 flex flex-col`}>
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}>
            <span className="text-2xl">{m.emoji}</span>
          </div>
          <h4 className="text-base font-bold text-slate-100">{m.title}</h4>
        </div>

        {/* Descripción */}
        <p className="mb-4 text-sm leading-relaxed text-slate-400">{m.desc}</p>

        {/* Botón expandible (abanico) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full rounded-2xl border ${m.accentBorder} ${m.accentBg} ${m.accentText} px-4 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-between hover:brightness-125`}
        >
          <span>{expanded ? "Ocultar opciones" : "Ver opciones"}</span>
          <span className={`text-xs transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>▼</span>
        </button>

        {/* ABANICO: Sub-botones desplegados */}
        {expanded && (
          <div className="mt-4 space-y-2">
            {m.actions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/10 active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{action.name}</div>
                    <div className="mt-0.5 text-[11px] leading-5 text-slate-400">{action.desc}</div>
                    {renderBadge(action)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTimer && (
        <TimerModal action={activeTimer} moduleColor={m} onClose={() => setActiveTimer(null)} />
      )}
    </>
  );
}

function PlanCard({ plan }) {
  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col ${
        plan.highlight
          ? "border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent"
          : "border-slate-800 bg-[#11182e]"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Más elegido
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-slate-100">{plan.name}</span>
        <span className={`text-base font-bold ${plan.highlight ? "text-orange-400" : "text-slate-300"}`}>
          {plan.price}
        </span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-slate-400">{plan.sub}</p>

      <div className="mb-5 space-y-2 flex-1">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm">
            <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
            <span className="text-slate-300">{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => openWhatsAppWithMessage(`Hola, quiero consultar el plan ${plan.name} de Traza 360.`)}
        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 w-full ${
          plan.highlight
            ? "bg-[#25D366] text-white hover:bg-[#20BD5A] shadow-lg shadow-[#25D366]/20"
            : "bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/15"
        }`}
      >
        <WhatsAppIcon size={18} />
        <span>{plan.cta}</span>
      </button>
    </div>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }) {
  return (
    <label className="block space-y-2 text-left">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
      />
    </label>
  );
}

function AccessCard({ children }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl md:p-8">
      {children}
    </div>
  );
}

// ─── SECTIONS ───────────────────────────────
function Hero() {
  return (
    <section className="px-5 pt-16 pb-12 text-center">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg shadow-purple-500/20">
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-3xl font-extrabold text-transparent">
            TRAZA 360
          </h1>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Última señal. Respuesta real.
        </p>

        <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
          Cuando cada segundo importa,
          <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent">
            {" "}Traza 360 responde.
          </span>
        </h2>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
          Protección, seguimiento y asistencia para personas en situación de riesgo o vulnerabilidad. Diseñada para familias, cuidadores, trabajadores y contextos de emergencia.
        </p>
      </div>
    </section>
  );
}

function LandingActions({ onScreen }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <button
        onClick={() => onScreen("login")}
        className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
      >
        Ingresar con mi cuenta
      </button>

      <button
        onClick={() => onScreen("register")}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white hover:bg-slate-800/60"
      >
        Crear cuenta
      </button>

      <button
        onClick={() => openWhatsAppWithMessage("Hola, quiero solicitar una demo de Traza 360.")}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-4 py-3 text-sm font-semibold hover:bg-[#25D366]/15"
      >
        <WhatsAppIcon size={18} />
        <span>Solicitar demo por WhatsApp</span>
      </button>
    </div>
  );
}

// ─── SCREENS ────────────────────────────────
function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <Hero />

      <div className="px-5 pb-12">
        <LandingActions onScreen={onScreen} />
      </div>

      {/* 5 Módulos */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">Soluciones según tu necesidad</h3>
          <p className="mb-10 text-center text-sm text-slate-400">
            Hacé clic en "Ver opciones" para desplegar el menú completo de cada módulo.
          </p>

          {/* Primeros 4 en grid 2x2 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULES.slice(0, 4).map((m) => (
              <ModuleCard key={m.key} m={m} />
            ))}
          </div>

          {/* Trabajo seguro ancho completo */}
          <div className="mt-4">
            <ModuleCard m={MODULES[4]} />
          </div>
        </div>
      </section>

      {/* Planes */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">
            Elegí cómo querés usar Traza 360
          </h3>
          <p className="mb-10 text-center text-sm text-slate-400">
            Protección básica gratis. Más seguimiento, historial y coordinación en Premium.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-slate-800/50 px-5 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 text-sm text-slate-400">¿Tenés dudas? Hablá con nosotros.</p>
          <button
            onClick={() => openWhatsAppWithMessage("Hola, quiero información sobre Traza 360.")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-[#25D366]/20 hover:bg-[#20BD5A]"
          >
            <WhatsAppIcon size={18} />
            <span>Hablar por WhatsApp</span>
          </button>

          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-red-400">📞 911</span>
            <span className="text-xs text-slate-500">En emergencias inmediatas, contactá primero al servicio oficial.</span>
          </div>

          <p className="mt-6 text-xs text-slate-600">Traza 360 © 2026 · Hecho en Argentina 🇦🇷</p>
        </div>
      </section>

      <WhatsAppFloatingButton />
    </div>
  );
}

function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white">
      <AccessCard>
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          ← Volver
        </button>

        <div className="mt-5 text-center">
          <h2 className="text-2xl font-bold">Ingresar</h2>
          <p className="mt-2 text-sm text-slate-400">Accedé a tu cuenta de Traza 360</p>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            onClick={onSuccess}
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg"
          >
            Ingresar
          </button>
        </div>
      </AccessCard>
    </div>
  );
}

function RegisterScreen({ onBack, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("me_protejo");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 py-8 text-white">
      <AccessCard>
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          ← Volver
        </button>

        <div className="mt-5 text-center">
          <h2 className="text-2xl font-bold">Crear cuenta</h2>
          <p className="mt-2 text-sm text-slate-400">Creá tu acceso y activá tu red de protección</p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-200">¿Cómo vas a usar Traza 360?</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "me_protejo", label: "Me protejo" },
              { key: "cuido_a_alguien", label: "Cuido a alguien" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  mode === opt.key
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            onClick={onSuccess}
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg"
          >
            Crear cuenta
          </button>
        </div>
      </AccessCard>
    </div>
  );
}

function HomeScreen({ onLogout }) {
  const quickCards = useMemo(
    () => [
      { emoji: "🛡️", title: "Violencia de género", text: "Pánico, grabación, transporte y red de apoyo." },
      { emoji: "🧑‍🎓", title: "Adolescente seguro", text: "Salida, regreso, GPS a casa y transporte." },
      { emoji: "🫶", title: "Adulto mayor seguro", text: "Medicamentos, caídas, GPS a casa y familia." },
      { emoji: "🏠", title: "Hogar seguro", text: "Intrusos, vecinos, accidentes y resguardo." },
      { emoji: "💼", title: "Trabajo seguro", text: "Acompañantes, domicilios y situaciones de riesgo laboral." },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Panel inicial</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Bienvenido a Traza 360</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                Accedé a los 5 módulos desde la landing. Cada uno tiene su abanico completo de acciones con ubicación automática.
              </p>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10">
              <div className="mb-2 text-2xl">{card.emoji}</div>
              <div className="text-base font-semibold text-slate-100">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      <WhatsAppFloatingButton />
    </div>
  );
}

// ─── APP ROOT ───────────────────────────────
export default function App() {
  // Al iniciar, intentamos capturar ubicación para tener un punto de partida
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const [screen, setScreen] = useState("landing");

  if (screen === "login") {
    return <LoginScreen onBack={() => setScreen("landing")} onSuccess={() => setScreen("home")} />;
  }

  if (screen === "register") {
    return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={() => setScreen("home")} />;
  }

  if (screen === "home") {
    return <HomeScreen onLogout={() => setScreen("landing")} />;
  }

  return <LandingScreen onScreen={setScreen} />;
}
