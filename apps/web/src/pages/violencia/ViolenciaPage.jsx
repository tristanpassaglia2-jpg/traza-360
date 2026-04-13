// apps/web/src/pages/violencia/ViolenciaPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Screen, BigButton, PanicButton, AlertConfirmation } from '../../components/ui';
import { alerts, evidence } from '../../lib/api';
import useLocation from '../../hooks/useLocation';

export default function ViolenciaPage() {
  const navigate = useNavigate();
  const [alertSent, setAlertSent] = useState(false);
  const [recording, setRecording] = useState(null); // 'audio' | 'video' | null
  const [disguise, setDisguise] = useState(false);
  const { getLocation } = useLocation();

  const createAlert = useMutation({
    mutationFn: async (type) => {
      let loc = null;
      try { loc = await getLocation(); } catch {}
      return alerts.create({
        type,
        module: 'VIOLENCIA',
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });
    },
    onSuccess: () => setAlertSent(true),
  });

  const saveEvidence = useMutation({
    mutationFn: (data) => evidence.create(data),
  });

  // Disguise screen
  if (disguise) {
    return (
      <div onClick={() => setDisguise(false)} className="fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col items-center justify-center font-mono cursor-pointer">
        <div className="text-5xl mb-4">🧮</div>
        <div className="text-3xl text-slate-200 font-light tracking-[4px]">{(Math.random() * 1000).toFixed(2)}</div>
        <div className="text-sm text-slate-600 mt-10">Toque para volver</div>
      </div>
    );
  }

  if (alertSent) {
    return <AlertConfirmation color="violencia" message="Tus contactos fueron notificados con tu ubicación." onClose={() => setAlertSent(false)} />;
  }

  return (
    <Screen title="Violencia de Género" color="violencia" onBack={() => navigate('/')}>
      <p className="text-[15px] text-slate-400 leading-relaxed">
        Herramientas discretas para tu protección. Todo se registra de forma segura.
      </p>

      <PanicButton onActivate={() => createAlert.mutate('PANIC')} />

      {/* Recording buttons side by side */}
      <div className="flex gap-3">
        {[
          { type: 'audio', icon: '🎙️', label: 'Grabar Sonido' },
          { type: 'video', icon: '📹', label: 'Grabar Video' },
        ].map(r => (
          <button key={r.type}
            onClick={() => {
              // In production: use MediaRecorder API, upload to storage, save metadata via API
              saveEvidence.mutate({ type: r.type.toUpperCase(), title: `${r.label} — ${new Date().toLocaleString('es-AR')}` });
            }}
            className="flex-1 py-5 px-3 rounded-[20px] bg-violencia/10 border-2 border-violencia/25 flex flex-col items-center gap-2">
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-violencia to-violencia/70 flex items-center justify-center shadow-lg shadow-violencia/20">
              <span className="text-2xl">{r.icon}</span>
            </div>
            <span className="text-[15px] font-bold text-slate-100">{r.label}</span>
            <span className="text-[11px] text-slate-400">Directo a la nube</span>
          </button>
        ))}
      </div>

      <BigButton icon={<span className="text-xl">🔔</span>} label="Alerta silenciosa" sub="Avisá a tus contactos sin que nadie lo note" color="violencia"
        onClick={() => createAlert.mutate('SILENT')} />

      <BigButton icon={<span className="text-xl">🔒</span>} label="Evidencia protegida" sub="Archivos seguros con biometría" color="violencia"
        onClick={() => {/* TODO: navigate to evidence vault */}} />

      <BigButton icon={<span className="text-xl">📝</span>} label="Diario de incidentes" sub="Documentá cada situación de forma privada" color="violencia"
        onClick={() => {/* TODO: navigate to diary */}} />

      <BigButton icon={<span className="text-xl">👥</span>} label="Mis contactos" sub="Elegí quién recibe alertas y ubicación" color="violencia"
        onClick={() => navigate('/contacts')} />

      <BigButton icon={<span className="text-xl">📋</span>} label="Actividad reciente" sub="Alertas, audios, videos y ubicaciones" color="violencia"
        onClick={() => navigate('/history')} />

      <BigButton icon={<span className="text-xl">👁️</span>} label="Pantalla de camuflaje" sub="Cambiá la pantalla a una calculadora" color="muted"
        onClick={() => setDisguise(true)} />

      <BigButton icon={<span className="text-xl">📍</span>} label="Compartir ubicación" sub="Enviá tu ubicación a contactos de confianza" color="violencia"
        onClick={async () => {
          try {
            const loc = await getLocation();
            // TODO: start sharing session
          } catch {}
        }} />

      {/* 911 */}
      <div className="bg-danger/10 border border-danger/15 rounded-2xl py-4 flex items-center justify-center gap-2 mt-1">
        <span className="text-sm text-slate-400 flex items-center gap-2">📞 <strong className="text-danger">911</strong> — Emergencias</span>
      </div>
    </Screen>
  );
}
