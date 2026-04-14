// apps/web/src/App.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/authStore';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/home/LandingPage';
import HomePage from './pages/home/HomePage';
import ViolenciaPage from './pages/violencia/ViolenciaPage';
import MayorPage from './pages/mayor/MayorPage';
import NinoPage from './pages/nino/NinoPage';
import HogarPage from './pages/hogar/HogarPage';
import TrabajoPage from './pages/trabajo/TrabajoPage';
import ContactsPage from './pages/contacts/ContactsPage';
import HistoryPage from './pages/history/HistoryPage';
import SettingsPage from './pages/settings/SettingsPage';
import PlansPage from './pages/plans/PlansPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-t-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-violencia border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => { init(); }, [init]);

  return (
    <div className="max-w-[480px] mx-auto">
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/violencia" element={<ProtectedRoute><ViolenciaPage /></ProtectedRoute>} />
        <Route path="/mayor" element={<ProtectedRoute><MayorPage /></ProtectedRoute>} />
        <Route path="/nino" element={<ProtectedRoute><NinoPage /></ProtectedRoute>} />
        <Route path="/hogar" element={<ProtectedRoute><HogarPage /></ProtectedRoute>} />
        <Route path="/trabajo" element={<ProtectedRoute><TrabajoPage /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
