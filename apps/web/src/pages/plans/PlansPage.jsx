// apps/web/src/pages/plans/PlansPage.jsx
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { subscriptions } from '../../lib/api';
import useAuthStore from '../../context/authStore';

const planMeta = {
  FREE: { emoji: '🛡️', name: 'Gratis', sub: 'Lo esencial para cuidarte', color: 'slate-400', features: ['Botón de ayuda', 'Alerta silenciosa', '911', '2 contactos', 'Última señal', 'Historial corto', 'Recordatorios básicos', 'Medicamentos básicos'] },
  PREMIUM_PERSONAL: { emoji: '⭐', name: 'Premium Personal', sub: 'Más seguimiento, más respaldo', color: 'trabajo', features: ['Todo lo gratis +', 'Contactos ilimitados', 'Evidencia en nube', 'Historial completo', 'Tracking extendido', 'Camuflaje', 'Recordatorios ilimitados', 'Medicamentos ampliados'] },
  PREMIUM_FAMILIAR: { emoji: '👨‍👩‍👧', name: 'Premium Familiar', sub: 'Para cuidarte en red', color: 'violencia', features: ['Todo Premium +', 'Varios cuidadores', 'Panel familiar', 'Ver check-ins', 'Ver medicación omitida', 'Varias personas protegidas'] },
};

export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const currentSub = useQuery({ queryKey: ['subscription'], queryFn: subscriptions.me });
  const currentPlan = currentSub.data?.planId || currentSub.data?.plan?.id || 'FREE';

  const upgrade = useMutation({
    mutationFn: subscriptions.upgrade,
    onSuccess: () => { qc.invalidateQueries(['subscription']); alert('Plan actualizado'); },
  });

  return (
    <Screen title="Planes" color="slate-100" onBack={() => navigate(-1)}>
      <h2 className="text-xl font-bold font-display text-center text-slate-100 mt-2">
        Elegí cómo querés usar Traza 360
      </h2>
      <p className="text-sm text-slate-400 text-center leading-relaxed mb-4">
        Protección básica gratis. Seguimiento, nube y coordinación familiar en Premium.
      </p>

      {Object.entries(planMeta).map(([id, plan]) => {
        const isCurrent = currentPlan === id;
        const isHighlight = id === 'PREMIUM_PERSONAL';
        return (
          <div key={id} className={`rounded-2xl p-5 border transition ${isCurrent ? 'border-violencia/40 bg-violencia/10' : isHighlight ? 'border-trabajo/40 bg-trabajo/5' : 'border-t-border bg-t-card'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plan.emoji}</span>
                <span className="text-[16px] font-bold text-slate-100">{plan.name}</span>
              </div>
              {isCurrent && <span className="text-xs font-bold text-violencia bg-violencia/10 px-3 py-1 rounded-lg">Tu plan</span>}
            </div>
            <p className="text-sm text-slate-400 mb-3">{plan.sub}</p>
            <div className="space-y-1.5 mb-4">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-success text-xs">✓</span>
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            {!isCurrent && id !== 'FREE' && (
              <button onClick={() => upgrade.mutate(id)} disabled={upgrade.isPending}
                className={`w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform ${id === 'PREMIUM_PERSONAL' ? 'bg-trabajo text-white' : 'bg-violencia text-white'}`}>
                {upgrade.isPending ? 'Procesando...' : `Elegir ${plan.name}`}
              </button>
            )}
          </div>
        );
      })}

      <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed px-4">
        La ayuda básica nunca se bloquea. Premium amplía seguimiento, historial, nube y coordinación familiar.
      </p>
    </Screen>
  );
}
