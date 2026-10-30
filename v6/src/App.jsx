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
import { AdminPanelView } from './views/administrador/AdminPanelView.jsx';
import { SimuladorModal } from './components/common/SimuladorModal.jsx';
import { Flame, ShieldCheck, ShieldAlert } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/panel') {
        return 'admin';
      }
    }
    return 'ultimo';
  });
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
        if (path === '/admin' || path === '/admin/panel') {
          setActiveTab('admin');
        } else if (path === '/' && activeTab === 'admin') {
          setActiveTab(user?.rol === 'Supervisor' ? 'dashboard' : 'ultimo');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (user.rol === 'Operador') {
        setActiveTab('ultimo');
        if (currentPath === '/admin' || currentPath === '/admin/panel') {
          window.history.replaceState({}, '', '/');
        }
      } else if (user.rol === 'Supervisor') {
        setActiveTab('dashboard');
        if (currentPath === '/admin' || currentPath === '/admin/panel') {
          window.history.replaceState({}, '', '/');
        }
      } else if (user.rol === 'Administrador') {
        // Redirigir directamente al Panel de Administración para el rol Administrador
        setActiveTab('admin');
        if (typeof window !== 'undefined' && currentPath !== '/admin') {
          window.history.replaceState({}, '', '/admin');
        }
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

        {/* Panel de Administración (Protegido por Rol Administrador) */}
        {activeTab === 'admin' && (
          user.rol === 'Administrador' ? (
            <AdminPanelView />
          ) : (
            <div className="max-w-2xl mx-auto my-10 bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-lg shadow-rose-500/10">
                <ShieldAlert size={34} />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                HTTP 403 • Acceso Restringido
              </span>
              <h2 className="text-xl font-black text-white mt-4 mb-2">
                Acceso Denegado: Requiere Privilegios de Administrador
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-lg mx-auto">
                Su cuenta actual está autenticada como <strong className="text-white capitalize">{user.nombre_usuario}</strong> con rol <span className="text-rose-400 font-semibold">{user.rol}</span>. 
                El Panel de Administración (Gestión de Recetas, Usuarios y Explorador SQLite) es de acceso exclusivo para el rol <strong className="text-purple-400">Administrador</strong>.
              </p>
              <button
                onClick={() => {
                  const target = user.rol === 'Supervisor' ? 'dashboard' : 'ultimo';
                  setActiveTab(target);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/');
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition cursor-pointer"
              >
                Volver a mi Vista Autorizada ({user.rol === 'Supervisor' ? 'Dashboard BI' : 'Último Resultado'})
              </button>
            </div>
          )
        )}

        {/* Sub-pestañas directas para retrocompatibilidad */}
        {activeTab === 'recetas' && (
          user.rol === 'Administrador' ? <AdminPanelView initialTab="recetas" /> : null
        )}
        {activeTab === 'usuarios' && (
          user.rol === 'Administrador' ? <AdminPanelView initialTab="usuarios" /> : null
        )}
        {activeTab === 'database' && (
          user.rol === 'Administrador' ? <AdminPanelView initialTab="database" /> : null
        )}
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
