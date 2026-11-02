import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Navbar } from './components/layout/Navbar.jsx';
import { LoginView } from './views/auth/LoginView.jsx';
import { ResetPasswordView } from './views/auth/ResetPasswordView.jsx';
import { OperadorView } from './views/operador/OperadorView.jsx';
import { SupervisorDashboardView } from './views/supervisor/SupervisorDashboardView.jsx';
import { SupervisorHistoricoView } from './views/supervisor/SupervisorHistoricoView.jsx';
import { SupervisorObservacionesView } from './views/supervisor/SupervisorObservacionesView.jsx';
import { AdminRecetasView } from './views/administrador/AdminRecetasView.jsx';
import { AdminUsuariosView } from './views/administrador/AdminUsuariosView.jsx';
import { AdminExploradorBDView } from './views/administrador/AdminExploradorBDView.jsx';
import { SimuladorModal } from './components/common/SimuladorModal.jsx';
import { Flame, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('ultimo');
  const [simuladorOpen, setSimuladorOpen] = useState(false);

  const [route, setRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/reset-password' || params.has('token')) {
        return 'reset-password';
      }
    }
    return 'app';
  });

  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('token') || '';
    }
    return '';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/reset-password' || params.has('token')) {
        setRoute('reset-password');
        setResetToken(params.get('token') || '');
      } else {
        setRoute('app');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.rol === 'Operador') {
        setActiveTab('ultimo');
      } else if (user.rol === 'Supervisor') {
        setActiveTab('dashboard');
      } else if (user.rol === 'Administrador') {
        setActiveTab('dashboard');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Iniciando Sistema de Monitoreo Aceros AZA...
        </p>
      </div>
    );
  }

  // Vista pública de Restablecimiento de Contraseña
  if (route === 'reset-password') {
    return (
      <ResetPasswordView
        token={resetToken}
        onReturnToLogin={() => {
          setRoute('app');
          setResetToken('');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (!user) {
    return (
      <LoginView
        onNavigateToReset={(token) => {
          setResetToken(token);
          setRoute('reset-password');
          window.history.pushState({}, '', `/reset-password?token=${token}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors selection:bg-orange-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulador={() => setSimuladorOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'ultimo' && <OperadorView onOpenSimulador={() => setSimuladorOpen(true)} />}
        {activeTab === 'dashboard' && <SupervisorDashboardView />}
        {activeTab === 'historico' && <SupervisorHistoricoView />}
        {activeTab === 'observaciones' && <SupervisorObservacionesView />}
        {activeTab === 'recetas' && <AdminRecetasView />}
        {activeTab === 'usuarios' && <AdminUsuariosView />}
        {activeTab === 'database' && <AdminExploradorBDView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-5 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-orange-500" />
            <span className="font-semibold text-slate-300">Aceros AZA S.A.</span>
            <span>— Sistema Web de Monitoreo y Trazabilidad del Trefilado</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Equipo: <strong className="text-slate-300">Lancelot Castro & Rodrigo Mancilla</strong> (INACAP)</span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={13} />
              SQLite trefilado.db OK (JavaScript)
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Simulator Modal */}
      <SimuladorModal
        isOpen={simuladorOpen}
        onClose={() => setSimuladorOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
