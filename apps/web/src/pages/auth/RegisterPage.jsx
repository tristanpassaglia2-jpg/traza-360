// apps/web/src/pages/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('PROTECTED');
  const [loading, setLoading] = useState(false);
  const { register, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name, role);
      navigate('/');
    } catch { /* error in store */ }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-t-bg flex flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-extrabold font-display text-slate-100 mb-2">Crear cuenta</h1>
      <p className="text-sm text-slate-400 mb-8">Empezá a protegerte con Traza 360</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && <p className="text-danger text-sm text-center bg-danger/10 p-3 rounded-xl">{error}</p>}

        <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 outline-none focus:border-violencia/40" />

        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 outline-none focus:border-violencia/40" />

        <input type="password" placeholder="Contraseña (min. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
          className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 outline-none focus:border-violencia/40" />

        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">¿Cómo vas a usar Traza?</p>
          <div className="flex gap-3">
            {[
              { val: 'PROTECTED', label: 'Me protejo', sub: 'Soy la persona protegida' },
              { val: 'CAREGIVER', label: 'Cuido a alguien', sub: 'Familiar o cuidador' },
            ].map(r => (
              <button key={r.val} type="button" onClick={() => setRole(r.val)}
                className={`flex-1 p-4 rounded-2xl border text-left transition ${role === r.val ? 'border-violencia/40 bg-violencia/10' : 'border-t-border bg-t-surface'}`}>
                <div className="text-sm font-bold text-slate-100">{r.label}</div>
                <div className="text-xs text-slate-400 mt-1">{r.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violencia to-mayor text-white font-bold shadow-lg shadow-violencia/20 disabled:opacity-50 active:scale-[0.98] transition-transform">
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-slate-500 text-sm mt-8">
        ¿Ya tenés cuenta? <Link to="/login" className="text-violencia font-semibold">Ingresar</Link>
      </p>
    </div>
  );
}
