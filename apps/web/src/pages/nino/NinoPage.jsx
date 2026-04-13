// apps/web/src/pages/nino/NinoPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, BigButton, PanicButton, AlertConfirmation } from '../../components/ui';
import { alerts, reminders, tracking } from '../../lib/api';
import useLocation from '../../hooks/useLocation';

export default function NinoPage() {
  const navigate = useNavigate();
  const [alertSent, setAlertSent] = useState(false);
  const [lostSent, setLostSent] = useState(false);
  const [sub, setSub] = useState(null);
  const { getLocation } = useLocation();
  const qc = useQueryClient();

  const tasksQuery = useQuery({ queryKey: ['reminders', 'NINO'], queryFn: () => reminders.list({ module: 'NINO' }), enabled: sub === 'tareas' });
  const lastSignalQuery = useQuery({ queryKey: ['lastSignal'], queryFn: tracking.lastSignal, enabled: sub === 'lastSignal' });

  const createAlert = useMutation({
    mutationFn: async (type) => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return alerts.create({ type, module: 'NINO', latitude: loc?.latitude, longitude: loc?.longitude });
    },
    onSuccess: () => setAlertSent(true),
  });

  const completeTask = useMutation({
    mutationFn: (id) => reminders.complete(id),
    onSuccess: () => qc.invalidateQueries(['reminders']),
  });

  if (alertSent) return <AlertConfirmation color="nino" message="Ficha de búsqueda generada. Ubicación compartida." onClose={() => setAlertSent(false)} />;
  if (lostSent) return <AlertConfirmation color="trabajo" title="¡Tu familia fue avisada!" message="Tu mamá, papá o cuidador ya saben que necesitás ayuda. Quedate donde estás. Tu ubicación fue compartida." onClose={() => setLostSent(false)} />;

  // Sub: Estoy perdido — kid-friendly
  if (sub === 'perdido') return (
    <div className="min-h-screen bg-t-bg flex flex-col items-center justify-center px-7 text-center animate-fadeIn">
      <button onClick={() => setSub(null)} className="absolute top-4 left-4 p-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div className="text-6xl mb-4">🆘</div>
      <h2 className="text-[26px] font-extrabold text-nino font-display mb-3">¿Estás perdido/a?</h2>
      <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-[300px]">Tocá el botón grande y tu familia va a saber dónde estás</p>
      <button onClick={async () => {
        try { const loc = await getLocation(); await alerts.create({ type: 'CHILD_LOST', module: 'NINO', latitude: loc?.latitude, longitude: loc?.longitude }); } catch {}
        setLostSent(true);
      }} className="w-[200px] h-[200px] rounded-full bg-gradient-to-br from-trabajo to-nino border-4 border-nino flex flex-col items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-breathe">
        <span className="text-5xl">👋</span>
        <span className="text-lg font-extrabold text-white mt-2">¡AYUDA!</span>
      </button>
      <p className="text-[15px] text-slate-400 mt-6 max-w-[280px]">No te muevas. Tu familia va a venir.</p>
      <div className="flex gap-3 mt-6 w-full max-w-xs">
        {['Llamar a mamá', 'Llamar a papá'].map(l => (
          <button key={l} className="flex-1 py-4 rounded-2xl bg-t-card border border-nino/20 flex flex-col items-center gap-2">
            <span className="text-xl">📞</span>
            <span className="text-[13px] font-bold text-slate-100">{l}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Sub: Tasks
  if (sub === 'tareas') return (
    <Screen title="Mis Tareas" color="nino" onBack={() => setSub(null)}>
      <p className="text-sm text-slate-400 leading-relaxed">Recordatorios. Si no las completás, tu familiar recibe aviso.</p>
      {tasksQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
      {tasksQuery.data?.map(t => (
        <div key={t.id} className={`${t.status === 'DONE' ? 'bg-success/5 border-success/20' : 'bg-t-card border-t-border'} border rounded-2xl p-4 flex items-center gap-3`}>
          <span className="text-2xl w-11 text-center">{t.emoji || '📌'}</span>
          <div className="flex-1">
            <div className={`text-[16px] font-semibold ${t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>{t.title}</div>
            <div className="text-[13px] text-slate-400">{new Date(t.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</div>
          </div>
          {t.status !== 'DONE' && (
            <button onClick={() => completeTask.mutate(t.id)} className="px-4 py-2 rounded-xl bg-nino text-white text-sm font-bold">¡Listo!</button>
          )}
        </div>
      ))}
      {tasksQuery.data?.length === 0 && <p className="text-center text-slate-500 py-8">Sin tareas cargadas.</p>}
    </Screen>
  );

  // Sub: Last signal
  if (sub === 'lastSignal') {
    const ls = lastSignalQuery.data;
    return (
      <Screen title="Última señal" color="nino" onBack={() => setSub(null)}>
        <p className="text-sm text-slate-400 leading-relaxed mb-2">Ayuda a encontrarme si me pierdo.</p>
        {lastSignalQuery.isLoading && <div className="text-center py-8 text-slate-500">Buscando señal...</div>}
        {ls?.available && (
          <div className="bg-t-card border border-t-border rounded-2xl p-5 space-y-3">
            {[['Última conexión', new Date(ls.recordedAt).toLocaleString('es-AR')], ['Batería', ls.battery ? `${ls.battery}%` : '?'], ['Red', ls.networkType || '?']].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-sm text-slate-400">{k}</span><span className="text-sm font-semibold text-slate-100">{v}</span></div>
            ))}
          </div>
        )}
      </Screen>
    );
  }

  // Main screen
  return (
    <Screen title="Niño Seguro" color="nino" onBack={() => navigate('/')}>
      <p className="text-[15px] text-slate-400 leading-relaxed">Protección y organización para los más chicos.</p>

      {/* 3 prominent buttons */}
      <div className="flex gap-2.5">
        {[
          { k: 'perdido', emoji: '🆘', label: 'Estoy Perdido', sub: 'Pedir ayuda', border: 'border-trabajo/40', bg: 'bg-trabajo/10' },
          { k: 'casa', emoji: '🏠', label: 'Llegar a Casa', sub: 'GPS a mi hogar', border: 'border-success/40', bg: 'bg-success/10' },
          { k: 'tareas', emoji: '📋', label: 'Mis Tareas', sub: 'Pendientes', border: 'border-nino/40', bg: 'bg-nino/10' },
        ].map(b => (
          <button key={b.k} onClick={() => setSub(b.k)} className={`flex-1 py-5 px-2 rounded-[22px] ${bg} border-2 ${b.border} ${b.bg} flex flex-col items-center gap-1.5`}>
            <span className="text-3xl">{b.emoji}</span>
            <span className="text-[14px] font-extrabold text-slate-100">{b.label}</span>
            <span className="text-[10px] text-slate-400">{b.sub}</span>
          </button>
        ))}
      </div>

      <PanicButton label="ACTIVAR BÚSQUEDA" size="sm" onActivate={() => createAlert.mutate('CHILD_LOST')} />

      <BigButton icon={<span className="text-xl">📞</span>} label="Llamar a casa" sub="Mamá, papá o cuidador" color="nino" onClick={() => {}} />

      <BigButton icon={<span className="text-xl">🏃</span>} label="Ya voy a casa" sub="Aviso que estoy en camino" color="nino"
        onClick={async () => {
          try {
            const loc = await getLocation();
            await tracking.start({ type: 'GOING_HOME', latitude: loc?.latitude, longitude: loc?.longitude });
          } catch {}
        }} />

      <BigButton icon={<span className="text-xl">📡</span>} label="Última señal" sub="Ayuda a encontrarme si me pierdo" color="nino"
        onClick={() => setSub('lastSignal')} />

      <BigButton icon={<span className="text-xl">📄</span>} label="Ficha de identificación" sub="Datos, foto, ropa, condiciones" color="nino" onClick={() => {}} />

      <div className="bg-danger/10 border border-danger/15 rounded-2xl py-4 flex items-center justify-center gap-2 mt-1">
        <span className="text-sm text-slate-400 flex items-center gap-2">📞 <strong className="text-danger">911</strong> — Emergencias</span>
      </div>
    </Screen>
  );
}
