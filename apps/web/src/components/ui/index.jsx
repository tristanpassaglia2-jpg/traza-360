// apps/web/src/components/ui/index.jsx
import { useState, useRef } from 'react';

// ── Big action button for modules ──
export function BigButton({ icon, label, sub, color = 'violencia', onClick, className = '' }) {
  const colorMap = {
    violencia: { bg: 'bg-violencia/10', border: 'border-violencia/20', glow: 'shadow-violencia/20' },
    mayor: { bg: 'bg-mayor/10', border: 'border-mayor/20', glow: 'shadow-mayor/20' },
    nino: { bg: 'bg-nino/10', border: 'border-nino/20', glow: 'shadow-nino/20' },
    hogar: { bg: 'bg-hogar/10', border: 'border-hogar/20', glow: 'shadow-hogar/20' },
    trabajo: { bg: 'bg-trabajo/10', border: 'border-trabajo/20', glow: 'shadow-trabajo/20' },
    danger: { bg: 'bg-danger/10', border: 'border-danger/20', glow: 'shadow-danger/20' },
    success: { bg: 'bg-success/10', border: 'border-success/20', glow: 'shadow-success/20' },
    muted: { bg: 'bg-slate-700/10', border: 'border-slate-600/20', glow: '' },
  };
  const c = colorMap[color] || colorMap.violencia;

  return (
    <button onClick={onClick} className={`w-full p-5 ${c.bg} border ${c.border} rounded-2xl flex items-center gap-4 text-left active:scale-[0.98] transition-transform ${className}`}>
      <div className={`w-14 h-14 rounded-2xl bg-${color} flex items-center justify-center shrink-0 shadow-lg ${c.glow}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-bold text-slate-100 leading-tight">{label}</div>
        {sub && <div className="text-[13px] text-slate-400 mt-1 leading-snug">{sub}</div>}
      </div>
    </button>
  );
}

// ── Panic / emergency button (hold to activate) ──
export function PanicButton({ label = 'PEDIR AYUDA', onActivate, size = 'lg' }) {
  const [pressing, setPressing] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const sz = size === 'lg' ? 'w-44 h-44' : 'w-36 h-36';

  const start = () => {
    setPressing(true);
    setCount(0);
    ref.current = setInterval(() => {
      setCount(p => {
        if (p >= 3) { clearInterval(ref.current); onActivate?.(); return 3; }
        return p + 1;
      });
    }, 500);
  };
  const stop = () => {
    setPressing(false);
    setCount(0);
    if (ref.current) clearInterval(ref.current);
  };

  return (
    <div className="text-center my-4">
      <button
        onTouchStart={start} onTouchEnd={stop}
        onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
        className={`${sz} rounded-full border-[3px] border-danger flex flex-col items-center justify-center transition-all ${pressing ? 'scale-95 shadow-[0_0_60px_rgba(239,68,68,0.5)]' : 'animate-breathe shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}
        style={{ background: pressing ? 'radial-gradient(circle, #EF4444, #EF444499)' : 'radial-gradient(circle, #EF4444CC, #EF444466)' }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span className="text-sm font-extrabold text-white mt-2 tracking-wide">
          {pressing ? `${3 - count}...` : label}
        </span>
      </button>
      <p className="text-xs text-slate-500 mt-3">Mantené presionado 2 segundos</p>
    </div>
  );
}

// ── Screen wrapper with header ──
export function Screen({ title, color, onBack, children, right }) {
  return (
    <div className="min-h-screen bg-t-bg pb-10 animate-fadeIn">
      <div className="flex items-center gap-3 px-5 pt-4 pb-2 sticky top-0 z-20 bg-t-bg/95 backdrop-blur-md">
        {onBack && (
          <button onClick={onBack} className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <span className={`text-lg font-bold font-display text-${color || 'slate-100'}`}>{title}</span>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="px-5 flex flex-col gap-3">{children}</div>
    </div>
  );
}

// ── Paywall modal ──
export function PaywallModal({ feature, onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-t-card rounded-3xl p-6 w-full max-w-sm border border-t-border">
        <h3 className="text-xl font-bold font-display text-center mb-2">
          Elegí cómo querés usar Traza 360
        </h3>
        <p className="text-sm text-slate-400 text-center mb-6">
          Protección básica gratis. Seguimiento, nube y coordinación familiar en Premium.
        </p>

        {/* Plan cards */}
        {[
          { id: 'FREE', name: 'Gratis', price: '$0', sub: 'Lo esencial para cuidarte', current: true },
          { id: 'PREMIUM_PERSONAL', name: 'Premium Personal', price: '$4.99/mes', sub: 'Más seguimiento, más respaldo', highlight: true },
          { id: 'PREMIUM_FAMILIAR', name: 'Premium Familiar', price: '$9.99/mes', sub: 'Para cuidarte en red' },
        ].map(plan => (
          <button
            key={plan.id}
            onClick={() => plan.highlight ? onUpgrade?.(plan.id) : null}
            className={`w-full p-4 rounded-2xl mb-3 text-left border transition ${plan.highlight ? 'border-trabajo bg-trabajo/10' : 'border-t-border bg-t-surface'}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-100">{plan.name}</span>
              <span className={`text-sm font-bold ${plan.highlight ? 'text-trabajo' : 'text-slate-400'}`}>{plan.price}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{plan.sub}</p>
          </button>
        ))}

        <button onClick={onClose} className="w-full p-3 mt-2 text-slate-400 text-sm font-semibold">
          Ahora no
        </button>
      </div>
    </div>
  );
}

// ── Alert confirmation overlay ──
export function AlertConfirmation({ color = 'danger', title = 'Alerta enviada', message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-fadeIn">
      <div className={`w-28 h-28 rounded-full border-[3px] border-${color} bg-${color}/10 flex items-center justify-center mb-7 shadow-[0_0_50px_rgba(239,68,68,0.3)]`}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-${color}`}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-3 text-center font-display">{title}</h2>
      <p className="text-slate-400 text-center leading-relaxed max-w-xs mb-9">{message}</p>
      <button onClick={onClose} className={`px-12 py-4 rounded-2xl bg-${color} text-white font-bold text-base`}>
        Entendido
      </button>
    </div>
  );
}
