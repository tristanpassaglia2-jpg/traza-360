import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WhatsAppButton, {
  WhatsAppFloatingButton,
} from "../../components/ui/WhatsAppButton";

const MODULES = [
  {
    key: "violencia",
    waTipo: "violencia",
    emoji: "🛡️",
    title: "Violencia de género",
    desc: "Alerta silenciosa, ubicación y red de apoyo ante situaciones de riesgo.",
    color: "from-fuchsia-500 to-rose-500",
    border: "border-fuchsia-500/20",
    extraTitle: "Respaldo preventivo",
    extraColor: "fuchsia",
    extraFeatures: [
      {
        name: "Ingreso a lo de...",
        detail: "Aviso que ingresé a un domicilio o lugar sensible y comparto mi ubicación con contactos asignados.",
      },
      {
        name: "Ingreso con resguardo",
        detail: "Defino un tiempo estimado de salida. Si no cancelo con PIN, se disparan mensajes o llamada por WhatsApp, ubicación en tiempo real y seguimiento para contactos seleccionados.",
      },
    ],
  },
  {
    key: "adulto_mayor",
    waTipo: "adulto_mayor",
    emoji: "🫶",
    title: "Adulto mayor",
    desc: "Seguimiento y asistencia ante caída, descompensación o desorientación.",
    color: "from-amber-400 to-orange-500",
    border: "border-amber-500/20",
    extraTitle: "Cuidado continuo",
    extraColor: "amber",
    extraFeatures: [
      {
        name: "Check-in diario",
        detail: "Confirmación automática de estado; si no responde, se avisa a familiares.",
      },
      {
        name: "Detección de caída",
        detail: "Alerta automática ante caídas o movimientos inusuales.",
      },
      {
        name: "Recordatorio de medicamentos",
        detail: "Notificaciones para toma de medicación con confirmación.",
      },
    ],
  },
  {
    key: "ninos",
    waTipo: "ninos",
    emoji: "🧒",
    title: "Niños",
    desc: "Mayor trazabilidad para trayectos, rutinas y situaciones inesperadas.",
    color: "from-sky-400 to-cyan-500",
    border: "border-sky-500/20",
    extraTitle: "Trayectos seguros",
    extraColor: "sky",
    extraFeatures: [
      {
        name: "Camino a la escuela",
        detail: "Seguimiento en tiempo real del trayecto casa-escuela-casa.",
      },
      {
        name: "Llegué bien",
        detail: "Confirmación automática al llegar a destinos habituales.",
      },
      {
        name: "Zonas seguras",
        detail: "Alertas si sale de áreas establecidas como seguras.",
      },
    ],
  },
  {
    key: "hogar",
    waTipo: "hogar",
    emoji: "🏠",
    title: "Hogar / intrusos",
    desc: "Canal rápido de activación ante amenazas o intrusos en domicilio.",
    color: "from-violet-500 to-purple-500",
    border: "border-violet-500/20",
    extraTitle: "Adolescentes seguros",
    extraColor: "violet",
    extraFeatures: [
      {
        name: "Voy a lo de...",
        detail: "Salí de casa y aviso a qué lugar o persona voy.",
      },
      {
        name: "Vuelvo a casa a las...",
        detail: "Indico a qué hora vuelvo; si no regreso, se avisa a mis contactos.",
      },
      {
        name: "Entré a un lugar desconocido",
        detail: "Activo un temporizador de seguridad; si no lo desactivo con PIN, se comparte mi ubicación.",
      },
      {
        name: "Estoy perdido",
        detail: "Envío mi ubicación actual a amigos, padres o contactos elegidos.",
      },
      {
        name: "Transporte de confianza",
        detail: "Llamo o abro una movilidad segura con un solo toque.",
      },
      {
        name: "Estoy en problemas",
        detail: "Envío alerta, ubicación actual y seguimiento a contactos seleccionados.",
      },
    ],
  },
];

const PLANS = [
  {
    name: "Gratis",
    price: "US$0",
    sub: "Lo esencial para empezar y activar protección básica.",
    features: [
      "1 perfil",
      "2 contactos de confianza",
      "Alerta manual",
      "Ubicación en vivo en incidente",
    ],
  },
  {
    name: "Premium Personal",
    price: "US$4.99/mes",
    sub: "Más seguimiento, más automatización y más control.",
    features: [
      "Todo lo gratis",
      "Historial de ubicaciones",
      "Hasta 5 contactos",
      "Geocercas",
      "Alertas automáticas básicas",
    ],
    highlight: true,
  },
  {
    name: "Premium Familiar",
    price: "US$9.99/mes",
    sub: "Pensado para familia, cuidadores o uso profesional.",
    features: [
      "Todo Premium Personal",
      "Varios perfiles protegidos",
      "Reportes",
      "Prioridad",
      "Módulos avanzados",
    ],
  },
];

