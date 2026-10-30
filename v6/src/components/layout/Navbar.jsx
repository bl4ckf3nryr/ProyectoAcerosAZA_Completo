import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  Flame, 
  BarChart3, 
  History, 
  Gauge, 
  MessageSquare, 
  Cpu, 
  Moon, 
  Sun, 
  LogOut,
  ShieldCheck
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenSimulador }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const isSupervisor = user.rol === 'Supervisor';
  const isAdmin = user.rol === 'Administrador';

  const navItems = [
    {
      id: 'admin',
      label: 'Panel de Administración',
      icon: ShieldCheck,
      visible: isAdmin,
      badge: 'Admin',
    },
    {
      id: 'dashboard',
      label: 'Dashboard BI',
      icon: BarChart3,
      visible: isSupervisor || isAdmin,
      badge: 'RF06',
    },
    {
      id: 'historico',
      label: 'Histórico',
      icon: History,
      visible: isSupervisor || isAdmin,
      badge: 'CU4',
    },
    {
      id: 'observaciones',
      label: 'Observaciones',
      icon: MessageSquare,
      visible: isSupervisor || isAdmin,
      badge: 'CU6',
    },
    {
      id: 'ultimo',
      label: 'Último Resultado',
      icon: Gauge,
      visible: true,
      badge: 'CU3',
    },
  ];

  const roleColors = {
    Operador: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Supervisor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Administrador: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  }[user.rol] || 'bg-slate-700 text-slate-300';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Flame size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">ACEROS AZA</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Trefilado
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Monitoreo & Trazabilidad de Ángulo</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.filter(item => item.visible).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (typeof window !== 'undefined') {
                      if (item.id === 'admin') {
                        window.history.pushState({}, '', '/admin');
                      } else if (window.location.pathname === '/admin' || window.location.pathname === '/admin/panel') {
                        window.history.pushState({}, '', '/');
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isActive ? 'bg-orange-800/80 text-orange-200' : 'bg-slate-800 text-slate-400'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User profile & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSimulador}
              title="Abrir Simulador de Telemetría Industrial"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 border border-orange-500/30 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Cpu size={14} />
              <span className="hidden md:inline">Simulador</span>
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-white capitalize">{user.nombre_usuario}</p>
                <p className="text-[10px] text-slate-400">{user.rut}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors}`}>
                {user.rol}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
            >
              <LogOut size={17} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
