import { useNavigate } from "react-router-dom";
import WhatsAppButton, { WhatsAppFloatingButton } from "../../components/ui/WhatsAppButton";

const MODULES = [
  { key: "violencia", waTipo: "violencia", emoji: "🛡️", title: "Violencia de Género", desc: "Alerta silenciosa, grabación de evidencia, pantalla de camuflaje, diario de incidentes.", color: "from-purple-500 to-purple-600", border: "border-purple-500/20" },
  { key: "adulto_mayor", waTipo: "adulto_mayor", emoji: "❤️", title: "Adulto Mayor", desc: "Recordatorio de medicamentos, check-in automático, detección de caídas, GPS a casa.", color: "from-sky-500 to-sky-600", border: "border-sky-500/20" },
  { key: "ninos", waTipo: "ninos", emoji: "👶", title: "Niño Seguro", desc: "Botón de estoy perdido, GPS a casa, tareas, ficha de identificación.", color: "from-amber-500 to-amber-600", border: "border-amber-500/20" },
  { key: "hogar", waTipo: "hogar", emoji: "🏠", title: "Hogar Seguro", desc: "Detección de intrusos, monitoreo de sonido, temporizador de seguridad.", color: "from-emerald-500 to-emerald-600", border: "border-emerald-500/20" },
  { key: "trabajo", waTipo: "trabajo_domicilio", emoji: "💼", title: "Trabajo Seguro", desc: "Trayecto protegido, zona de riesgo con timer, última señal, check-in.", color: "from-orange-500 to-orange-600", border: "border-orange-500/20" },
];

const PLANS = [
  { name: "Gratis", price: "$0", sub: "Lo esencial para cuidarte", features: ["Botón de ayuda", "Alerta silenciosa", "911", "2 contactos", "Última señal"], highlight: false },
  { name: "Premium Personal", price: "$4.99/mes", sub: "Más seguimiento, más respaldo", features: ["Todo lo gratis +", "Contactos ilimitados", "Evidencia en nube", "Historial completo", "Tracking extendido", "Camuflaje"], highlight: true },
  { name: "Premium Familiar", price: "$9.99/mes", sub: "Para cuidarte en red", features: ["Todo Premium +", "Varios cuidadores", "Panel familiar", "Ver check-ins", "Ver medicación"], highlight: false },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#05080F] text-slate-100">
      <section className="px-6 pt-16 pb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">TRAZA 360</h1>
        </div>
        <p className="text-sm text-slate-400 tracking-[0.15em] font-semibold mb-6">PROTECCIÓN REAL · RESPUESTA INMEDIATA</p>
        <h2 className="text-xl font-bold leading-tight mb-4 px-4">Protección y trazabilidad para personas en riesgo</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">Última señal. Respuesta real. La app que cuida cuando nadie más puede hacerlo.</p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button onClick={() => navigate("/register")} className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 text-white font-bold shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform">Crear cuenta gratis</button>
          <WhatsAppButton tipo="demo" label="Solicitar demo por WhatsApp" variant="outline" size="md" className="w-full" />
          <button onClick={() => navigate("/login")} className="text-slate-400 text-sm font-semibold py-2">Ya tengo cuenta → Ingresar</button>
        </div>
      </section>

      <section className="px-5 py-10">
        <h3 className="text-lg font-bold text-center mb-2">5 módulos de protección</h3>
        <p className="text-sm text-slate-400 text-center mb-8">Cada persona tiene una necesidad distinta. Traza se adapta.</p>
        <div className="flex flex-col gap-4">
          {MODULES.map(m => (
            <div key={m.key} className={`bg-[#111B2E] border ${m.border} rounded-2xl p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-lg`}><span className="text-2xl">{m.emoji}</span></div>
                <h4 className="text-base font-bold">{m.title}</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{m.desc}</p>
              <WhatsAppButton tipo={m.waTipo} label="Quiero este plan" variant="compact" size="sm" className="w-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10">
        <h3 className="text-lg font-bold text-center mb-2">Elegí cómo querés usar Traza 360</h3>
        <p className="text-sm text-slate-400 text-center mb-8">Protección básica gratis. Seguimiento, nube y coordinación familiar en Premium.</p>
        <div className="flex flex-col gap-4">
          {PLANS.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-5 border ${plan.highlight ? "border-orange-500/30 bg-orange-500/5" : "border-slate-700/30 bg-[#111B2E]"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold">{plan.name}</span>
                <span className={`text-sm font-bold ${plan.highlight ? "text-orange-400" : "text-slate-400"}`}>{plan.price}</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">{plan.sub}</p>
              <div className="space-y-1.5 mb-4">
                {plan.features.map(f => (<div key={f} className="flex items-center gap-2"><span className="text-emerald-400 text-xs">✓</span><span className="text-sm text-slate-300">{f}</span></div>))}
              </div>
              <WhatsAppButton tipo="planes" label="Consultar planes" variant={plan.highlight ? "primary" : "compact"} size="sm" className="w-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10 text-center border-t border-slate-800/50">
        <p className="text-sm text-slate-400 mb-4">¿Tenés dudas? Hablá con nosotros</p>
        <WhatsAppButton tipo="general" label="Hablar por WhatsApp" variant="primary" size="md" className="mx-auto" />
        <div className="mt-8 flex items-center justify-center gap-2"><span className="text-sm font-bold text-red-400">📞 911 Emergencias</span></div>
        <p className="text-xs text-slate-600 mt-6">Traza 360 © 2026 · Hecho en Argentina 🇦🇷</p>
      </section>

      <WhatsAppFloatingButton tipo="general" />
    </div>
  );
}
