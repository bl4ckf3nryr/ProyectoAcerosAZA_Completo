import React, { useState } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Database,
  Download,
  AlertCircle
} from 'lucide-react';
import { AdminRecetasView } from './AdminRecetasView.jsx';
import { AdminUsuariosView } from './AdminUsuariosView.jsx';
import { AdminExploradorBDView } from './AdminExploradorBDView.jsx';
import { api } from '../../services/api.js';

export function AdminPanelView({ initialTab = 'recetas' }) {
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

  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [csvError, setCsvError] = useState('');

  // Sincronizar parámetro opcional ?tab=... en la URL sin recargar
  const handleSelectTab = (tabId) => {
    setActiveSubTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleDescargarAuditoriaCsv = async () => {
    if (downloadingCsv) return;
    setDownloadingCsv(true);
    setCsvError('');

    try {
      const blob = await api.exportarAuditoriaCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'auditoria_crud.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AUDITORIA] Error al descargar informe CSV:', err);
      setCsvError(err.message || 'No se pudo descargar el informe de auditoría.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const tabs = [
    {
      id: 'recetas',
      label: 'Gestión de Recetas',
      description: 'Límites angulares y versionado por vigencia',
      icon: BookOpen,
      component: AdminRecetasView,
    },
    {
      id: 'usuarios',
      label: 'Gestión de Usuarios',
      description: 'Cuentas, roles únicos, RUT y bloqueo',
      icon: Users,
      component: AdminUsuariosView,
    },
    {
      id: 'database',
      label: 'Explorador de Base de Datos',
      description: 'Tablas, esquema y consola SQL segura',
      icon: Database,
      component: AdminExploradorBDView,
    },
  ];

  const CurrentComponent = tabs.find(t => t.id === activeSubTab)?.component || AdminRecetasView;

  return (
    <div className="space-y-6">
      {/* Encabezado Superior del Panel de Administración */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden transition-colors">
        {/* Glow de acento administrativo en fondo */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/25 shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Panel de Administración del Sistema
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gobierno corporativo de Aceros AZA: gestión de recetas de trefilado, administración de usuarios y auditoría de base de datos.
            </p>
          </div>
        </div>

        {/* Barra de Pestañas Principales del Panel */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 dark:border-slate-800'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleDescargarAuditoriaCsv}
            disabled={downloadingCsv}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white border border-emerald-500 shadow-md shadow-emerald-600/25 shrink-0"
          >
            <Download size={16} />
            <span>{downloadingCsv ? 'Descargando CSV...' : 'Descargar Informe de Auditoría (CSV)'}</span>
          </button>
        </div>

        {csvError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{csvError}</span>
          </div>
        )}
      </div>

      {/* Contenedor dinámico que renderiza la vista de la pestaña activa */}
      <div className="transition-opacity duration-150">
        <CurrentComponent />
      </div>
    </div>
  );
}
