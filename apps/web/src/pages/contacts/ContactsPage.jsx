// apps/web/src/pages/contacts/ContactsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { contacts } from '../../lib/api';

const RELATIONS = ['FAMILIAR', 'AMIGO', 'CUIDADOR', 'SUPERVISOR', 'VECINO', 'OTRO'];

export default function ContactsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: 'FAMILIAR', email: '', whatsapp: '', receivesAlerts: true, receivesLocation: false, receivesLastSignal: false });

  const { data: list, isLoading } = useQuery({ queryKey: ['contacts'], queryFn: contacts.list });

  const addContact = useMutation({
    mutationFn: contacts.create,
    onSuccess: () => { qc.invalidateQueries(['contacts']); setShowForm(false); setForm({ name: '', phone: '', relation: 'FAMILIAR', email: '', whatsapp: '', receivesAlerts: true, receivesLocation: false, receivesLastSignal: false }); },
  });

  const removeContact = useMutation({
    mutationFn: contacts.remove,
    onSuccess: () => qc.invalidateQueries(['contacts']),
  });

  return (
    <Screen title="Mis contactos" color="violencia" onBack={() => navigate(-1)}
      right={<button onClick={() => setShowForm(!showForm)} className="text-2xl text-violencia">+</button>}>

      <p className="text-sm text-slate-400 leading-relaxed">Elegí quién recibe alertas y ubicación.</p>

      {/* Add form */}
      {showForm && (
        <div className="bg-t-card border border-violencia/20 rounded-2xl p-5 space-y-3">
          <input placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-t-surface border border-t-border text-slate-100 text-sm outline-none" />
          <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-t-surface border border-t-border text-slate-100 text-sm outline-none" />
          <input placeholder="Email (opcional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-t-surface border border-t-border text-slate-100 text-sm outline-none" />
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map(r => (
              <button key={r} onClick={() => setForm({ ...form, relation: r })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${form.relation === r ? 'bg-violencia text-white' : 'bg-t-surface text-slate-400 border border-t-border'}`}>
                {r}
              </button>
            ))}
          </div>
          {/* Permission toggles */}
          <div className="space-y-2 pt-2">
            {[
              { key: 'receivesAlerts', label: 'Recibe alertas' },
              { key: 'receivesLocation', label: 'Ve mi ubicación' },
              { key: 'receivesLastSignal', label: 'Ve mi última señal' },
            ].map(t => (
              <label key={t.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{t.label}</span>
                <button onClick={() => setForm({ ...form, [t.key]: !form[t.key] })}
                  className={`w-12 h-7 rounded-full transition ${form[t.key] ? 'bg-violencia' : 'bg-slate-700'} relative`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${form[t.key] ? 'left-6' : 'left-1'} shadow`} />
                </button>
              </label>
            ))}
          </div>
          <button onClick={() => addContact.mutate(form)} disabled={!form.name || !form.phone || addContact.isPending}
            className="w-full py-3 rounded-xl bg-violencia text-white font-bold text-sm disabled:opacity-50">
            {addContact.isPending ? 'Guardando...' : 'Agregar contacto'}
          </button>
          {addContact.isError && addContact.error?.upgrade && (
            <p className="text-xs text-trabajo text-center">Límite de contactos alcanzado. <button onClick={() => navigate('/plans')} className="underline font-bold">Mejorar plan</button></p>
          )}
        </div>
      )}

      {/* Contact list */}
      {isLoading && <div className="text-center py-8 text-slate-500">Cargando contactos...</div>}
      {list?.map(c => (
        <div key={c.id} className="bg-t-card border border-t-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violencia/10 border border-violencia/20 flex items-center justify-center text-lg font-bold text-violencia shrink-0">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-100">{c.name}</div>
            <div className="text-xs text-slate-400">{c.relation} · {c.phone}</div>
            <div className="flex gap-2 mt-1">
              {c.receivesAlerts && <span className="text-[10px] bg-violencia/10 text-violencia px-2 py-0.5 rounded">Alertas</span>}
              {c.receivesLocation && <span className="text-[10px] bg-mayor/10 text-mayor px-2 py-0.5 rounded">Ubicación</span>}
              {c.receivesLastSignal && <span className="text-[10px] bg-nino/10 text-nino px-2 py-0.5 rounded">Señal</span>}
            </div>
          </div>
          <button onClick={() => { if (confirm('¿Eliminar contacto?')) removeContact.mutate(c.id); }} className="text-slate-500 text-lg p-2">✕</button>
        </div>
      ))}
      {list?.length === 0 && !showForm && <p className="text-center text-slate-500 py-8">Aún no tenés contactos. Tocá + para agregar.</p>}
    </Screen>
  );
}
