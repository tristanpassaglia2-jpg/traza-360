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
    title: "Hogar / intrusos",
    desc: "Canal rápido de activación ante amenazas o intrusos en domicilio.",
    color: "from-violet-500 to-purple-500",
    border: "border-violet-500/20",
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
      "alerta manual",
      "ubicación en vivo en incidente",
    ],
  },
  {
    name: "Premium Personal",
    price: "US$4.99/mes",
    sub: "Más seguimiento, más automatización y más control.",
    features: [
      "Todo lo gratis",
      "historial de ubicaciones",
      "hasta 5 contactos",
      "geocercas",
      "alertas automáticas básicas",
    ],
    highlight: true,
  },
  {
    name: "Premium Familiar",
    price: "US$9.99/mes",
    sub: "Pensado para familia, cuidadores o uso profesional.",
    features: [
      "Todo Premium Personal",
      "varios perfiles protegidos",
      "reportes",
      "prioridad",
      "módulos avanzados",
    ],
  },
];
const ADOLESCENTES_FEATURES = [
  "Voy a lo de...",
  "Vuelvo a casa a las...",
  "Entré a un lugar desconocido",
  "Estoy perdido",
  "Transporte de confianza",
  "Estoy en problemas",
];

const ADOLESCENTES_DETAILS = [
  "Salí de casa y aviso a qué lugar o persona voy.",
  "Indico a qué hora vuelvo; si no regreso, se avisa a mis contactos.",
  "Activo un temporizador de seguridad; si no lo desactivo con PIN, se comparte mi ubicación.",
  "Envío mi ubicación actual a amigos, padres o contactos elegidos.",
  "Llamo o abro una movilidad segura con un solo toque.",
  "Envío alerta, ubicación actual y seguimiento a contactos seleccionados.",
];
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
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
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-4 font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              Ingresar con mi cuenta
            </button>

            <button
              onClick={() => navigate("/register")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-white"
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

      <section className="px-5 py-10">
        <h3 className="text-lg font-bold text-center mb-2">
          Soluciones según tu necesidad
        </h3>
        <p className="text-sm text-slate-400 text-center mb-8">
          Cada situación necesita una respuesta distinta.
        </p>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          {MODULES.map((m) => (
            <div
              key={m.key}
              className={`rounded-2xl border ${m.border} bg-[#11182e] p-5`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                </div>
                <h4 className="text-base font-bold">{m.title}</h4>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-slate-400">
                {m.desc}
              </p>
                {m.key === "hogar" && (
  <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
    <div className="mb-2 text-sm font-semibold text-violet-300">
      Adolescentes seguros
    </div>

    <p className="mb-3 text-xs leading-5 text-slate-400">
      Herramientas para salir, volver y pedir respaldo sin perder autonomía.
    </p>

    <div className="space-y-2">
      {ADOLESCENTES_FEATURES.map((item, index) => (
        <div
          key={item}
          className="rounded-xl border border-white/8 bg-white/5 px-3 py-3"
        >
          <div className="text-xs font-semibold text-slate-100">{item}</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-400">
            {ADOLESCENTES_DETAILS[index]}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
{m.key === "hogar" && (
  <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
    <div className="mb-2 text-sm font-semibold text-violet-300">
      Adolescentes seguros
    </div>

    <p className="mb-3 text-xs leading-5 text-slate-400">
      Herramientas para salir, volver y pedir respaldo sin perder autonomía.
    </p>

    <div className="space-y-2">
      {ADOLESCENTES_FEATURES.map((item, index) => (
        <div
          key={item}
          className="rounded-xl border border-white/8 bg-white/5 px-3 py-3"
        >
          <div className="text-xs font-semibold text-slate-100">{item}</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-400">
            {ADOLESCENTES_DETAILS[index]}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
              <WhatsAppButton
                tipo={m.waTipo}
                label="Consultar este módulo"
                variant="compact"
                size="sm"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10">
        <h3 className="text-lg font-bold text-center mb-2">
          Elegí cómo querés usar Traza 360
        </h3>
        <p className="text-sm text-slate-400 text-center mb-8">
          Protección básica gratis. Más seguimiento, historial y coordinación en
          Premium.
        </p>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-5 ${
                plan.highlight
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-slate-800 bg-[#11182e]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base font-bold">{plan.name}</span>
                <span
                  className={`text-sm font-bold ${
                    plan.highlight ? "text-orange-400" : "text-slate-300"
                  }`}
                >
                  {plan.price}
                </span>
              </div>

              <p className="mb-4 text-sm text-slate-400">{plan.sub}</p>

              <div className="mb-4 space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400">✓</span>
                    <span>{f}</span>
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
      </section>

      <section className="border-t border-slate-800/50 px-5 py-10 text-center">
        <p className="text-sm text-slate-400 mb-4">
          ¿Tenés dudas? Hablá con nosotros.
        </p>

        <WhatsAppButton
          tipo="general"
          label="Hablar por WhatsApp"
          variant="primary"
          size="md"
          className="mx-auto"
        />

        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="text-sm font-bold text-red-400">📞 911</span>
          <span className="text-xs text-slate-500">
            En emergencias inmediatas, contactá primero al servicio oficial.
          </span>
        </div>

        <p className="mt-6 text-xs text-slate-600">
          Traza 360 © 2026 · Hecho en Argentina
        </p>
      </section>

      <WhatsAppFloatingButton tipo="general" />
    </div>
  );
}
