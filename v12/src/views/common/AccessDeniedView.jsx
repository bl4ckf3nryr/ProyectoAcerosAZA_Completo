import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function AccessDeniedView({ user, onReturnToPanel }) {
  return (
    <div className="max-w-2xl mx-auto my-10 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-500/40 rounded-2xl p-8 shadow-xl text-center transition-colors">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4 shadow-lg shadow-rose-500/10">
        <ShieldAlert size={34} />
      </div>

      <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        HTTP 403 • Acceso Restringido
      </span>

      <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-4 mb-2 tracking-tight">
        Acceso Denegado (Error 403)
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed max-w-lg mx-auto">
        No tienes los permisos necesarios para acceder a esta sección. Esta acción ha sido registrada.
      </p>

      {user && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 mb-6">
          <span>Sesión actual:</span>
          <strong className="text-slate-900 dark:text-white capitalize">{user.nombre_usuario}</strong>
          <span>•</span>
          <span>Rol:</span>
          <strong className="text-orange-600 dark:text-orange-400">{user.rol}</strong>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={onReturnToPanel}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft size={15} />
          <span>Volver a mi Panel</span>
        </button>
      </div>
    </div>
  );
}

export default AccessDeniedView;
