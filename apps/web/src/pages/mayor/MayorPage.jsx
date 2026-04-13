// apps/web/src/pages/mayor/MayorPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, BigButton, PanicButton, AlertConfirmation } from '../../components/ui';
import { alerts, medications, tracking, reminders } from '../../lib/api';
import useLocation from '../../hooks/useLocation';

export default function MayorPage() {
  const navigate = useNavigate();
  const [alertSent, setAlertSent] = useState(false);
  const [sub, setSub] = useState(null); // null | 'meds' | 'reminders' | 'lastSignal'
  const { getLocation } = useLocation();
  const qc = useQueryClient();

  const medsQuery = useQuery({ queryKey: ['medications'], queryFn: medications.list, enabled: sub === 'meds' });
  const lastSignalQuery = useQuery({ queryKey: ['lastSignal'], queryFn: tracking.lastSignal, enabled: sub === 'lastSignal' });
  const remindersQuery = useQuery({ queryKey: ['reminders', 'MAYOR'], queryFn: () => reminders.list({ module: 'MAYOR' }), enabled: sub === 'reminders' });

  const createAlert = useMutation({
    mutationFn: async (type) => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return alerts.create({ type, module: 'MAYOR', latitude: loc?.latitude, longitude: loc?.longitude });
    },
    onSuccess: () => setAlertSent(true),
  });

  const confirmDose = useMutation({
    mutationFn: ({ medId, time }) => medications.confirmDose(medId, { scheduledTime: time }),
    onSuccess: () => qc.invalidateQueries(['medications']),
  });

  const completeReminder = useMutation({
    mutationFn: (id) => reminders.complete(id),
    onSuccess: () => qc.invalidateQueries(['reminders']),
  });

  if (alertSent) return <AlertConfirmation color="mayor" message="Tu familiar o cuidador fue notificado con tu ubicación y estado." onClose={() => setAlertSent(false)} />;

  // Sub: Medications
  if (sub === 'meds') return (
    <Screen title="Mis medicamentos" color="mayor" onBack={() => setSub(null)}>
      <p className="text-sm text-slate-400 leading-relaxed">Si no confirmás la toma, avisamos a tu cuidador.</p>
      {medsQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
      {medsQuery.data?.map(med => (
        <div key={med.id}>
          {med.schedules?.map(sch => (
            <div key={sch.id} className="bg-t-card border border-t-border rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-mayor/10 flex items-center justify-center">
                  <span className="text-lg">💊</span>
                </div>
                <div>
                  <div className="text-[16px] font-semibold text-slate-100">{med.name} {med.dosage || ''}</div>
                  <div className="text-[13px] text-slate-400">{sch.timeOfDay} hs</div>
                </div>
              </div>
              <button onClick={() => confirmDose.mutate({ medId: med.id, time: sch.timeOfDay })}
                className="px-5 py-2.5 rounded-xl bg-mayor text-white text-sm font-bold active:scale-95 transition-transform">
                Tomé
              </button>
            </div>
          ))}
        </div>
      ))}
      {medsQuery.data?.length === 0 && <p className="text-center text-slate-500 py-8">No hay medicamentos cargados. Agregá desde Ajustes.</p>}
    </Screen>
  );

  // Sub: Last signal
  if (sub === 'lastSignal') {
    const ls = lastSignalQuery.data;
    return (
      <Screen title="Última señal" color="mayor" onBack={() => setSub(null)}>
        <p className="text-sm text-slate-400 leading-relaxed mb-2">Última ubicación, batería y conexión conocidas.</p>
        {lastSignalQuery.isLoading && <div className="text-center py-8 text-slate-500">Buscando señal...</div>}
        {ls && !ls.available && <p className="text-center text-slate-500 py-8">Aún no hay señal registrada.</p>}
        {ls?.available && (
          <div className="bg-t-card border border-t-border rounded-2xl p-5 space-y-3">
            {[
              ['Última conexión', new Date(ls.recordedAt).toLocaleString('es-AR')],
              ['Latitud', ls.latitude?.toFixed(5)],
              ['Longitud', ls.longitude?.toFixed(5)],
              ['Batería', ls.battery ? `${ls.battery}%` : 'Desconocida'],
              ['Red', ls.networkType || 'Desconocida'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-sm text-slate-400">{k}</span><span className="text-sm font-semibold text-slate-100">{v}</span></div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 text-center italic mt-2">Esta es la última ubicación conocida, no la actual.</p>
      </Screen>
    );
  }

  // Sub: Reminders
  if (sub === 'reminders') return (
    <Screen title="Recordatorios" color="mayor" onBack={() => setSub(null)}>
      <p className="text-sm text-slate-400 leading-relaxed">Cosas para hacer durante el día.</p>
      {remindersQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
      {remindersQuery.data?.map(r => (
        <div key={r.id} className={`${r.status === 'DONE' ? 'bg-success/5 border-success/20' : 'bg-t-card border-t-border'} border rounded-2xl p-4 flex items-center gap-3`}>
          <span className="text-2xl">{r.emoji || '📌'}</span>
          <div className="flex-1">
            <div className={`text-[16px] font-semibold ${r.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>{r.title}</div>
            <div className="text-[13px] text-slate-400">{new Date(r.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</div>
          </div>
          {r.status !== 'DONE' && (
            <button onClick={() => completeReminder.mutate(r.id)} className="px-4 py-2 rounded-xl bg-mayor text-white text-sm font-bold">¡Listo!</button>
          )}
        </div>
      ))}
      {remindersQuery.data?.length === 0 && <p className="text-center text-slate-500 py-8">Sin recordatorios. Agregá desde Ajustes.</p>}
    </Screen>
  );

  // Main screen
  return (
    <Screen title="Adulto Mayor" color="mayor" onBack={() => navigate('/')}>
      <p className="text-[15px] text-slate-400 leading-relaxed">Simple, claro, sin complicaciones.</p>

      <PanicButton label="NECESITO AYUDA" onActivate={() => createAlert.mutate('PANIC')} />

      <BigButton icon={<span className="text-xl">✅</span>} label="Estoy bien" sub="Confirmá tu estado a tu familiar" color="success"
        onClick={() => {/* TODO: send check-in */}} />

      <BigButton icon={<span className="text-xl">🧭</span>} label="Llegar a casa" sub="GPS directo a tu hogar preconfigurado" color="mayor"
        onClick={() => {/* TODO: start navigation to home */}} />

      <BigButton icon={<span className="text-xl">💊</span>} label="Mis medicamentos" sub="Recordatorios y confirmación de toma" color="mayor"
        onClick={() => setSub('meds')} />

      <BigButton icon={<span className="text-xl">📋</span>} label="Recordatorios" sub="Cosas para hacer durante el día" color="mayor"
        onClick={() => setSub('reminders')} />

      <BigButton icon={<span className="text-xl">📡</span>} label="Última señal" sub="Última ubicación, batería y conexión" color="nino"
        onClick={() => setSub('lastSignal')} />

      <BigButton icon={<span className="text-xl">📞</span>} label="Llamar a mi familiar" sub="Llamada directa con un toque" color="mayor"
        onClick={() => {/* TODO: tel: link */}} />

      <BigButton icon={<span className="text-xl">🚨</span>} label="Caída o accidente" sub="Alerta inmediata" color="danger"
        onClick={() => createAlert.mutate('FALL')} />
    </Screen>
  );
}
