import React, { useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa
   Versión: 8.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   NOVEDAD v8: Módulo "Tercero Remoto"
   - Vinculación con timer (6h/12h/24h gratis · 30 días/permanente Premium)
   - Persona vulnerable activa escucha y ubicación cuando quiere
   - Control total del usuario vulnerable sobre duración
   - Notificación visible cada vez que tercero accede
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER = "549XXXXXXXXXX";
const PIN_DEFAULT = "1234";
const HOME_ADDRESS_DEFAULT = "Mi casa";

// Límites por plan
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

// ─── TERCERO REMOTO: Gestión de vinculaciones ──
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

// Genera código de 6 dígitos para vinculación
function generarCodigoVinculacion() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Opciones de duración de vinculación según plan
const DURACIONES = [
  { key: "6h", label: "6 horas", minutos: 360, plan: "gratis", gancho: false },
  { key: "12h", label: "12 horas", minutos: 720, plan: "gratis", gancho: false },
  { key: "24h", label: "24 horas", minutos: 1440, plan: "gratis", gancho: false },
  { key: "30dias", label: "30 días", minutos: 43200, plan: "premium_personal", gancho: true },
  { key: "permanente", label: "Permanente", minutos: -1, plan: "premium_familiar", gancho: true },
];

// Opciones de duración de audio que activa la persona vulnerable
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

async function sendAlertWithLocation(baseMessage) {
  const { location, source } = await getCurrentLocationWithFallback();
  let finalMessage = baseMessage;
  if (location) {
    const tag = source === "live" ? "📍 Ubicación en tiempo real" : "📍 Última ubicación registrada";
    finalMessage += `\n\n${tag}:\n${buildMapLink(location)}`;
  } else {
    finalMessage += "\n\n⚠️ No se pudo obtener ubicación. Contacten por otros medios.";
  }
  openWhatsAppWithMessage(finalMessage);
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
const TERCERO_REMOTO_ACTION = { key: "tercero_remoto", icon: "👁️", name: "Tercero Remoto", desc: "Vinculá un cuidador que pueda escuchar audio y ver ubicación cuando vos lo actives.", type: "tercero_remoto" };

// ─── MODAL: TERCERO REMOTO ──────────────────
function TerceroRemotoModal({ module, onClose }) {
  const [vista, setVista] = useState("menu"); // menu | vincular | lista | audio
  const [terceros, setTerceros] = useState(loadTerceros());
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [duracion, setDuracion] = useState("24h");
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [error, setError] = useState("");

  // Estado de escucha activa
  const [audioActivo, setAudioActivo] = useState(false);
  const [audioDuracion, setAudioDuracion] = useState("15min");
  const [audioRestante, setAudioRestante] = useState(0);
  const [terceroSeleccionado, setTerceroSeleccionado] = useState(null);

  const plan = "gratis"; // ← Cambiar según plan real del usuario
  const limites = PLAN_LIMITS[plan];
  const maxTerceros = limites.terceros;

  useEffect(() => { saveTerceros(terceros); }, [terceros]);

  // Countdown del audio activo
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

    const codigo = generarCodigoVinculacion();
    setCodigoGenerado(codigo);

    const expira = duracionData.minutos === -1 ? null : Date.now() + duracionData.minutos * 60 * 1000;
    const nuevoTercero = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      codigo,
      duracionKey: duracion,
      duracionLabel: duracionData.label,
      creado: Date.now(),
      expira,
      activo: true,
    };
    setTerceros((prev) => [...prev, nuevoTercero]);

    const mensaje = `Hola ${nombre}! Te vinculaste como Tercero Remoto en Traza 360. Tu código es: ${codigo}. Vinculación activa por ${duracionData.label}. Instalá la app: https://traza360.com`;
    openWhatsAppWithMessage(mensaje);
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
    setAudioRestante(duracionData.segundos === -1 ? 86400 : duracionData.segundos); // continuo = 24h max
    setAudioActivo(true);

    // Aviso al tercero por WhatsApp
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <h3 className="text-lg font-bold text-slate-100">Tercero Remoto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* VISTA: MENU PRINCIPAL */}
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
                className={`w-full rounded-xl border ${module.accentBorder} ${module.accentBg} ${module.accentText} px-4 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed`}>
                ➕ Vincular nuevo tercero
              </button>

              <button onClick={() => setVista("lista")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100">
                📋 Ver mis terceros vinculados ({terceros.length})
              </button>
            </div>

            {terceros.length >= maxTerceros && (
              <div className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3">
                <div className="text-xs text-orange-300 font-semibold">🚀 Pasate a Premium</div>
                <div className="text-[11px] text-slate-400 mt-1">Premium Personal: 3 terceros. Premium Familiar: 5 terceros + vinculación permanente.</div>
                <button onClick={() => openWhatsAppWithMessage("Hola, quiero pasarme a Premium para tener más terceros remotos.")}
                  className="mt-2 w-full rounded-lg bg-[#25D366] text-white py-2 text-xs font-semibold">
                  Consultar Premium por WhatsApp
                </button>
              </div>
            )}
          </>
        )}

        {/* VISTA: VINCULAR NUEVO */}
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
                <p className="text-xs text-slate-400 mb-4">
                  Se envió el código por WhatsApp a {nombre}. El tercero lo usa en su app para completar la vinculación.
                </p>
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
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del tercero (ej: Mi hija María)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />

                  <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono con WhatsApp (ej: 5491123456789)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />

                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Duración de la vinculación</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DURACIONES.map((d) => {
                        const bloqueado = d.plan !== "gratis" && plan === "gratis";
                        return (
                          <button key={d.key} onClick={() => !bloqueado && setDuracion(d.key)}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold relative ${
                              duracion === d.key && !bloqueado
                                ? `${module.accentBorder} ${module.accentBg} ${module.accentText}`
                                : "border-white/10 bg-white/5 text-slate-300"
                            } ${bloqueado ? "opacity-50" : ""}`}>
                            {d.label}
                            {bloqueado && <span className="absolute top-0.5 right-1 text-[9px] text-orange-400">🔒 Premium</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button onClick={handleVincular}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg">
                    Generar código y enviar por WhatsApp
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* VISTA: LISTA DE TERCEROS */}
        {vista === "lista" && (
          <>
            <button onClick={() => setVista("menu")} className="text-xs text-slate-400 mb-3">← Volver</button>

            {terceros.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👁️</div>
                <p className="text-sm text-slate-400">No tenés terceros vinculados todavía.</p>
                <button onClick={() => setVista("vincular")}
                  className={`mt-4 rounded-xl border ${module.accentBorder} ${module.accentBg} ${module.accentText} px-4 py-2 text-sm font-semibold`}>
                  Vincular primer tercero
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {terceros.map((t) => {
                  const expirado = t.expira !== null && t.expira < Date.now();
                  return (
                    <div key={t.id} className={`rounded-xl border p-3 ${expirado ? "border-red-500/20 bg-red-500/5" : `${module.accentBorder} ${module.accentBg}`}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100">{t.nombre}</div>
                          <div className="text-[11px] text-slate-400 truncate">📱 {t.telefono}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Duración: {t.duracionLabel} · {expirado ? "❌ Expirada" : `⏳ Queda: ${formatExpira(t.expira)}`}
                          </div>
                          <div className="text-[10px] text-slate-500">Código: <span className="font-mono">{t.codigo}</span></div>
                        </div>
                        <button onClick={() => removeTercero(t.id)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 shrink-0">
                          Quitar
                        </button>
                      </div>

                      {!expirado && (
                        <button onClick={() => iniciarAudioRemoto(t)}
                          className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-rose-500 py-2 text-xs font-semibold text-white">
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

        {/* VISTA: CONTROL DE AUDIO */}
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
                  <div className="text-[10px] text-slate-400 mt-2">
                    {terceroSeleccionado.nombre} puede escuchar tu entorno y ver tu ubicación.
                  </div>
                </div>

                <button onClick={detenerAudio}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg">
                  🔇 Detener audio ahora
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 text-xs leading-5 text-slate-400">
                  Elegí cuánto tiempo <strong className="text-slate-200">{terceroSeleccionado.nombre}</strong> puede escuchar tu audio y ver tu ubicación.
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {DURACIONES_AUDIO.map((d) => {
                    const bloqueado = d.plan !== "gratis" && plan === "gratis";
                    return (
                      <button key={d.key} onClick={() => !bloqueado && setAudioDuracion(d.key)}
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold relative ${
                          audioDuracion === d.key && !bloqueado
                            ? `${module.accentBorder} ${module.accentBg} ${module.accentText}`
                            : "border-white/10 bg-white/5 text-slate-300"
                        } ${bloqueado ? "opacity-50" : ""}`}>
                        {d.label}
                        {bloqueado && <div className="text-[9px] text-orange-400 mt-0.5">🔒 Premium</div>}
                      </button>
                    );
                  })}
                </div>

                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                <button onClick={activarAudio}
                  className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">
                  🎙️ Activar audio ahora
                </button>

                <p className="text-[10px] text-slate-500 text-center mt-2">
                  💡 Podés detenerlo en cualquier momento desde esta misma pantalla.
                </p>
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
  const insideMapRef = useRef({});

  useEffect(() => { saveZones(module.key, zones); }, [module.key, zones]);

  useEffect(() => {
    if (zones.length === 0 || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        saveLastLocation(lat, lng);
        zones.forEach((z) => {
          if (!z.active) return;
          const inside = distanceMeters(lat, lng, z.lat, z.lng) <= z.radius;
          const wasInside = insideMapRef.current[z.id] ?? null;
          if (wasInside === null) { insideMapRef.current[z.id] = inside; return; }
          if (!wasInside && inside) openWhatsAppWithMessage(`🟢 LLEGADA · Entré a la zona "${z.name}" (${module.title}).`);
          else if (wasInside && !inside) openWhatsAppWithMessage(`🔴 SALIDA · Salí de la zona "${z.name}" (${module.title}).`);
          insideMapRef.current[z.id] = inside;
        });
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [zones, module.key, module.title]);

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
        <p className="mb-5 text-xs text-slate-400">Agregá lugares como escuela, hogar o trabajo. Recibí aviso por WhatsApp al entrar o salir.</p>

        {zones.length > 0 && (
          <div className="mb-5 space-y-2">
            {zones.map((z) => (
              <div key={z.id} className={`rounded-xl border ${module.accentBorder} ${module.accentBg} p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{z.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{z.address}</div>
                    <div className="mt-1 text-[10px] text-slate-500">Radio: {z.radius}m · {z.active ? "🟢 Activa" : "⚪ Pausada"}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setZones((p) => p.map((zz) => zz.id === z.id ? { ...zz, active: !zz.active } : zz))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-200">{z.active ? "Pausar" : "Activar"}</button>
                    <button onClick={() => setZones((p) => p.filter((zz) => zz.id !== z.id))} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">Quitar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-200">➕ Agregar nueva zona</div>
          <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Nombre (ej: Escuela)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
          <input type="text" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="Dirección (ej: Av. Corrientes 1234, CABA)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
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

// ─── DATOS: 5 MÓDULOS ───────────────────────
const MODULES = [
  {
    key: "violencia", emoji: "🛡️", title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo ante situaciones de riesgo.",
    color: "from-fuchsia-500 to-rose-500", border: "border-fuchsia-500/20",
    accentBg: "bg-fuchsia-500/10", accentBorder: "border-fuchsia-500/30", accentText: "text-fuchsia-300",
    actions: [
      { key: "panico", icon: "🚨", name: "Botón de pánico", desc: "Alerta inmediata + ubicación + red de apoyo.", type: "alert", message: "🚨 ALERTA · Botón de pánico activado. Necesito ayuda urgente." },
      SHARE_LOCATION_ACTION,
      TERCERO_REMOTO_ACTION,
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Graba audio del entorno como evidencia.", type: "whatsapp", message: "🎙️ Inicié grabación de sonido ambiente como evidencia." },
      { key: "grabar_video", icon: "🎥", name: "Grabar video", desc: "Activa grabación de video como respaldo.", type: "whatsapp", message: "🎥 Activé grabación de video como evidencia." },
      { key: "archivos", icon: "📁", name: "Carpeta de archivos", desc: "Accedé a tus evidencias guardadas.", type: "whatsapp", message: "📁 Quiero consultar mis archivos en Traza 360." },
      { key: "entro_casa_de", icon: "🏘️", name: "Entro a la casa de...", desc: "Aviso y comparto ubicación.", type: "alert", message: "🏘️ Entro a la casa de [completar]." },
      { key: "me_reuno_con", icon: "👥", name: "Me reúno con...", desc: "Aviso que me encuentro con alguien.", type: "alert", message: "👥 Me reúno con [completar]." },
      { key: "ingreso_lugar_desconocido", icon: "⏱️", name: "Ingreso a lugar desconocido", desc: "Timer con PIN + alerta automática.", type: "timer", minutes: 30, triggerMessage: "⚠️ ALERTA · Ingresé a lugar desconocido y no cancelé el timer." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
    ],
  },
  {
    key: "adolescente", emoji: "🧑‍🎓", title: "Adolescente seguro",
    desc: "Salidas, regresos y trayectos con trazabilidad. Autonomía con respaldo.",
    color: "from-sky-400 to-cyan-500", border: "border-sky-500/20",
    accentBg: "bg-sky-500/10", accentBorder: "border-sky-500/30", accentText: "text-sky-300",
    actions: [
      { key: "peligro", icon: "🚨", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata + ubicación.", type: "alert", message: "🚨 SOS · Estoy en peligro." },
      SHARE_LOCATION_ACTION,
      TERCERO_REMOTO_ACTION,
      GEOFENCING_ACTION,
      { key: "sali_voy_a", icon: "🚶", name: "Salí de casa, voy a lo de...", desc: "Aviso con ubicación.", type: "alert", message: "🚶 Salí de casa. Voy a lo de [completar]." },
      { key: "vuelvo_a_las", icon: "🕐", name: "Vuelvo a las...", desc: "Indico hora de regreso.", type: "whatsapp", message: "🕐 Vuelvo a casa a las [completar]." },
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
      TERCERO_REMOTO_ACTION,
      GEOFENCING_ACTION,
      { key: "medicamentos", icon: "💊", name: "Tomé la medicación", desc: "Confirmación de toma.", type: "whatsapp", message: "💊 Tomé la medicación del horario." },
      { key: "recordatorio_meds", icon: "⏰", name: "Recordatorio de medicamentos", desc: "Configurar avisos.", type: "whatsapp", message: "⏰ Quiero configurar recordatorios de medicamentos." },
      { key: "llamar_familiar", icon: "📞", name: "Llamar a familiar", desc: "Contactar familiar/cuidador.", type: "whatsapp", message: "📞 Necesito hablar con mi familiar." },
      { key: "llegar_a_casa", icon: "🗺️", name: "Llegar a casa (GPS)", desc: "Abre Google Maps a tu casa.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "me_perdi", icon: "📍", name: "Me perdí", desc: "Envía ubicación.", type: "alert", message: "📍 Me perdí." },
      { key: "no_me_siento_bien", icon: "💔", name: "No me siento bien", desc: "Aviso de descompensación.", type: "alert", message: "💔 No me siento bien." },
      { key: "check_in", icon: "✅", name: "Check-in diario", desc: "Confirmación de que todo está bien.", type: "whatsapp", message: "✅ Check-in diario: Estoy bien." },
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
      TERCERO_REMOTO_ACTION,
      { key: "ruido_sospechoso", icon: "👂", name: "Ruido sospechoso", desc: "Aviso preventivo.", type: "alert", message: "👂 Ruido sospechoso en mi domicilio." },
      { key: "llamar_vecino", icon: "🏘️", name: "Llamar a vecino", desc: "Contactar vecino de confianza.", type: "whatsapp", message: "🏘️ Necesito contactar a mi vecino." },
      { key: "problema_vecino", icon: "⚠️", name: "Problema con vecino", desc: "Reportar conflicto.", type: "alert", message: "⚠️ Tengo un problema con un vecino." },
      { key: "accidente_domestico", icon: "🩹", name: "Accidente doméstico", desc: "Aviso + ubicación.", type: "alert", message: "🩹 ALERTA · Accidente doméstico." },
      { key: "ingreso_hogar", icon: "⏱️", name: "Ingreso con timer", desc: "Timer con PIN.", type: "timer", minutes: 15, triggerMessage: "⚠️ ALERTA · Timer de ingreso al domicilio vencido." },
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
      TERCERO_REMOTO_ACTION,
      GEOFENCING_ACTION,
      { key: "salgo_con_desconocido", icon: "🧑‍🤝‍🧑", name: "Salgo con desconocido/a", desc: "Aviso + ubicación.", type: "alert", message: "🧑‍🤝‍🧑 Salgo con cliente desconocido/a." },
      { key: "cliente_sospechoso", icon: "⚠️", name: "Cliente sospechoso", desc: "Aviso preventivo.", type: "alert", message: "⚠️ Cliente con actitud sospechosa." },
      { key: "cambio_planes", icon: "🔄", name: "Cambio de planes / lugar", desc: "Aviso con nueva ubicación.", type: "alert", message: "🔄 Cambio de planes en el trabajo." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue_bien", icon: "✅", name: "Llegué bien / terminé", desc: "Confirmación.", type: "whatsapp", message: "✅ Terminé mi trabajo y estoy bien." },
    ],
  },
];

const PLANS = [
  { name: "Gratis", price: "US$0", sub: "Lo básico + 1 Tercero Remoto con vinculación de hasta 24h.", features: ["1 perfil", "2 contactos de confianza", "1 Tercero Remoto (24h máx)", "Audio hasta 15 min", "Alerta manual + ubicación"], cta: "Empezar gratis" },
  { name: "Premium Personal", price: "US$4.99/mes", sub: "3 Terceros Remotos + vinculación de hasta 30 días + audio continuo.", features: ["Todo lo gratis", "3 Terceros Remotos", "Vinculación hasta 30 días", "Audio continuo 24/7", "Historial + geocercas"], cta: "Quiero Premium", highlight: true },
  { name: "Premium Familiar", price: "US$9.99/mes", sub: "5 Terceros Remotos + vinculación permanente + múltiples perfiles.", features: ["Todo Premium Personal", "5 Terceros Remotos", "Vinculación permanente", "Varios perfiles protegidos", "Reportes + prioridad"], cta: "Consultar plan familiar" },
];

// ─── TIMER MODAL ────────────────────────────
function TimerModal({ action, moduleColor, onClose }) {
  const [timeLeft, setTimeLeft] = useState(action.minutes * 60);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}, { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
              <p className="mt-2 text-xs text-slate-400">Si no ingresás tu PIN antes de que termine, se enviará alerta automática con tu ubicación.</p>
              <div className={`my-6 rounded-2xl border ${moduleColor.accentBorder} ${moduleColor.accentBg} py-6`}>
                <div className="font-mono text-5xl font-bold text-white tabular-nums">{mm}:{ss}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">Tiempo restante</div>
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
              <p className="mt-2 text-xs text-slate-400">Se disparó la alerta automática con tu ubicación.</p>
              <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-slate-700 py-3 text-sm font-semibold text-white">Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE CARD ────────────────────────────
function ModuleCard({ m }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showGeofencing, setShowGeofencing] = useState(false);
  const [showTerceroRemoto, setShowTerceroRemoto] = useState(false);

  function handleAction(action) {
    switch (action.type) {
      case "timer": setActiveTimer(action); return;
      case "maps": openMapsTo(action.destination); return;
      case "uber": openUber(action.destination); return;
      case "share_location": shareLiveLocation(); return;
      case "geofencing": setShowGeofencing(true); return;
      case "tercero_remoto": setShowTerceroRemoto(true); return;
      case "alert": sendAlertWithLocation(action.message); return;
      case "whatsapp":
      default: openWhatsAppWithMessage(action.message); return;
    }
  }

  function renderBadge(a) {
    if (a.type === "timer") return <div className={`mt-1.5 inline-block rounded-full ${m.accentBg} ${m.accentText} px-2 py-0.5 text-[10px] font-semibold`}>⏱️ Timer {a.minutes} min</div>;
    if (a.type === "maps") return <div className="mt-1.5 inline-block rounded-full bg-blue-500/10 text-blue-300 px-2 py-0.5 text-[10px] font-semibold">🗺️ Abre GPS</div>;
    if (a.type === "uber") return <div className="mt-1.5 inline-block rounded-full bg-slate-700/50 text-slate-200 px-2 py-0.5 text-[10px] font-semibold">🚗 Abre Uber</div>;
    if (a.type === "share_location") return <div className="mt-1.5 inline-block rounded-full bg-cyan-500/10 text-cyan-300 px-2 py-0.5 text-[10px] font-semibold">📡 Tracking en vivo</div>;
    if (a.type === "geofencing") return <div className="mt-1.5 inline-block rounded-full bg-purple-500/10 text-purple-300 px-2 py-0.5 text-[10px] font-semibold">🗺️ Geocercas</div>;
    if (a.type === "tercero_remoto") return <div className="mt-1.5 inline-block rounded-full bg-pink-500/10 text-pink-300 px-2 py-0.5 text-[10px] font-semibold">👁️ Cuidador remoto</div>;
    if (a.type === "alert") return <div className="mt-1.5 inline-block rounded-full bg-red-500/10 text-red-300 px-2 py-0.5 text-[10px] font-semibold">🚨 Alerta + Ubicación</div>;
    return null;
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
                    {renderBadge(action)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTimer && <TimerModal action={activeTimer} moduleColor={m} onClose={() => setActiveTimer(null)} />}
      {showGeofencing && <GeofencingModal module={m} onClose={() => setShowGeofencing(false)} />}
      {showTerceroRemoto && <TerceroRemotoModal module={m} onClose={() => setShowTerceroRemoto(false)} />}
    </>
  );
}

function PlanCard({ plan }) {
  return (
    <div className={`relative rounded-2xl border p-5 flex flex-col ${plan.highlight ? "border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent" : "border-slate-800 bg-[#11182e]"}`}>
      {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Más elegido</div>}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-slate-100">{plan.name}</span>
        <span className={`text-base font-bold ${plan.highlight ? "text-orange-400" : "text-slate-300"}`}>{plan.price}</span>
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
      <button onClick={() => openWhatsAppWithMessage(`Hola, quiero consultar el plan ${plan.name} de Traza 360.`)}
        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold w-full ${plan.highlight ? "bg-[#25D366] text-white hover:bg-[#20BD5A] shadow-lg shadow-[#25D366]/20" : "bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/15"}`}>
        <WhatsAppIcon size={18} /> <span>{plan.cta}</span>
      </button>
    </div>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }) {
  return (
    <label className="block space-y-2 text-left">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20" />
    </label>
  );
}

function AccessCard({ children }) {
  return <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl md:p-8">{children}</div>;
}

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

function LandingActions({ onScreen }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <button onClick={() => onScreen("login")} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30">Ingresar con mi cuenta</button>
      <button onClick={() => onScreen("register")} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white hover:bg-slate-800/60">Crear cuenta</button>
      <button onClick={() => openWhatsAppWithMessage("Hola, quiero solicitar una demo de Traza 360.")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-4 py-3 text-sm font-semibold hover:bg-[#25D366]/15">
        <WhatsAppIcon size={18} /> <span>Solicitar demo por WhatsApp</span>
      </button>
    </div>
  );
}

function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <Hero />
      <div className="px-5 pb-12"><LandingActions onScreen={onScreen} /></div>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">Soluciones según tu necesidad</h3>
          <p className="mb-10 text-center text-sm text-slate-400">Hacé clic en "Ver opciones" para desplegar cada módulo.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULES.slice(0, 4).map((m) => <ModuleCard key={m.key} m={m} />)}
          </div>
          <div className="mt-4"><ModuleCard m={MODULES[4]} /></div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">Elegí cómo querés usar Traza 360</h3>
          <p className="mb-10 text-center text-sm text-slate-400">Protección básica gratis. Más Terceros Remotos y tiempo en Premium.</p>
          <div className="grid gap-4 md:grid-cols-3">{PLANS.map((plan) => <PlanCard key={plan.name} plan={plan} />)}</div>
        </div>
      </section>

      <section className="border-t border-slate-800/50 px-5 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 text-sm text-slate-400">¿Tenés dudas? Hablá con nosotros.</p>
          <button onClick={() => openWhatsAppWithMessage("Hola, quiero información sobre Traza 360.")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-[#25D366]/20 hover:bg-[#20BD5A]">
            <WhatsAppIcon size={18} /> <span>Hablar por WhatsApp</span>
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
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">← Volver</button>
        <div className="mt-5 text-center">
          <h2 className="text-2xl font-bold">Ingresar</h2>
          <p className="mt-2 text-sm text-slate-400">Accedé a tu cuenta de Traza 360</p>
        </div>
        <div className="mt-6 space-y-4">
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={onSuccess} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg">Ingresar</button>
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
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">← Volver</button>
        <div className="mt-5 text-center">
          <h2 className="text-2xl font-bold">Crear cuenta</h2>
          <p className="mt-2 text-sm text-slate-400">Creá tu acceso y activá tu red de protección</p>
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-200">¿Cómo vas a usar Traza 360?</div>
          <div className="grid grid-cols-2 gap-3">
            {[{ key: "me_protejo", label: "Me protejo" }, { key: "cuido_a_alguien", label: "Cuido a alguien" }].map((opt) => (
              <button key={opt.key} type="button" onClick={() => setMode(opt.key)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${mode === opt.key ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={onSuccess} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg">Crear cuenta</button>
        </div>
      </AccessCard>
    </div>
  );
}

function HomeScreen({ onLogout }) {
  const quickCards = useMemo(() => [
    { emoji: "🛡️", title: "Violencia de género", text: "Pánico, grabación y red de apoyo." },
    { emoji: "🧑‍🎓", title: "Adolescente seguro", text: "Salida, regreso, GPS y geocercas." },
    { emoji: "🫶", title: "Adulto mayor seguro", text: "Medicamentos, caídas y geocercas." },
    { emoji: "🏠", title: "Hogar seguro", text: "Intrusos, vecinos y accidentes." },
    { emoji: "💼", title: "Trabajo seguro", text: "Acompañantes y domicilios." },
  ], []);
  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Panel inicial</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Bienvenido a Traza 360</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">5 módulos con Tercero Remoto, geocercas, timers y ubicación automática.</p>
            </div>
            <button onClick={onLogout} className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Cerrar sesión</button>
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

export default function App() {
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
        () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);
  const [screen, setScreen] = useState("landing");
  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={() => setScreen("home")} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={() => setScreen("home")} />;
  if (screen === "home") return <HomeScreen onLogout={() => setScreen("landing")} />;
  return <LandingScreen onScreen={setScreen} />;
}
