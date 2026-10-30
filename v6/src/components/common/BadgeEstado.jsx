import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function BadgeEstado({ estado, size = 'md', showIcon = true }) {
  const norm = (estado || '').toLowerCase().trim();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2 font-semibold',
  }[size] || 'text-sm px-2.5 py-1 gap-1.5';

  const iconSizes = {
    sm: 13,
    md: 16,
    lg: 20,
  }[size] || 16;

  if (norm === 'aprobado') {
    return (
      <span className={`inline-flex items-center rounded-full font-medium border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 dark:text-emerald-300 shadow-sm ${sizeClasses}`}>
        {showIcon && <CheckCircle2 size={iconSizes} className="text-emerald-400 shrink-0" />}
        <span>Aprobado</span>
      </span>
    );
  }

  if (norm === 'rechazado') {
    return (
      <span className={`inline-flex items-center rounded-full font-medium border border-rose-500/30 bg-rose-500/15 text-rose-400 dark:text-rose-300 shadow-sm ${sizeClasses}`}>
        {showIcon && <XCircle size={iconSizes} className="text-rose-400 shrink-0" />}
        <span>Rechazado</span>
      </span>
    );
  }

  // Representación visual del estado "sin receta" con franja de color distinta (hazard stripe)
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border border-amber-500/50 text-amber-200 shadow-sm relative overflow-hidden ${sizeClasses}`}
      style={{
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.25) 8px, rgba(180, 83, 9, 0.45) 8px, rgba(180, 83, 9, 0.45) 16px)',
      }}
      title="Alerta: Inspección realizada sin receta de calibración vigente asignada"
    >
      {showIcon && <AlertTriangle size={iconSizes} className="text-amber-300 shrink-0" />}
      <span className="font-semibold tracking-wide drop-shadow">Sin Receta</span>
    </span>
  );
}
