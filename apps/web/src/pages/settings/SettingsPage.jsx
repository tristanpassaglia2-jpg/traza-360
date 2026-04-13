// apps/web/src/pages/settings/SettingsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { settings } from '../../lib/api';
import useAuthStore from '../../context/authStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // 'profile' | null
  const [form, setForm] = useState({});

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: settings.getProfile,
    onSuccess: (data) => setForm(data || {}),
  });

  const updateProfile = useMutation({
    mutationFn: settings.updateProfile,
    onSuccess: () => { qc.invalidateQueries(['profile']); setEditing(null); },
  });

  const Section = ({ title, children }) => (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );

  const Row = ({ label, value, onClick }) => (
    <button onClick={onClick} className="w-full bg-t-card border border-t-border rounded-2xl p-4 flex items-center justify-between text-left">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm text-slate-400 font-medium">{value || '—'}</span>
    </button>
  );

  if (editing === 'profile') return (
    <Screen title="Editar perfil" color="violencia" onBack={() => setEditing(null)}>
      <div className="space-y-3">
        {[
          { key: 'displayName', label: 'Nombre', placeholder: 'Tu nombre' },
          { key: 'phone', label: 'Teléfono', placeholder: '+54...' },
          { key: 'homeAddress', label: 'Dirección de casa', placeholder: 'Av. ...' },
          { key: 'medicalNotes', label: 'Datos médicos', placeholder: 'Alergias, condiciones...' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{f.label}</label>
            <input value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-xl bg-t-surface border border-t-border text-slate-100 text-sm outline-none mt-1" />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulo principal</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {['VIOLENCIA', 'MAYOR', 'NINO', 'HOGAR', 'TRABAJO'].map(m => (
              <button key={m} onClick={() => setForm({ ...form, primaryModule: m })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${form.primaryModule === m ? 'bg-violencia text-white' : 'bg-t-surface text-slate-400 border border-t-border'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending}
          className="w-full py-4 rounded-2xl bg-violencia text-white font-bold disabled:opacity-50">
          {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Screen>
  );

  return (
    <Screen title="Configuración" color="slate-100" onBack={() => navigate('/')}>
      <Section title="Perfil">
        <Row label="Nombre" value={profileQuery.data?.displayName} onClick={() => setEditing('profile')} />
        <Row label="Email" value={user?.email} />
        <Row label="Teléfono" value={profileQuery.data?.phone} onClick={() => setEditing('profile')} />
        <Row label="Módulo principal" value={profileQuery.data?.primaryModule} onClick={() => setEditing('profile')} />
        <Row label="Datos médicos" value={profileQuery.data?.medicalNotes ? 'Configurado' : '—'} onClick={() => setEditing('profile')} />
        <Row label="Dirección de casa" value={profileQuery.data?.homeAddress ? 'Configurada' : '—'} onClick={() => setEditing('profile')} />
      </Section>

      <Section title="Seguridad">
        <Row label="Mis contactos" value="" onClick={() => navigate('/contacts')} />
        <Row label="Permisos de ubicación" value="Verificar" onClick={() => {}} />
        <Row label="Notificaciones" value="Configurar" onClick={() => {}} />
        <Row label="Privacidad" value="" onClick={() => {}} />
      </Section>

      <Section title="Plan">
        <button onClick={() => navigate('/plans')} className="w-full bg-violencia/10 border border-violencia/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-violencia">{user?.plan === 'FREE' ? 'Plan Gratis' : user?.plan === 'PREMIUM_PERSONAL' ? 'Premium Personal' : 'Premium Familiar'}</div>
            <div className="text-xs text-slate-400 mt-0.5">Tocá para ver beneficios o mejorar</div>
          </div>
          <span className="text-slate-400">→</span>
        </button>
      </Section>

      <Section title="App">
        <Row label="Ayuda" value="" onClick={() => {}} />
        <Row label="Términos y condiciones" value="" onClick={() => {}} />
        <Row label="Política de privacidad" value="" onClick={() => {}} />
      </Section>

      <button onClick={() => { logout(); navigate('/login'); }}
        className="w-full py-4 mt-6 rounded-2xl border border-danger/30 text-danger font-bold text-sm active:scale-[0.98] transition-transform">
        Cerrar sesión
      </button>

      <p className="text-xs text-slate-600 text-center mt-4 pb-4">Traza 360 v1.0.0 · Hecho en Argentina 🇦🇷</p>
    </Screen>
  );
}
