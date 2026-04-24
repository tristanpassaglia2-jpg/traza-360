import React, { useEffect, useMemo, useRef, useState } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase, getContactos, addContacto, deleteContacto } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — App completa
   Versión: 13.0 · Abril 2026
   ═══════════════════════════════════════════════════════════════
   NOVEDAD v13: Sistema de Contactos de Confianza
   - Pantalla "Mis Contactos" (agregar/editar/eliminar)
   - Conectado a Supabase (se guardan en la nube)
   - Selector de contacto al enviar alertas
   - Mensajes WhatsApp van al número real del contacto
   - Respuesta rápida con emojis 👍 🏃 ✅
   - Plan Gratis: 2 contactos / Esencial: 5 / Premium: 10
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_NUMBER_DEFAULT = "5493513956879"; // Fallback si no hay contactos
const PIN_DEFAULT = "1234";
const HOME_ADDRESS_DEFAULT = "Mi casa";

const PLAN_LIMITS = {
  gratis: { contactos: 2, terceros: 1, zonas: 2, audioMax: 300, audioEvidencia: 300, videoEvidencia: 0, storage: "100 MB" },
  esencial: { contactos: 5, terceros: 1, zonas: 5, audioMax: 1800, audioEvidencia: 1800, videoEvidencia: 900, storage: "1 GB" },
  premium: { contactos: 10, terceros: 5, zonas: -1, audioMax: -1, audioEvidencia: -1, videoEvidencia: 3600, storage: "10 GB" },
};

const PLAN_PRICES = {
  gratis: { name: "Gratis", price: "US$0" },
  esencial: { name: "Esencial", price: "US$1.99/mes" },
  premium: { name: "Premium", price: "US$5.99/mes" },
};

// ─── PAÍSES (prefijos telefónicos) ──────────
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

const RELACIONES = ["Madre", "Padre", "Hermana", "Hermano", "Pareja", "Amigo/a", "Hija", "Hijo", "Vecino/a", "Otro"];

// ─── PhoneInput REUTILIZABLE ────────────────
function PhoneInput({ value, onChange, prefix, onPrefixChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const pais = PAISES.find((p) => p.prefix === prefix) || PAISES[0];

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white whitespace-nowrap hover:bg-white/10 shrink-0">
          <span>{pais.flag}</span>
          <span className="text-slate-300">+{pais.prefix}</span>
          <span className="text-slate-500 text-xs">▼</span>
        </button>
        <input type="tel" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Número sin 0 ni 15"}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 min-w-0" />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#0d1426] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
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

// ─── UTILS: Número limpio ───────────────────
function limpiarNumero(num) {
  return num.trim().replace(/\s/g, "").replace(/-/g, "").replace(/^0+/, "").replace(/^15/, "");
}

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

// ─── WHATSAPP ───────────────────────────────
function openWhatsAppToContact(numero, text) {
  const numLimpio = numero.replace(/\+/g, "").replace(/\s/g, "");
  window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function openWhatsAppDefault(text) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER_DEFAULT}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

// Mensaje con emojis de respuesta rápida
function buildMessageWithReply(baseMessage, loc) {
  let msg = baseMessage;
  if (loc) {
    msg += `\n\n📍 Ubicación:\n${buildMapLink(loc)}`;
  }
  msg += `\n\n━━━━━━━━━━━━━━\nResponder con emoji:\n👍 Recibí\n🏃 Voy en camino\n✅ ¿Todo ok?\n━━━━━━━━━━━━━━`;
  return msg;
}

async function sendAlertToContact(contact, baseMessage) {
  const { location } = await getCurrentLocationWithFallback();
  const msg = buildMessageWithReply(baseMessage, location);
  openWhatsAppToContact(contact.telefono, msg);
}

async function sendAlertToAllContacts(contacts, baseMessage) {
  const { location } = await getCurrentLocationWithFallback();
  const msg = buildMessageWithReply(baseMessage, location);
  // Abre WhatsApp para el primer contacto; los otros se copian al portapapeles
  if (contacts.length > 0) {
    openWhatsAppToContact(contacts[0].telefono, msg);
  }
  // Se podría usar Twilio para enviar a todos a la vez (paso futuro)
}

async function shareLiveLocation() {
  const { location, source } = await getCurrentLocationWithFallback();
  if (!location) { openWhatsAppDefault("📍 Quiero compartir mi ubicación pero no logro obtenerla."); return location; }
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => saveLastLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}, { enableHighAccuracy: true, maximumAge: 15000 }
    );
  }
  return location;
}

