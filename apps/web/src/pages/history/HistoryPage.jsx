// apps/web/src/pages/history/HistoryPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { alerts, evidence, tracking } from '../../lib/api';

const typeEmoji = { PANIC: '🚨', INTRUDER: '🚪', SILENT: '🔕', FALL: '⬇️', CHILD_LOST: '🆘', WORK_EMERGENCY: '💼' };
const statusColor = { ACTIVE: 'text-danger', RESOLVED: 'text-success', CANCELLED: 'text-slate-400', ESCALATED: 'text-nino' };
const evidenceEmoji = { AUDIO: '🎙️', VIDEO: '📹', PHOTO: '📷', NOTE: '📝', DOCUMENT: '📄' };

export default function HistoryPage() {
  const navigate = useNavigate();
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: () => alerts.list({ limit: 15 }) });
  const evidenceQuery = useQuery({ queryKey: ['evidence'], queryFn: () => evidence.list({ limit: 10 }) });
  const trackingQuery = useQuery({ queryKey: ['trackingHistory'], queryFn: tracking.history });

  const Tab = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${active ? 'bg-violencia/20 text-violencia' : 'text-slate-500'}`}>{label}</button>
  );

  const [tab, setTab] = useState('alertas');

  return (
    <Screen title="Actividad reciente" color="violencia" onBack={() => navigate(-1)}>
      <div className="flex bg-t-card rounded-2xl p-1 gap-1">
        <Tab label="Alertas" active={tab === 'alertas'} onClick={() => setTab('alertas')} />
        <Tab label="Evidencia" active={tab === 'evidencia'} onClick={() => setTab('evidencia')} />
        <Tab label="Trayectos" active={tab === 'trayectos'} onClick={() => setTab('trayectos')} />
      </div>

      {tab === 'alertas' && (
        <>
          {alertsQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
          {alertsQuery.data?.map(a => (
            <div key={a.id} className="bg-t-card border border-t-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-lg">{typeEmoji[a.type] || '🔔'}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-100">{a.type.replace('_', ' ')}</div>
                <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('es-AR')} · <span className={statusColor[a.status]}>{a.status}</span></div>
              </div>
              {a._count?.evidence > 0 && <span className="text-xs bg-violencia/10 text-violencia px-2 py-1 rounded">{a._count.evidence} arch.</span>}
            </div>
          ))}
        </>
      )}

      {tab === 'evidencia' && (
        <>
          {evidenceQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
          {evidenceQuery.data?.map(e => (
            <div key={e.id} className="bg-t-card border border-t-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violencia/10 flex items-center justify-center text-lg">{evidenceEmoji[e.type] || '📁'}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-100">{e.title || e.type}</div>
                <div className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString('es-AR')}{e.durationSec ? ` · ${e.durationSec}s` : ''}</div>
              </div>
              {e.isEncrypted && <span className="text-xs text-success">🔒</span>}
            </div>
          ))}
        </>
      )}

      {tab === 'trayectos' && (
        <>
          {trackingQuery.isLoading && <div className="text-center py-8 text-slate-500">Cargando...</div>}
          {trackingQuery.data?.map(s => (
            <div key={s.id} className="bg-t-card border border-t-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.status === 'COMPLETED' ? 'bg-success/10' : 'bg-trabajo/10'} flex items-center justify-center`}>
                <span>{s.status === 'COMPLETED' ? '✅' : '🔄'}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-100">{s.destination || s.type}</div>
                <div className="text-xs text-slate-400">{new Date(s.startedAt).toLocaleString('es-AR')}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </Screen>
  );
}
