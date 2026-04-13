// apps/web/src/pages/home/HomePage.jsx
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';

const modules = [
  { key: 'violencia', path: '/violencia', icon: '🛡️', label: 'Violencia de Género', sub: 'Alerta, grabación, evidencia', color: 'violencia' },
  { key: 'mayor', path: '/mayor', icon: '❤️', label: 'Adulto Mayor', sub: 'Medicamentos, caída, check-in', color: 'mayor' },
  { key: 'nino', path: '/nino', icon: '👶', label: 'Niño Seguro', sub: 'Estoy perdido, tareas, búsqueda', color: 'nino' },
  { key: 'hogar', path: '/hogar', icon: '🏠', label: 'Hogar Seguro', sub: 'Intrusión, monitoreo, timer', color: 'hogar' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const colorBorder = { violencia: 'border-violencia/15', mayor: 'border-mayor/15', nino: 'border-nino/15', hogar: 'border-hogar/15' };
  const colorBg = { violencia: 'from-violencia to-violencia/70', mayor: 'from-mayor to-mayor/70', nino: 'from-nino to-nino/70', hogar: 'from-hogar to-hogar/70' };
  const colorShadow = { violencia: 'shadow-violencia/20', mayor: 'shadow-mayor/20', nino: 'shadow-nino/20', hogar: 'shadow-hogar/20' };

  return (
    <div className="min-h-screen bg-t-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violencia to-mayor flex items-center justify-center shadow-lg shadow-violencia/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-[26px] font-extrabold font-display bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">TRAZA 360</h1>
        </div>
        <p className="text-[11px] text-slate-500 tracking-[0.1em] font-semibold">PROTECCIÓN REAL · RESPUESTA INMEDIATA</p>
        {user?.displayName && <p className="text-sm text-slate-400 mt-2">Hola, {user.displayName}</p>}
      </div>

      {/* 4 module grid */}
      <div className="flex-1 px-4 pt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 flex-1">
          {modules.map(m => (
            <button key={m.key} onClick={() => navigate(m.path)}
              className={`bg-t-card border ${colorBorder[m.color]} rounded-[20px] p-5 flex flex-col items-center justify-center text-center gap-2 active:scale-[0.97] transition-transform`}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorBg[m.color]} flex items-center justify-center shadow-lg ${colorShadow[m.color]}`}>
                <span className="text-2xl">{m.icon}</span>
              </div>
              <div className="text-[14px] font-bold text-slate-100 leading-tight">{m.label}</div>
              <div className="text-[11px] text-slate-400 leading-snug">{m.sub}</div>
            </button>
          ))}
        </div>

        {/* Trabajo Seguro - full width */}
        <button onClick={() => navigate('/trabajo')}
          className="w-full bg-t-card border border-trabajo/15 rounded-[20px] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-trabajo to-trabajo/70 flex items-center justify-center shadow-lg shadow-trabajo/20 shrink-0">
            <span className="text-2xl">💼</span>
          </div>
          <div>
            <div className="text-[16px] font-bold text-slate-100">Trabajo Seguro</div>
            <div className="text-[12px] text-slate-400 mt-1">Delivery, técnicos, cobranzas, vendedores, acompañantes</div>
          </div>
        </button>
      </div>

      {/* Bottom nav */}
      <div className="px-4 pt-3 pb-6 flex flex-col gap-3">
        {/* Quick links */}
        <div className="flex gap-2">
          {[
            { label: 'Contactos', path: '/contacts', icon: '👥' },
            { label: 'Historial', path: '/history', icon: '📋' },
            { label: 'Ajustes', path: '/settings', icon: '⚙️' },
          ].map(l => (
            <button key={l.path} onClick={() => navigate(l.path)}
              className="flex-1 bg-t-card border border-t-border rounded-2xl py-3 flex flex-col items-center gap-1 active:scale-[0.97] transition-transform">
              <span className="text-lg">{l.icon}</span>
              <span className="text-[11px] text-slate-400 font-semibold">{l.label}</span>
            </button>
          ))}
        </div>

        {/* 911 */}
        <div className="bg-danger/10 border border-danger/15 rounded-2xl py-3 flex items-center justify-center gap-2">
          <span className="text-[15px] font-extrabold text-danger tracking-wide">📞 911 Emergencias</span>
        </div>
        <p className="text-[10px] text-slate-500 text-center tracking-wide">Última señal. Respuesta real.</p>
      </div>
    </div>
  );
}
