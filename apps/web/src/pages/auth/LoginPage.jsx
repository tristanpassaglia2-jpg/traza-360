// apps/web/src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch { /* error is set in store */ }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-t-bg flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violencia to-mayor flex items-center justify-center mb-6 shadow-lg shadow-violencia/20">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent mb-1">TRAZA 360</h1>
      <p className="text-xs text-slate-500 tracking-widest font-semibold mb-10">ÚLTIMA SEÑAL · RESPUESTA REAL</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && <p className="text-danger text-sm text-center bg-danger/10 p-3 rounded-xl">{error}</p>}

        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 text-base outline-none focus:border-violencia/40 transition" />

        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
          className="w-full px-4 py-4 rounded-2xl bg-t-surface border border-t-border text-slate-100 text-base outline-none focus:border-violencia/40 transition" />

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violencia to-mayor text-white font-bold text-base shadow-lg shadow-violencia/20 disabled:opacity-50 active:scale-[0.98] transition-transform">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="text-slate-500 text-sm mt-8">
        ¿No tenés cuenta? <Link to="/register" className="text-violencia font-semibold">Crear cuenta</Link>
      </p>
    </div>
  );
}
