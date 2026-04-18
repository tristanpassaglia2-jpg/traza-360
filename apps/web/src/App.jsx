import React, { useMemo, useState } from "react";

/* ═══════════════════════════════════════════
   TRAZA 360 — App completa (single file)
   Versión: 3.0 · Abril 2026
   Stack: React 18 + Tailwind CSS
   Deploy: Render / Vercel
   ═══════════════════════════════════════════ */

// ─── CONFIG ────────────────────────────────
const WHATSAPP_NUMBER = "549XXXXXXXXXX"; // ← Reemplazar con número real

// ─── WHATSAPP HELPERS ──────────────────────
function openWhatsApp(tipo = "general") {
  const messages = {
    general: "Hola, quiero información sobre Traza 360.",
    demo: "Hola, quiero solicitar una demo de Traza 360.",
    planes: "Hola, quiero consultar los planes de Traza 360.",
    violencia: "Hola, quiero información sobre Traza 360 para red de apoyo y resguardo preventivo.",
    adulto_mayor: "Hola, quiero información sobre Traza 360 para cuidado y seguimiento de adultos mayores.",
    ninos: "Hola, quiero información sobre Traza 360 para seguimiento y protección de niños.",
    hogar: "Hola, quiero información sobre Traza 360 para hogar seguro, regreso seguro y adolescentes seguros.",
    trabajo: "Hola, quiero información sobre Traza 360 para trabajo seguro y resguardo en lugares desconocidos.",
  };
  const text = messages[tipo] || messages.general;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WhatsAppButton({ tipo = "general", label = "Hablar por WhatsApp", className = "", variant = "compact" }) {
  const styles = {
    primary: "bg-[#25D366] text-white hover:bg-[#20BD5A] shadow-lg shadow-[#25D366]/20",
    compact: "bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/15",
    outline: "bg-transparent border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10",
  };
  return (
    <button
      type="button"
      onClick={() => openWhatsApp(tipo)}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${styles[variant]} ${className}`}
    >
      <WhatsAppIcon size={18} />
      <span>{label}</span>
    </button>
  );
}

function WhatsAppFloatingButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        type="button"
        aria-label="Abrir WhatsApp"
        onClick={() => openWhatsApp("general")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        <WhatsAppIcon size={28} />
      </button>
    </div>
  );
}

// ─── DATA ──────────────────────────────────
const MODULES = [
  {
    key: "violencia",
    waTipo: "violencia",
    emoji: "🛡️",
    title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo ante situaciones de riesgo.",
    color: "from-fuchsia-500 to-rose-500",
    border: "border-fuchsia-500/20",
  },
  {
    key: "adulto_mayor",
    waTipo: "adulto_mayor",
    emoji: "🫶",
    title: "Adulto mayor",
    desc: "Seguimiento y asistencia ante caída, descompensación o desorientación.",
    color: "from-amber-400 to-orange-500",
    border: "border-amber-500/20",
  },
  {
    key: "ninos",
    waTipo: "ninos",
    emoji: "🧒",
    title: "Niños",
    desc: "Mayor trazabilidad para trayectos, rutinas y situaciones inesperadas.",
    color: "from-sky-400 to-cyan-500",
    border: "border-sky-500/20",
  },
  {
    key: "hogar",
    waTipo: "hogar",
    emoji: "🏠",
    title: "Hogar / regreso seguro",
    desc: "Protección en domicilio y acompañamiento digital para adolescentes en salidas, trayectos y regreso a casa.",
    color: "from-violet-500 to-purple-500",
    border: "border-violet-500/20",
  },
  {
    key: "trabajo",
    waTipo: "trabajo",
    emoji: "💼",
    title: "Trabajo seguro",
    desc: "Resguardo para trabajos en domicilio, acompañamiento nocturno y entradas a lugares desconocidos.",
    color: "from-cyan-400 to-blue-500",
    border: "border-cyan-500/20",
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
    sub: "Más seguimiento, historial y automatización para un uso individual más completo.",
    features: ["Todo lo gratis", "Historial de ubicaciones", "Hasta 5 contactos", "Geocercas", "Alertas automáticas básicas"],
    cta: "Quiero Premium",
    highlight: true,
  },
  {
    name: "Premium Familiar",
    price: "US$9.99/mes",
    sub: "Diseñado para familias, cuidadores y seguimiento de varios perfiles protegidos.",
    features: ["Todo Premium Personal", "Varios perfiles protegidos", "Reportes", "Prioridad", "Módulos avanzados"],
    cta: "Consultar plan familiar",
  },
];

// ─── UI COMPONENTS ─────────────────────────
function ModuleCard({ m }) {
  return (
    <div className={`rounded-2xl border ${m.border} bg-[#11182e] p-5 flex flex-col`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}>
          <span className="text-2xl">{m.emoji}</span>
        </div>
        <h4 className="text-base font-bold text-slate-100">{m.title}</h4>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-slate-400 flex-1">{m.desc}</p>

      <WhatsAppButton
        tipo={m.waTipo}
        label={m.key === "hogar" ? "Consultar hogar y regreso seguro" : "Consultar este módulo"}
        variant="compact"
        className="w-full"
      />
    </div>
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

      <WhatsAppButton tipo="planes" label={plan.cta} variant={plan.highlight ? "primary" : "compact"} className="w-full" />
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
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
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

// ─── SECTIONS ──────────────────────────────
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
        className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20 transition-shadow duration-200 hover:shadow-xl hover:shadow-purple-500/30"
      >
        Ingresar con mi cuenta
      </button>

      <button
        onClick={() => onScreen("register")}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white transition-colors duration-200 hover:bg-slate-800/60"
      >
        Crear cuenta
      </button>

      <WhatsAppButton tipo="demo" label="Solicitar demo por WhatsApp" variant="compact" className="w-full" />
    </div>
  );
}

// ─── SCREENS ───────────────────────────────
function LandingScreen({ onScreen }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <Hero />

      <div className="px-5 pb-12">
        <LandingActions onScreen={onScreen} />
      </div>

      {/* Módulos */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-2 text-center text-xl font-bold md:text-2xl">Soluciones según tu necesidad</h3>
          <p className="mb-10 text-center text-sm text-slate-400">
            Cada situación necesita una respuesta distinta.
          </p>

          {/* Primeros 4 módulos en grid 2x2 */}
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
          <WhatsAppButton tipo="general" label="Hablar por WhatsApp" variant="primary" className="mx-auto" />

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
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 transition-colors duration-200 hover:text-cyan-200">
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
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg transition-shadow duration-200 hover:shadow-xl hover:shadow-fuchsia-500/20"
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
        <button onClick={onBack} className="text-sm font-medium text-cyan-300 transition-colors duration-200 hover:text-cyan-200">
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
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
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
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-3.5 font-semibold text-white shadow-lg transition-shadow duration-200 hover:shadow-xl hover:shadow-fuchsia-500/20"
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
      { emoji: "🛡️", title: "Violencia de género", text: "Acceso rápido a red de apoyo y resguardo preventivo." },
      { emoji: "🫶", title: "Adulto mayor", text: "Seguimiento, avisos y coordinación con contactos de confianza." },
      { emoji: "🏠", title: "Adolescentes seguros", text: "Salida, regreso, ingreso sensible y alerta inmediata." },
      { emoji: "💼", title: "Trabajo seguro", text: "Resguardo para acompañantes, visitas y domicilios desconocidos." },
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
                Versión reconstruida desde cero con landing pública, login, registro y módulos premium listos para seguir creciendo.
              </p>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors duration-200 hover:bg-white/10">
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

// ─── APP ROOT ──────────────────────────────
export default function App() {
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
