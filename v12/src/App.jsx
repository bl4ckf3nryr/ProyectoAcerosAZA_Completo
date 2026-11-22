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
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { ForbiddenToast } from './components/common/ForbiddenToast.jsx';
import { Flame } from 'lucide-react';

function isAdminPath(pathname) {
  return pathname === '/admin' || pathname === '/admin/panel' || pathname.startsWith('/admin/');
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (isAdminPath(path)) {
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
        if (isAdminPath(path)) {
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
      const attemptingAdminRoute = isAdminPath(currentPath);

      if (user.rol === 'Operador') {
        if (attemptingAdminRoute) {
          // Mantener en ruta /admin para que ProtectedRoute renderice AccessDeniedView (HTTP 403)
          setActiveTab('admin');
        } else {
          setActiveTab('ultimo');
        }
      } else if (user.rol === 'Supervisor') {
        if (attemptingAdminRoute) {
          // Mantener en ruta /admin para que ProtectedRoute renderice AccessDeniedView (HTTP 403)
          setActiveTab('admin');
        } else {
          setActiveTab('dashboard');
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

  const handleReturnToPanel = () => {
    if (!user) return;
    const target =
      user.rol === 'Administrador'
        ? 'admin'
        : user.rol === 'Supervisor'
          ? 'dashboard'
          : 'ultimo';
    setActiveTab(target);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', user.rol === 'Administrador' ? '/admin' : '/');
    }
  };

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-orange-500 selection:text-white">
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

        {/* Panel de Administración (Protegido por ProtectedRoute - Rol Administrador) */}
        {activeTab === 'admin' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['Administrador']}
            onReturnToPanel={handleReturnToPanel}
          >
            <AdminPanelView />
          </ProtectedRoute>
        )}

        {/* Sub-pestañas directas para retrocompatibilidad (también protegidas) */}
        {activeTab === 'recetas' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['Administrador']}
            onReturnToPanel={handleReturnToPanel}
          >
            <AdminPanelView initialTab="recetas" />
          </ProtectedRoute>
        )}
        {activeTab === 'usuarios' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['Administrador']}
            onReturnToPanel={handleReturnToPanel}
          >
            <AdminPanelView initialTab="usuarios" />
          </ProtectedRoute>
        )}
        {activeTab === 'database' && (
          <ProtectedRoute
            user={user}
            allowedRoles={['Administrador']}
            onReturnToPanel={handleReturnToPanel}
          >
            <AdminPanelView initialTab="database" />
          </ProtectedRoute>
        )}
      </main>

      {/* Alerta visual global para respuestas HTTP 403 */}
      <ForbiddenToast />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-5 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-orange-500" />
            <span className="font-semibold text-slate-300">Aceros AZA S.A.</span>
            <span>— Sistema Web de Monitoreo y Trazabilidad del Trefilado</span>
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
