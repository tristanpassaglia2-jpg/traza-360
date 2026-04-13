// apps/web/src/pages/hogar/HogarPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Screen, BigButton, PanicButton, AlertConfirmation } from '../../components/ui';
import { alerts, tracking } from '../../lib/api';
import useLocation from '../../hooks/useLocation';

export default function HogarPage() {
  const navigate = useNavigate();
  const [alertSent, setAlertSent] = useState(false);
  const [sub, setSub] = useState(null);
  const [modoOn, setModoOn] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMin, setTimerMin] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const timerRef = useRef(null);
  const { getLocation } = useLocation();

  const createAlert = useMutation({
    mutationFn: async (type) => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return alerts.create({ type, module: 'HOGAR', latitude: loc?.latitude, longitude: loc?.longitude });
    },
    onSuccess: () => setAlertSent(true),
  });

  const startTimer = (mins) => {
    setTimerMin(mins); setTimerSec(0); setTimerActive(true);
    if (timerRef.current) clearInterval(timerRef.current);
    let total = mins * 60;
    timerRef.current = setInterval(() => {
      total--;
      if (total <= 0) { clearInterval(timerRef.current); setTimerActive(false); createAlert.mutate('PANIC'); return; }
      setTimerMin(Math.floor(total / 60));
      setTimerSec(total % 60);
    }, 1000);
  };
  const cancelTimer = () => { if (timerRef.current) clearInterval(timerRef.current); setTimerActive(false); setSub(null); };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (alertSent) return <AlertConfirmation color="danger" message="Alerta activada. Grabación iniciada. Contactos y 911 notificados." onClose={() => setAlertSent(false)} />;

  // Sub: Timer
  if (sub === 'timer') return (
    <Screen title="Temporizador" color="hogar" onBack={() => !timerActive && setSub(null)}>
      {!timerActive ? (
        <>
          <p className="text-sm text-slate-400 leading-relaxed">Si no lo desactivás a tiempo, se dispara la alerta.</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[15, 30, 45, 60, 90, 120].map(m => (
              <button key={m} onClick={() => startTimer(m)} className="py-5 rounded-2xl bg-hogar/10 border-2 border-hogar/25 text-lg font-bold text-slate-100 active:scale-95 transition-transform">
                {m < 60 ? `${m} min` : `${m / 60} hora${m > 60 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center pt-6">
          <div className={`w-[200px] h-[200px] rounded-full mx-auto flex flex-col items-center justify-center border-4 ${timerMin < 2 ? 'border-danger animate-breathe shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-hogar shadow-[0_0_40px_rgba(52,211,153,0.2)]'}`}
            style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.12), transparent)' }}>
            <span className={`text-5xl font-extrabold font-mono tracking-wider ${timerMin < 2 ? 'text-danger' : 'text-slate-100'}`}>
              {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
            </span>
            <span className={`text-sm font-semibold mt-1 ${timerMin < 2 ? 'text-danger' : 'text-slate-400'}`}>
              {timerMin < 2 ? '⚠ Tiempo por vencer' : 'Timer activo'}
            </span>
          </div>
          <button onClick={cancelTimer} className="w-full py-5 mt-8 rounded-2xl bg-gradient-to-r from-success to-success/80 text-white text-lg font-extrabold shadow-lg shadow-success/20 active:scale-[0.98] transition-transform">
            ✓ ESTOY BIEN — DESACTIVAR
          </button>
          <button onClick={() => { cancelTimer(); createAlert.mutate('PANIC'); }} className="w-full py-4 mt-3 rounded-2xl bg-gradient-to-r from-danger to-danger/80 text-white font-bold shadow-lg shadow-danger/20">
            Necesito ayuda ahora
          </button>
        </div>
      )}
    </Screen>
  );

  return (
    <Screen title="Hogar Seguro" color="hogar" onBack={() => navigate('/')}>
      <p className="text-[15px] text-slate-400 leading-relaxed">Protección para tu casa. Detección, grabación, alerta.</p>

      <PanicButton label="¡INTRUSO!" onActivate={() => createAlert.mutate('INTRUDER')} />

      <BigButton icon={<span className="text-xl">🏠</span>} label="Modo hogar" sub="Monitoreo de sonido ambiental" color="hogar"
        onClick={() => setModoOn(!modoOn)} />

      <BigButton icon={<span className="text-xl">⏱️</span>} label="Temporizador" sub="Timer que alerta si no desactivás" color="hogar"
        onClick={() => setSub('timer')} />

      <BigButton icon={<span className="text-xl">🚨</span>} label="Intruso" sub="Aviso rápido si hay alguien sospechoso" color="danger"
        onClick={() => createAlert.mutate('INTRUDER')} />

      <BigButton icon={<span className="text-xl">📞</span>} label="Llamar a un vecino" sub="Contacto rápido de confianza" color="hogar"
        onClick={() => navigate('/contacts')} />

      <BigButton icon={<span className="text-xl">📹</span>} label="Grabar video/audio" sub="Evidencia automática a la nube" color="hogar" onClick={() => {}} />

      <BigButton icon={<span className="text-xl">📞</span>} label="Llamar al 911" sub="Con dirección adjunta" color="danger" onClick={() => {}} />
    </Screen>
  );
}
