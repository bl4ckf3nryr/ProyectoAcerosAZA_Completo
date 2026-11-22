import React, { useState, useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export function ForbiddenToast() {
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    let timeoutId = null;

    const handleForbidden = (event) => {
      const detail = event?.detail || {};
      setAlertData({
        message: detail.message || 'Error 403: Acceso no autorizado',
        detail: detail.detail || 'No cuentas con privilegios suficientes para ejecutar esta operación.',
        timestamp: Date.now(),
      });

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setAlertData(null);
      }, 6000);
    };

    window.addEventListener('aza:forbidden', handleForbidden);
    return () => {
      window.removeEventListener('aza:forbidden', handleForbidden);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!alertData) return null;

  return (
    <div
      role="alert"
      className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 dark:bg-slate-950 border border-rose-500/60 text-white rounded-2xl p-4 shadow-2xl shadow-rose-950/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
        <ShieldAlert size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-rose-400 tracking-wide">
          {alertData.message}
        </p>
        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed break-words">
          {alertData.detail}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAlertData(null)}
        className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
        aria-label="Cerrar alerta"
      >
        <X size={15} />
      </button>
    </div>
  );
}
