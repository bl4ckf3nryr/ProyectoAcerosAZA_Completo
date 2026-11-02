import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Database, 
  Sliders, 
  Server, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { AdminRecetasView } from './AdminRecetasView.jsx';
import { AdminUsuariosView } from './AdminUsuariosView.jsx';
import { AdminExploradorBDView } from './AdminExploradorBDView.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function AdminPanelView({ initialTab = 'recetas' }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['recetas', 'usuarios', 'database'].includes(tabParam)) {
        return tabParam;
      }
    }
    return initialTab;
  });

  // Sincronizar parámetro opcional ?tab=... en la URL sin recargar
  const handleSelectTab = (tabId) => {
    setActiveSubTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const tabs = [
    {
      id: 'recetas',
      label: 'Gestión de Recetas',
      description: 'Límites angulares y versionado por vigencia',
      icon: BookOpen,
      badge: 'CU7',
      component: AdminRecetasView,
    },
    {
      id: 'usuarios',
      label: 'Gestión de Usuarios',
      description: 'Cuentas, roles únicos, RUT y bloqueo',
      icon: Users,
      badge: 'CU8 / RBAC',
      component: AdminUsuariosView,
    },
    {
      id: 'database',
      label: 'Explorador de Base de Datos',
      description: 'Tablas, esquema y consola SQL segura',
      icon: Database,
      badge: 'SQLite 3',
      component: AdminExploradorBDView,
    },
  ];

  const CurrentComponent = tabs.find(t => t.id === activeSubTab)?.component || AdminRecetasView;

  return (
    <div className="space-y-6">
      {/* Encabezado Superior del Panel de Administración */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow de acento administrativo en fondo */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/25 shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Panel de Administración del Sistema
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Lock size={12} />
                  Exclusivo Administrador
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Gobierno corporativo de Aceros AZA: gestión de recetas de trefilado, administración de usuarios (RBAC) y auditoría relacional de SQLite.
              </p>
            </div>
          </div>

          {/* Badges de Estado del Sistema */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-left">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Usuario Activo</p>
              <p className="text-xs font-bold text-purple-300 capitalize flex items-center gap-1">
                <span>{user?.nombre_usuario || 'admin'}</span>
                <span className="text-[10px] text-slate-400 font-mono">({user?.rut || '11.111.111-1'})</span>
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-left">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Motor Persistente</p>
              <p className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 size={12} />
                trefilado.db (ACID)
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Pestañas Principales del Panel */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Pestañas de Administración">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-md shadow-orange-600/25'
                      : 'bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isActive
                        ? 'bg-black/30 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenedor dinámico que renderiza la vista de la pestaña activa */}
      <div className="transition-opacity duration-150">
        <CurrentComponent />
      </div>
    </div>
  );
}
