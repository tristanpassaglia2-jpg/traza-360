// apps/web/src/pages/trabajo/TrabajoPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Screen, BigButton, PanicButton, AlertConfirmation } from '../../components/ui';
import { alerts, tracking } from '../../lib/api';
import useLocation from '../../hooks/useLocation';

export default function TrabajoPage() {
  const navigate = useNavigate();
  const [alertSent, setAlertSent] = useState(false);
  const [sub, setSub] = useState(null);
  const [dest, setDest] = useState('');
  const [dur, setDur] = useState('30');
  const [visitType, setVisitType] = useState('Delivery');
  const [timerActive, setTimerActive] = useState(false);
  const [timerMin, setTimerMin] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const timerRef = useRef(null);
  const { getLocation } = useLocation();

  const lastSignalQuery = useQuery({ queryKey: ['lastSignal'], queryFn: tracking.lastSignal, enabled: sub === 'senal' });
  const historyQuery = useQuery({ queryKey: ['trackingHistory'], queryFn: tracking.history, enabled: sub === 'historial' });

  const createAlert = useMutation({
    mutationFn: async (type) => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return alerts.create({ type, module: 'TRABAJO', latitude: loc?.latitude, longitude: loc?.longitude });
    },
    onSuccess: () => setAlertSent(true),
  });

  const startRoute = useMutation({
    mutationFn: async () => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return tracking.start({ type: 'ROUTE', destination: dest, durationMin: parseInt(dur), latitude: loc?.latitude, longitude: loc?.longitude });
    },
    onSuccess: () => setSub('enRuta'),
  });

  const stopRoute = useMutation({ mutationFn: (id) => tracking.stop(id) });

  // Zone timer
  const startZoneTimer = (mins) => {
    setTimerMin(mins); setTimerSec(0); setTimerActive(true);
    if (timerRef.current) clearInterval(timerRef.current);
    let total = mins * 60;
    timerRef.current = setInterval(() => {
      total--;
      if (total <= 0) { clearInterval(timerRef.current); setTimerActive(false); createAlert.mutate('WORK_EMERGENCY'); return; }
      setTimerMin(Math.floor(total / 60)); setTimerSec(total % 60);
    }, 1000);
  };
  const cancelTimer = () => { if (timerRef.current) clearInterval(timerRef.current); setTimerActive(false); setSub(null); };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (alertSent) return <AlertConfirmation color="trabajo" message="Alerta activada. Tu última señal, ubicación y hora fueron compartidas." onClose={() => setAlertSent(false)} />;

  // Sub: Active route
  if (sub === 'enRuta') return (
    <Screen title="Trayecto activo" color="trabajo" onBack={() => setSub(null)}>
      <div className="text-center pt-5">
        <div className="w-28 h-28 rounded-full bg-trabajo/10 border-2 border-trabajo/30 flex items-center justify-center mx-auto mb-5 animate-breathe">
          <span className="text-4xl">🧭</span>
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-1">Trayecto en curso</h3>
        <p className="text-sm text-slate-400">{dest || 'Destino personalizado'}</p>
      </div>
      <div className="bg-success/10 border border-success/20 rounded-2xl py-3 px-4 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
        <span className="text-sm font-semibold text-success">Señal activa — actualizando cada 30 seg</span>
      </div>
      <div className="bg-t-card border border-t-border rounded-2xl p-4 space-y-2.5">
        {[['Tiempo estimado', `${dur} min`], ['Tipo', visitType], ['Contactos notificados', '2 personas']].map(([k, v]) => (
          <div key={k} className="flex justify-between"><span className="text-sm text-slate-400">{k}</span><span className="text-sm font-semibold text-slate-100">{v}</span></div>
        ))}
      </div>
      <button onClick={() => setSub(null)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-success to-success/80 text-white font-bold text-base shadow-lg shadow-success/20 active:scale-[0.98] transition-transform">
        ✓ Llegué bien
      </button>
      <button onClick={() => createAlert.mutate('WORK_EMERGENCY')} className="w-full py-4 rounded-2xl bg-gradient-to-r from-danger to-danger/80 text-white font-bold shadow-lg shadow-danger/20">
        Necesito ayuda
      </button>
      <div className="bg-trabajo/10 border border-trabajo/15 rounded-2xl p-4 mt-1">
        <p className="text-[13px] text-slate-400 leading-relaxed"><strong className="text-trabajo">Si dejás de responder,</strong> compartiremos tu última señal con tus contactos.</p>
      </div>
    </Screen>
  );

  // Sub: Start route form
  if (sub === 'trayecto') return (
    <Screen title="Iniciar trayecto" color="trabajo" onBack={() => setSub(null)}>
      <p className="text-sm text-slate-400 leading-relaxed mb-2">Si no confirmás llegada, compartimos tu última señal.</p>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destino</label>
      <input value={dest} onChange={e => setDest(e.target.value)} placeholder="¿A dónde vas?"
        className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 outline-none focus:border-trabajo/40 mb-3" />
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración estimada (min)</label>
      <input value={dur} onChange={e => setDur(e.target.value)} type="number"
        className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 outline-none focus:border-trabajo/40 mb-3" />
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de visita</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {['Delivery', 'Visita técnica', 'Cobranza', 'Venta', 'Acompañante', 'Otro'].map(t => (
          <button key={t} onClick={() => setVisitType(t)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${visitType === t ? 'bg-trabajo text-white' : 'bg-t-card text-slate-400 border border-t-border'}`}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={() => startRoute.mutate()} disabled={startRoute.isPending}
        className="w-full py-5 rounded-2xl bg-gradient-to-r from-trabajo to-trabajo/80 text-white text-[17px] font-extrabold shadow-lg shadow-trabajo/20 active:scale-[0.98] transition-transform disabled:opacity-50">
        🛡️ Comenzar trayecto protegido
      </button>
    </Screen>
  );

  // Sub: Zone risk timer
  if (sub === 'zona') return (
    <Screen title="Zona de riesgo" color="trabajo" onBack={() => !timerActive && setSub(null)}>
      {!timerActive ? (
        <>
          <p className="text-[15px] text-slate-400 leading-relaxed">¿Entrás a un lugar riesgoso? Activá el timer. Si no lo desactivás, se dispara la alerta.</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">¿Cuánto tiempo vas a estar?</p>
          <div className="grid grid-cols-2 gap-3">
            {[10, 15, 30, 45, 60, 120].map(m => (
              <button key={m} onClick={() => startZoneTimer(m)} className="py-5 rounded-2xl bg-trabajo/10 border-2 border-trabajo/25 text-lg font-bold text-slate-100 active:scale-95 transition-transform">
                {m < 60 ? `${m} min` : `${m / 60} hora${m > 60 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center pt-4">
          <div className={`w-[200px] h-[200px] rounded-full mx-auto flex flex-col items-center justify-center border-4 transition-all ${timerMin < 2 ? 'border-danger animate-breathe shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-trabajo shadow-[0_0_40px_rgba(249,115,22,0.2)]'}`}>
            <span className={`text-5xl font-extrabold font-mono tracking-wider ${timerMin < 2 ? 'text-danger' : 'text-slate-100'}`}>
              {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
            </span>
          </div>
          <button onClick={cancelTimer} className="w-full py-5 mt-8 rounded-2xl bg-gradient-to-r from-success to-success/80 text-white text-lg font-extrabold shadow-lg shadow-success/20">
            ✓ ESTOY BIEN — DESACTIVAR
          </button>
          <button onClick={() => { cancelTimer(); createAlert.mutate('WORK_EMERGENCY'); }} className="w-full py-4 mt-3 rounded-2xl bg-gradient-to-r from-danger to-danger/80 text-white font-bold shadow-lg shadow-danger/20">
            Necesito ayuda ahora
          </button>
        </div>
      )}
    </Screen>
  );

  // Sub: Last signal
  if (sub === 'senal') {
    const ls = lastSignalQuery.data;
    return (
      <Screen title="Última señal" color="trabajo" onBack={() => setSub(null)}>
        <p className="text-sm text-slate-400 leading-relaxed mb-2">Tu última ubicación y estado conocido.</p>
        {lastSignalQuery.isLoading && <div className="text-center py-8 text-slate-500">Buscando...</div>}
        {ls?.available && (
          <div className="bg-t-card border border-t-border rounded-2xl p-5 space-y-3">
            {[['Última conexión', new Date(ls.recordedAt).toLocaleString('es-AR')], ['Batería', ls.battery ? `${ls.battery}%` : '?'], ['Red', ls.networkType || '?'], ['Evento', ls.destination || ls.sessionType || '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-sm text-slate-400">{k}</span><span className="text-sm font-semibold text-slate-100">{v}</span></div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 text-center italic mt-2">Última ubicación conocida, no la actual.</p>
      </Screen>
    );
  }

  // Sub: History
  if (sub === 'historial') return (
    <Screen title="Historial de jornada" color="trabajo" onBack={() => setSub(null)}>
      {historyQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
      {historyQuery.data?.map(s => (
        <div key={s.id} className="bg-t-card border border-t-border rounded-2xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${s.status === 'COMPLETED' ? 'bg-success/10' : 'bg-trabajo/10'} flex items-center justify-center`}>
            <span>{s.status === 'COMPLETED' ? '✅' : '🔄'}</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100">{s.destination || s.type}</div>
            <div className="text-xs text-slate-400">{new Date(s.startedAt).toLocaleString('es-AR')} · {s._count?.points || 0} puntos</div>
          </div>
        </div>
      ))}
      {historyQuery.data?.length === 0 && <p className="text-center text-slate-500 py-8">Sin trayectos registrados.</p>}
    </Screen>
  );

  // Main screen
  return (
    <Screen title="Trabajo Seguro" color="trabajo" onBack={() => navigate('/')}>
      <p className="text-[15px] text-slate-400 leading-relaxed">Protección para trabajadores en movimiento. Tu señal queda registrada.</p>

      <PanicButton label="EMERGENCIA" onActivate={() => createAlert.mutate('WORK_EMERGENCY')} />

      <BigButton icon={<span className="text-xl">🛣️</span>} label="Iniciar trayecto protegido" sub="Avisá a dónde vas. Si no llegás, actuamos." color="trabajo"
        onClick={() => setSub('trayecto')} />

      {/* Zone risk - prominent */}
      <button onClick={() => setSub('zona')} className="w-full p-5 bg-danger/8 border-2 border-danger/30 rounded-2xl flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-danger to-trabajo flex items-center justify-center shrink-0 shadow-lg shadow-danger/20">
          <span className="text-xl">⏱️</span>
        </div>
        <div>
          <div className="text-[17px] font-bold text-slate-100">Entro a zona de riesgo</div>
          <div className="text-[13px] text-slate-400 mt-1">Timer automático. Si no desactivás, se dispara alerta.</div>
        </div>
      </button>

      <BigButton icon={<span className="text-xl">🏃</span>} label="Estoy en camino" sub="Activa seguimiento hasta llegar" color="trabajo"
        onClick={async () => {
          try {
            const loc = await getLocation();
            await tracking.start({ type: 'ON_MY_WAY', latitude: loc?.latitude, longitude: loc?.longitude, durationMin: 60 });
          } catch {}
        }} />

      <BigButton icon={<span className="text-xl">📍</span>} label="Check-in de seguridad" sub="Llegué, terminé o salí del lugar" color="trabajo"
        onClick={() => {/* TODO: quick check-in */}} />

      <BigButton icon={<span className="text-xl">📡</span>} label="Última señal" sub="Tu última ubicación y estado" color="nino"
        onClick={() => setSub('senal')} />

      <BigButton icon={<span className="text-xl">📋</span>} label="Historial de jornada" sub="Trayectos, alertas y eventos del día" color="trabajo"
        onClick={() => setSub('historial')} />

      <BigButton icon={<span className="text-xl">🔔</span>} label="Alerta silenciosa" sub="Avisá sin que el cliente lo note" color="trabajo"
        onClick={() => createAlert.mutate('SILENT')} />

      {/* Tags */}
      <div className="bg-t-card border border-t-border rounded-2xl p-4">
        <p className="text-xs font-bold text-slate-500 tracking-wider mb-2">PENSADO PARA</p>
        <div className="flex flex-wrap gap-1.5">
          {['Delivery', 'Técnicos', 'Cobranzas', 'Vendedores', 'Acompañantes', 'Visitas', 'Inmobiliarias', 'Salud'].map(tag => (
            <span key={tag} className="px-3 py-1.5 rounded-lg bg-trabajo/10 border border-trabajo/15 text-xs font-semibold text-trabajo">{tag}</span>
          ))}
        </div>
      </div>
    </Screen>
  );
}