function openMapsTo(d) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }
function openUber(d) { window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(d)}`, "_blank", "noopener,noreferrer"); }

// ─── GEOFENCING ─────────────────────────────
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
  } catch (e) {}
  return null;
}

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
      <button onClick={() => openWhatsAppDefault("Hola, quiero información sobre Traza 360.")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 hover:scale-110 active:scale-95">
        <WhatsAppIcon size={28} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NUEVA: PANTALLA CONTACTOS DE CONFIANZA (desde Supabase)
// ═══════════════════════════════════════════════════════════════

function ContactosScreen({ onBack, userPlan = "gratis" }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista"); // lista | agregar
  const [error, setError] = useState("");

  // Form fields
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("Madre");
  const [telefono, setTelefono] = useState("");
  const [prefijo, setPrefijo] = useState("54");
  const [saving, setSaving] = useState(false);

  const limites = PLAN_LIMITS[userPlan];
  const maxContactos = limites.contactos;

  // Cargar contactos al entrar
  useEffect(() => {
    cargarContactos();
  }, []);

  async function cargarContactos() {
    setLoading(true);
    const data = await getContactos();
    setContactos(data || []);
    setLoading(false);
  }

  async function handleAgregar() {
    setError("");
    if (!nombre.trim() || !telefono.trim()) {
      setError("Completá nombre y teléfono.");
      return;
    }
    if (contactos.length >= maxContactos) {
      setError(`Tu plan ${PLAN_PRICES[userPlan].name} permite solo ${maxContactos} contactos. Pasate a Premium.`);
      return;
    }

    setSaving(true);
    const numCompleto = prefijo + limpiarNumero(telefono);
    const result = await addContacto({
      nombre: nombre.trim(),
      telefono: numCompleto,
      relacion: relacion,
      prioridad: contactos.length + 1,
    });
    setSaving(false);

    if (result.success) {
      await cargarContactos();
      setVista("lista");
      setNombre("");
      setTelefono("");
      setRelacion("Madre");
    } else {
      setError(result.error || "Error al guardar el contacto.");
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    const result = await deleteContacto(id);
    if (result.success) {
      await cargarContactos();
    } else {
      alert("Error al eliminar: " + result.error);
    }
  }

  function getRelacionEmoji(rel) {
    const map = {
      "Madre": "👩", "Padre": "👨", "Hermana": "👭", "Hermano": "👬",
      "Pareja": "💑", "Amigo/a": "🤝", "Hija": "👧", "Hijo": "👦",
      "Vecino/a": "🏘️", "Otro": "👤"
    };
    return map[rel] || "👤";
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300 hover:text-cyan-200">
          ← Volver al panel
        </button>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Mi red de contención</p>
              <h2 className="mt-2 text-2xl font-bold">Mis Contactos de Confianza</h2>
            </div>
            <span className="text-3xl">👥</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Estas personas recibirán tus alertas con ubicación. Plan actual: <span className="text-cyan-300 font-semibold">{PLAN_PRICES[userPlan].name}</span> · {contactos.length}/{maxContactos} contactos usados.
          </p>
        </div>

        {vista === "lista" && (
          <>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Cargando contactos...</div>
            ) : contactos.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-5xl mb-3">👥</div>
                <h3 className="text-lg font-semibold text-slate-100">Todavía no tenés contactos</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Agregá al menos 1 contacto de confianza para que la app te proteja.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {contactos.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-3xl shrink-0">{getRelacionEmoji(c.relacion)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold text-slate-100">{c.nombre}</div>
                          <div className="text-xs text-cyan-300">{c.relacion}</div>
                          <div className="text-xs text-slate-400 mt-1">📱 +{c.telefono}</div>
                        </div>
                      </div>
                      <button onClick={() => handleEliminar(c.id)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 shrink-0">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => contactos.length >= maxContactos ? null : setVista("agregar")}
              disabled={contactos.length >= maxContactos}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 py-4 font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
              ➕ Agregar contacto
            </button>

            {contactos.length >= maxContactos && (
              <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                <div className="text-sm font-semibold text-orange-300">🚀 Alcanzaste el límite</div>
                <p className="mt-1 text-xs text-slate-300">
                  Pasate a <strong>Esencial (US$1.99/mes)</strong> para agregar hasta 5 contactos o <strong>Premium (US$5.99/mes)</strong> para hasta 10.
                </p>
                <button onClick={() => openWhatsAppDefault("Hola, quiero pasarme a Premium para tener más contactos.")}
                  className="mt-3 w-full rounded-xl bg-[#25D366] text-white py-2 text-sm font-semibold">
                  Consultar Premium por WhatsApp
                </button>
              </div>
            )}
          </>
        )}

        {vista === "agregar" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <button onClick={() => { setVista("lista"); setError(""); }} className="text-xs text-slate-400 mb-4">← Volver</button>
            <h3 className="text-lg font-bold mb-4">Agregar contacto de confianza</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: María González"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-2">Relación</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RELACIONES.map((r) => (
                    <button key={r} type="button" onClick={() => setRelacion(r)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                        relacion === r
                          ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}>
                      {getRelacionEmoji(r)} {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Teléfono con WhatsApp</label>
                <PhoneInput
                  value={telefono}
                  onChange={setTelefono}
                  prefix={prefijo}
                  onPrefixChange={setPrefijo}
                  placeholder="Número sin 0 ni 15 (ej: 1123456789)"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button onClick={handleAgregar} disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar contacto"}
              </button>
            </div>
          </div>
        )}
      </div>
      <WhatsAppFloatingButton />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL: SELECTOR DE CONTACTO (al disparar alertas)
// ═══════════════════════════════════════════════════════════════

function SelectorContactoModal({ contactos, mensaje, onClose }) {
  const [enviando, setEnviando] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [sent, setSent] = useState(false);

  function toggleContacto(id) {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((x) => x !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  }

  function seleccionarTodos() {
    setSeleccionados(contactos.map((c) => c.id));
  }

  async function enviar() {
    if (seleccionados.length === 0) {
      alert("Seleccioná al menos 1 contacto.");
      return;
    }
    setEnviando(true);
    const contactosElegidos = contactos.filter((c) => seleccionados.includes(c.id));
    const { location } = await getCurrentLocationWithFallback();
    const msg = buildMessageWithReply(mensaje, location);

    // Abre WhatsApp al primer contacto
    if (contactosElegidos.length > 0) {
      openWhatsAppToContact(contactosElegidos[0].telefono, msg);
    }

    setEnviando(false);
    setSent(true);
    setTimeout(() => onClose(), 2000);
  }

  function getRelacionEmoji(rel) {
    const map = {
      "Madre": "👩", "Padre": "👨", "Hermana": "👭", "Hermano": "👬",
      "Pareja": "💑", "Amigo/a": "🤝", "Hija": "👧", "Hijo": "👦",
      "Vecino/a": "🏘️", "Otro": "👤"
    };
    return map[rel] || "👤";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl">
        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-slate-100">Alerta enviada</h3>
            <p className="mt-2 text-sm text-slate-400">Se abrió WhatsApp. Enviá el mensaje.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">¿A quién avisar?</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            {contactos.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">No tenés contactos de confianza configurados.</p>
                <p className="mt-2 text-xs text-slate-500">Agregá al menos 1 para usar las alertas.</p>
              </div>
            ) : (
              <>
                <button onClick={seleccionarTodos}
                  className="w-full mb-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-300">
                  🔥 Seleccionar todos ({contactos.length})
                </button>

                <div className="space-y-2 mb-4">
                  {contactos.map((c) => (
                    <button key={c.id} onClick={() => toggleContacto(c.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${
                        seleccionados.includes(c.id)
                          ? "border-cyan-400/50 bg-cyan-500/10"
                          : "border-white/10 bg-white/5"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl shrink-0">{getRelacionEmoji(c.relacion)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100">{c.nombre}</div>
                          <div className="text-[11px] text-slate-400">{c.relacion} · +{c.telefono}</div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 shrink-0 ${
                          seleccionados.includes(c.id)
                            ? "border-cyan-400 bg-cyan-400"
                            : "border-slate-500"
                        }`}>
                          {seleccionados.includes(c.id) && <div className="text-slate-950 text-xs text-center leading-4">✓</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button onClick={enviar} disabled={enviando || seleccionados.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40">
                  {enviando ? "Enviando..." : `🚨 Enviar alerta (${seleccionados.length})`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
      a.download = `evidencia_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderInstance.start();
    return { success: true };
  } catch (error) {
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
    if (result.success) { setGrabando(true); setTiempo(0); }
    else setError("No se pudo acceder al micrófono. Dale permiso al navegador.");
  }

  function detener() { detenerGrabacionBullying(); setGrabando(false); }

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
          <div className="text-lg font-bold text-slate-100">Grabación silenciosa</div>
          <p className="mt-2 text-xs text-slate-400">El audio se guarda como evidencia.</p>

          {grabando ? (
            <>
              <div className="my-6 rounded-2xl border border-red-500/30 bg-red-500/10 py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-red-300 uppercase tracking-widest">Grabando</span>
                </div>
                <div className="font-mono text-4xl font-bold text-white tabular-nums">{formatTiempo(tiempo)}</div>
              </div>
              <button onClick={detener} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white shadow-lg">
                Detener y guardar evidencia
              </button>
            </>
          ) : (
            <>
              <div className="my-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-xs leading-5 text-slate-300">Al tocar <strong className="text-sky-300">"Iniciar"</strong>:</p>
                <ul className="mt-2 text-[11px] text-slate-400 text-left space-y-1 list-disc list-inside">
                  <li>Se graba audio del entorno sin hacer ruido</li>
                  <li>Se guarda automáticamente como archivo</li>
                  <li>La víctima ve que está grabando</li>
                </ul>
              </div>
              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
              <button onClick={iniciar} className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg mb-2">
                🎙️ Iniciar grabación silenciosa
              </button>
              <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-400">Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TERCERO REMOTO (simplificado) ──────────
function TerceroRemotoModal({ onClose }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [prefijo, setPrefijo] = useState("54");
  const [duracion, setDuracion] = useState("24h");
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [error, setError] = useState("");

  function handleVincular() {
    setError("");
    if (!nombre.trim() || !telefono.trim()) { setError("Completá todos los campos."); return; }

    const numCompleto = prefijo + limpiarNumero(telefono);
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoGenerado(codigo);

    const mensaje = `Hola ${nombre}! Te vinculaste como Tercero Remoto en Traza 360. Tu código es: ${codigo}. Vinculación activa por ${duracion}. Instalá la app: https://traza360-web.vercel.app`;
    openWhatsAppToContact(numCompleto, mensaje);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <h3 className="text-lg font-bold text-slate-100">Tercero Remoto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        {codigoGenerado ? (
          <div className="text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-lg font-bold text-slate-100 mb-2">Vinculación creada</div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 my-4">
              <div className="text-xs text-emerald-300 mb-2">Código:</div>
              <div className="font-mono text-3xl font-bold text-white tracking-widest">{codigoGenerado}</div>
            </div>
            <button onClick={onClose}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">
              Listo
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-slate-400">
              El tercero recibirá un código por WhatsApp para vincularse.
            </p>

            <div className="space-y-3">
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del tercero"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500" />

              <PhoneInput value={telefono} onChange={setTelefono} prefix={prefijo} onPrefixChange={setPrefijo}
                placeholder="Número sin 0 ni 15" />

              <div>
                <label className="text-xs text-slate-400 block mb-2">Duración</label>
                <div className="grid grid-cols-2 gap-2">
                  {["6h", "12h", "24h", "30d"].map((d) => (
                    <button key={d} onClick={() => setDuracion(d)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        duracion === d ? "border-pink-500/50 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-slate-300"
                      }`}>{d}</button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button onClick={handleVincular}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg">
                Generar código y enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DATOS MÓDULOS ──────────────────────────
const MODULES = [
  {
    key: "violencia", emoji: "🛡️", title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo.",
    color: "from-fuchsia-500 to-rose-500", border: "border-fuchsia-500/20",
    accentBg: "bg-fuchsia-500/10", accentBorder: "border-fuchsia-500/30", accentText: "text-fuchsia-300",
    actions: [
      { key: "panico", icon: "🚨", name: "Botón de pánico", desc: "Alerta inmediata + ubicación.", type: "alert_contacts", message: "🚨 ALERTA · Botón de pánico activado. Necesito ayuda urgente." },
      { key: "share_location", icon: "📡", name: "Compartir ubicación tiempo real", desc: "Envío mi ubicación.", type: "alert_contacts", message: "📍 Compartiendo mi ubicación en vivo." },
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Grabación silenciosa, se guarda.", type: "record_audio" },
      { key: "entro_casa_de", icon: "🏘️", name: "Entro a la casa de...", desc: "Aviso y comparto ubicación.", type: "alert_contacts", message: "🏘️ Entro a la casa de [completar]." },
      { key: "me_reuno_con", icon: "👥", name: "Me reúno con...", desc: "Aviso que me encuentro con alguien.", type: "alert_contacts", message: "👥 Me reúno con [completar]." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber a tu casa.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
    ],
  },
  {
    key: "adolescente", emoji: "🧑‍🎓", title: "Adolescente seguro",
    desc: "Salidas, regresos y protección contra bullying.",
    color: "from-sky-400 to-cyan-500", border: "border-sky-500/20",
    accentBg: "bg-sky-500/10", accentBorder: "border-sky-500/30", accentText: "text-sky-300",
    actions: [
      { key: "peligro", icon: "🚨", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata + ubicación.", type: "alert_contacts", message: "🚨 SOS · Estoy en peligro." },
      { key: "share_location", icon: "📡", name: "Compartir ubicación tiempo real", desc: "Envío mi ubicación.", type: "alert_contacts", message: "📍 Compartiendo mi ubicación en vivo." },
      { key: "buscame_cole", icon: "🏫", name: "Buscame por el cole, algo anda mal", desc: "Aviso silencioso + ubicación.", type: "alert_contacts", message: "🏫 URGENTE · Necesito que me busquen por el colegio. No puedo explicar ahora." },
      { key: "bullying_evidencia", icon: "🎙️", name: "Bullying - Grabar evidencia", desc: "Grabación silenciosa de audio.", type: "record_audio" },
      { key: "sali_voy_a", icon: "🚶", name: "Salí de casa, voy a lo de...", desc: "Aviso con ubicación.", type: "alert_contacts", message: "🚶 Salí de casa. Voy a lo de [completar]." },
      { key: "llegar_a_casa", icon: "🗺️", name: "Llegar a casa (GPS)", desc: "Abre Google Maps.", type: "maps", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue_bien", icon: "✅", name: "Llegué bien", desc: "Cierra el seguimiento.", type: "alert_contacts", message: "✅ Llegué bien." },
      { key: "perdido", icon: "📍", name: "Estoy perdido", desc: "Envía ubicación.", type: "alert_contacts", message: "📍 Estoy perdido." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte de confianza", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
    ],
  },
  {
    key: "adulto_mayor", emoji: "🫶", title: "Adulto mayor seguro",
    desc: "Seguimiento, medicamentos y asistencia.",
    color: "from-amber-400 to-orange-500", border: "border-amber-500/20",
    accentBg: "bg-amber-500/10", accentBorder: "border-amber-500/30", accentText: "text-amber-300",
    actions: [
      { key: "me_cai", icon: "🆘", name: "Me caí", desc: "Alerta inmediata + ubicación.", type: "alert_contacts", message: "🆘 ALERTA · Me caí." },
      { key: "share_location", icon: "📡", name: "Compartir ubicación tiempo real", desc: "Envío mi ubicación.", type: "alert_contacts", message: "📍 Compartiendo mi ubicación en vivo." },
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "medicamentos", icon: "💊", name: "Tomé la medicación", desc: "Confirmación de toma.", type: "alert_contacts", message: "💊 Tomé la medicación del horario." },
      { key: "llamar_familiar", icon: "📞", name: "Llamar a familiar", desc: "Contactar familiar.", type: "alert_contacts", message: "📞 Necesito hablar con mi familiar." },
      { key: "me_perdi", icon: "📍", name: "Me perdí", desc: "Envía ubicación.", type: "alert_contacts", message: "📍 Me perdí." },
      { key: "no_me_siento_bien", icon: "💔", name: "No me siento bien", desc: "Aviso de descompensación.", type: "alert_contacts", message: "💔 No me siento bien." },
    ],
  },
  {
    key: "hogar", emoji: "🏠", title: "Hogar seguro",
    desc: "Intrusos, vecinos y emergencias.",
    color: "from-violet-500 to-purple-500", border: "border-violet-500/20",
    accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/30", accentText: "text-violet-300",
    actions: [
      { key: "intruso", icon: "🚨", name: "Intruso en domicilio", desc: "Alerta inmediata.", type: "alert_contacts", message: "🚨 ALERTA · Posible intruso." },
      { key: "share_location", icon: "📡", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "📍 Compartiendo mi ubicación en vivo." },
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "ruido_sospechoso", icon: "👂", name: "Ruido sospechoso", desc: "Aviso preventivo.", type: "alert_contacts", message: "👂 Ruido sospechoso en mi domicilio." },
      { key: "accidente_domestico", icon: "🩹", name: "Accidente doméstico", desc: "Aviso + ubicación.", type: "alert_contacts", message: "🩹 ALERTA · Accidente doméstico." },
      { key: "emergencia_hogar", icon: "🆘", name: "Emergencia en el hogar", desc: "Alerta máxima.", type: "alert_contacts", message: "🆘 EMERGENCIA en el hogar." },
    ],
  },
  {
    key: "trabajo", emoji: "💼", title: "Trabajo seguro",
    desc: "Protección para trabajadoras independientes.",
    color: "from-emerald-500 to-teal-500", border: "border-emerald-500/20",
    accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/30", accentText: "text-emerald-300",
    actions: [
      { key: "peligro", icon: "🚨", name: "Estoy en peligro (SOS)", desc: "Alerta inmediata.", type: "alert_contacts", message: "🚨 SOS · En peligro durante mi trabajo." },
      { key: "share_location", icon: "📡", name: "Compartir ubicación", desc: "Envío ubicación.", type: "alert_contacts", message: "📍 Compartiendo mi ubicación en vivo." },
      { key: "grabar_audio", icon: "🎙️", name: "Grabar sonido ambiente", desc: "Grabación silenciosa.", type: "record_audio" },
      { key: "salgo_con_desconocido", icon: "🧑‍🤝‍🧑", name: "Salgo con desconocido/a", desc: "Aviso + ubicación.", type: "alert_contacts", message: "🧑‍🤝‍🧑 Salgo con cliente desconocido/a." },
      { key: "cliente_sospechoso", icon: "⚠️", name: "Cliente sospechoso", desc: "Aviso preventivo.", type: "alert_contacts", message: "⚠️ Cliente con actitud sospechosa." },
      { key: "transporte", icon: "🚗", name: "Llamar transporte", desc: "Abre Uber.", type: "uber", destination: HOME_ADDRESS_DEFAULT },
      { key: "llegue_bien", icon: "✅", name: "Llegué bien", desc: "Confirmación.", type: "alert_contacts", message: "✅ Terminé mi trabajo y estoy bien." },
    ],
  },
];

// ─── MODULE CARD ────────────────────────────
function ModuleCard({ m, autoExpand = false, contactos = [] }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showBullying, setShowBullying] = useState(false);

  function handleAction(action) {
    switch (action.type) {
      case "alert_contacts":
        if (contactos.length === 0) {
          alert("⚠️ Configurá al menos 1 contacto de confianza desde 'Mis Contactos'.");
          return;
        }
        setCurrentMessage(action.message);
        setSelectorOpen(true);
        return;
      case "record_audio": setShowBullying(true); return;
      case "maps": openMapsTo(action.destination); return;
      case "uber": openUber(action.destination); return;
      default: openWhatsAppDefault(action.message || ""); return;
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

      {selectorOpen && <SelectorContactoModal contactos={contactos} mensaje={currentMessage} onClose={() => setSelectorOpen(false)} />}
      {showBullying && <BullyingModal onClose={() => setShowBullying(false)} />}
    </>
  );
}

// ─── LOGIN / REGISTER ───────────────────────
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

function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Completá todos los campos."); return; }
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
    try { window.sessionStorage.setItem("traza360_pending_name", name.trim()); } catch(e){}
    setPendingName(name.trim());
    const result = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (result.success) onSuccess();
    else {
      if (result.error.includes("already registered") || result.error.includes("already been registered")) setError("Este email ya está registrado.");
      else setError(result.error || "Error al crear la cuenta.");
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

// ─── LANDING ─────────────────────────────────
function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <section className="px-5 pt-16 pb-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500">
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-3xl font-extrabold text-transparent">TRAZA 360</h1>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Última señal. Respuesta real.</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl mx-auto">
          Cuando cada segundo importa,
          <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent"> Traza 360 responde.</span>
        </h2>
      </section>

      <div className="px-5 pb-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
          <button onClick={() => onScreen("login")} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg">Ingresar con mi cuenta</button>
          <button onClick={() => onScreen("register")} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white">Crear cuenta</button>
        </div>
      </div>

      <WhatsAppFloatingButton />
    </div>
  );
}

// ─── HOME SCREEN ────────────────────────────
function HomeScreen({ userProfile, authUser, pendingName, onLogout }) {
  const [activeScreen, setActiveScreen] = useState("home"); // home | contactos | modulo
  const [activeModule, setActiveModule] = useState(null);
  const [showTerceroModal, setShowTerceroModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [contactos, setContactos] = useState([]);

  const nombreUsuario = userProfile?.nombre || pendingName
    || (typeof window !== "undefined" && window.sessionStorage?.getItem("traza360_pending_name"))
    || authUser?.email?.split("@")[0] || "Usuario";

  const userPlan = userProfile?.plan || "gratis";
  const planNombre = PLAN_PRICES[userPlan]?.name || "Gratis";

  // Cargar contactos al entrar
  useEffect(() => {
    cargarContactos();
  }, []);

  async function cargarContactos() {
    const data = await getContactos();
    setContactos(data || []);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { window.sessionStorage.removeItem("traza360_pending_name"); } catch(e){}
    await signOut();
    setLoggingOut(false);
    onLogout();
  }

  // Si está en pantalla de contactos
  if (activeScreen === "contactos") {
    return <ContactosScreen onBack={() => { setActiveScreen("home"); cargarContactos(); }} userPlan={userPlan} />;
  }

  const quickCards = [
    { key: "contactos", emoji: "👥", title: "Mis Contactos", text: `${contactos.length}/${PLAN_LIMITS[userPlan].contactos} configurados` },
    { key: "tercero", emoji: "👁️", title: "Tercero Remoto", text: "Cuidadores con audio y ubicación en vivo." },
    { key: "violencia", emoji: "🛡️", title: "Violencia de género", text: "Pánico, grabación y red de apoyo." },
    { key: "adolescente", emoji: "🧑‍🎓", title: "Adolescente seguro", text: "Anti-bullying, GPS y geocercas." },
    { key: "adulto_mayor", emoji: "🫶", title: "Adulto mayor seguro", text: "Medicamentos, caídas y geocercas." },
    { key: "hogar", emoji: "🏠", title: "Hogar seguro", text: "Intrusos, vecinos y accidentes." },
    { key: "trabajo", emoji: "💼", title: "Trabajo seguro", text: "Acompañantes y domicilios." },
  ];

  function handleQuickCardClick(key) {
    if (key === "contactos") setActiveScreen("contactos");
    else if (key === "tercero") setShowTerceroModal(true);
    else {
      const mod = MODULES.find((m) => m.key === key);
      if (mod) setActiveModule(mod);
    }
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Panel inicial</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Bienvenido/a, {nombreUsuario} 👋</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Tu red de protección está activa. Plan: <span className="text-cyan-300 font-semibold">{planNombre}</span>
                {contactos.length === 0 && <span className="text-orange-300"> · ⚠️ Agregá contactos de confianza</span>}
              </p>
            </div>
            <button onClick={handleLogout} disabled={loggingOut} className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>

        {activeModule && (
          <div className="mb-8">
            <button onClick={() => setActiveModule(null)} className="mb-4 text-sm text-cyan-300">← Volver al panel</button>
            <ModuleCard m={activeModule} autoExpand={true} contactos={contactos} />
          </div>
        )}

        {!activeModule && (
          <>
            <h3 className="mb-4 text-lg font-bold text-slate-200">¿Qué necesitás hoy?</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickCards.map((card) => (
                <button key={card.key} onClick={() => handleQuickCardClick(card.key)}
                  className={`text-left rounded-2xl border p-5 hover:bg-white/10 hover:border-cyan-400/30 active:scale-[0.98] transition-all ${
                    card.key === "contactos" && contactos.length === 0
                      ? "border-orange-500/40 bg-orange-500/10"
                      : "border-white/10 bg-white/5"
                  }`}>
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
      if (!result.profile && result.authUser) await tryCreateProfile(result.authUser);
      setScreen("home");
    } else setScreen("landing");
  }

  async function tryCreateProfile(user) {
    try {
      const storedName = window.sessionStorage?.getItem("traza360_pending_name");
      const fallbackName = storedName || user.email?.split("@")[0] || "Usuario";
      const { data, error } = await supabase.from('usuarios').insert({
        auth_user_id: user.id, nombre: fallbackName, email: user.email, plan: 'gratis', modo: 'me_protejo',
      }).select().single();
      if (!error && data) setUserProfile(data);
    } catch (e) {}
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
    setUserProfile(null); setAuthUser(null); setPendingName(null);
    try { window.sessionStorage.removeItem("traza360_pending_name"); } catch(e){}
    setScreen("landing");
  }

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05080f] text-slate-100">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg animate-pulse">
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