// Colores para los acentos de las secciones expandibles
const EXTRA_COLORS = {
  fuchsia: {
    border: "border-fuchsia-500/20",
    bg: "bg-fuchsia-500/5",
    text: "text-fuchsia-300",
    button: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-300",
    button: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300",
  },
  sky: {
    border: "border-sky-500/20",
    bg: "bg-sky-500/5",
    text: "text-sky-300",
    button: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-300",
  },
  violet: {
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
    text: "text-violet-300",
    button: "bg-violet-500/10 hover:bg-violet-500/20 text-violet-300",
  },
};

function ModuleCard({ module }) {
  const [expanded, setExpanded] = useState(false);
  const colors = EXTRA_COLORS[module.extraColor];

  return (
    <div
      className={`flex flex-col rounded-2xl border ${module.border} bg-[#11182e] p-5 h-full`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.color} shadow-lg shrink-0`}
        >
          <span className="text-2xl">{module.emoji}</span>
        </div>
        <h4 className="text-base font-bold">{module.title}</h4>
      </div>

      {/* Descripción */}
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
        {module.desc}
      </p>

      {/* Botón expandir/colapsar sección extra */}
      {module.extraFeatures && module.extraFeatures.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full rounded-xl ${colors.button} px-4 py-2.5 text-xs font-semibold transition-colors flex items-center justify-between`}
          >
            <span>
              {expanded ? "Ocultar" : "Ver"} {module.extraTitle}
            </span>
            <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {/* Contenido expandible */}
          {expanded && (
            <div className={`mt-3 rounded-2xl border ${colors.border} ${colors.bg} p-4`}>
              <div className={`mb-3 text-sm font-semibold ${colors.text}`}>
                {module.extraTitle}
              </div>
              <div className="space-y-2">
                {module.extraFeatures.map((feature) => (
                  <div
                    key={feature.name}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="text-xs font-semibold text-slate-100">
                      {feature.name}
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-400">
                      {feature.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp button al final */}
      <div className="mt-auto">
        <WhatsAppButton
          tipo={module.waTipo}
          label="Consultar este módulo"
          variant="compact"
          size="sm"
          className="w-full"
        />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      {/* Hero Section */}
      <section className="px-5 pt-16 pb-12 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 shadow-lg shadow-purple-500/20">
              <span className="text-xl">🛡️</span>
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              TRAZA 360
            </h1>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Última señal. Respuesta real.
          </p>

          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Cuando cada segundo importa,
            <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent">
              {" "}
              Traza 360 responde.
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
            Protección, seguimiento y asistencia para personas en situación de
            riesgo o vulnerabilidad. Diseñada para familias, cuidadores,
            trabajadores y contextos de emergencia.
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-shadow"
            >
              Ingresar con mi cuenta
            </button>

            <button
              onClick={() => navigate("/register")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white hover:bg-slate-800/60 transition-colors"
            >
              Crear cuenta
            </button>

            <WhatsAppButton
              tipo="demo"
              label="Solicitar demo por WhatsApp"
              variant="compact"
              size="md"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Solutions Section - BALANCEADO */}
      <section className="px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <h3 className="text-2xl font-bold text-center mb-2">
            Soluciones según tu necesidad
          </h3>
          <p className="text-sm text-slate-400 text-center mb-10">
            Cada situación necesita una respuesta distinta.
          </p>

          {/* Grid con altura uniforme - 2 cols mobile, 4 cols desktop */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <ModuleCard key={m.key} module={m} />
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <h3 className="text-2xl font-bold text-center mb-2">
            Elegí cómo querés usar Traza 360
          </h3>
          <p className="text-sm text-slate-400 text-center mb-10">
            Protección básica gratis. Más seguimiento, historial y coordinación en
            Premium.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? "border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-orange-500/5 shadow-lg shadow-orange-500/10"
                    : "border-slate-800 bg-[#11182e]"
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-flex self-start rounded-full bg-orange-500/20 px-3 py-1 text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                    Más elegido
                  </div>
                )}

                <div className="mb-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-bold">{plan.name}</span>
                </div>

                <div className="mb-3">
                  <span
                    className={`text-2xl font-bold ${
                      plan.highlight ? "text-orange-400" : "text-slate-200"
                    }`}
                  >
                    {plan.price}
                  </span>
                </div>

                <p className="mb-5 text-sm text-slate-400">{plan.sub}</p>

                <div className="mb-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span className="text-slate-300">{f}</span>
                    </div>
                  ))}
                </div>

                <WhatsAppButton
                  tipo="planes"
                  label="Consultar planes"
                  variant={plan.highlight ? "primary" : "compact"}
                  size="sm"
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <section className="border-t border-slate-800/50 px-5 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-base text-slate-300 mb-6">
            ¿Tenés dudas? Hablá con nosotros.
          </p>

          <div className="flex justify-center mb-8">
            <WhatsAppButton
              tipo="general"
              label="Hablar por WhatsApp"
              variant="primary"
              size="md"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-sm font-bold text-red-400">📞 911</span>
            <span className="text-xs text-slate-500">
              En emergencias inmediatas, contactá primero al servicio oficial.
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Traza 360 © 2026 · Hecho en Argentina 🇦🇷
          </p>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton tipo="general" />
    </div>
  );
}
