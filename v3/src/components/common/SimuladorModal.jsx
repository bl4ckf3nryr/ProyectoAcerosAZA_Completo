import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Play, Square, Cpu, RefreshCw, X, Check, Copy } from 'lucide-react';
import { BadgeEstado } from './BadgeEstado.jsx';

export function SimuladorModal({ isOpen, onClose, onInspectionCreated }) {
  const [isRunningAuto, setIsRunningAuto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [countGenerated, setCountGenerated] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRunningAuto) {
      interval = setInterval(async () => {
        try {
          const res = await api.dispararSimulador();
          setLastResult(res.inspeccion);
          setCountGenerated(c => c + 1);
          if (onInspectionCreated) onInspectionCreated();
        } catch (err) {
          console.error('[SIMULADOR] Error en disparo automático:', err);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunningAuto, onInspectionCreated]);

  if (!isOpen) return null;

  const handleDispararManual = async () => {
    setLoading(true);
    try {
      const res = await api.dispararSimulador();
      setLastResult(res.inspeccion);
      setCountGenerated(c => c + 1);
      if (onInspectionCreated) onInspectionCreated();
    } catch (err) {
      alert('Error en simulador: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const curlExample = `curl -X POST http://localhost:3000/api/inspecciones \\
  -H "Content-Type: application/json" \\
  -H "x-service-token: AZA-TREFILADO-SERVICE-TOKEN-2026" \\
  -d '{"angulo": 13.45, "id_lote": 50, "id_batch": 198, "id_receta": 1}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Simulador de Trefilado Industrial</h2>
              <p className="text-xs text-slate-400">Emulador de máquina con Token de Servicio (X-Service-Token)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Generación de Inspecciones</p>
                <p className="text-xs text-slate-400">Inspecciones generadas en esta sesión: <span className="font-mono text-orange-400 font-bold">{countGenerated}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDispararManual}
                  disabled={loading || isRunningAuto}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Disparar 1
                </button>
                <button
                  onClick={() => setIsRunningAuto(!isRunningAuto)}
                  className={`px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    isRunningAuto
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-orange-600 hover:bg-orange-500 text-white'
                  }`}
                >
                  {isRunningAuto ? (
                    <>
                      <Square size={14} /> Detener Stream
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Iniciar Stream (3s)
                    </>
                  )}
                </button>
              </div>
            </div>

            {isRunningAuto && (
              <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-950/40 p-2.5 rounded-lg border border-orange-800/40">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span>Simulador transmitiendo telemetría continua de ángulo de trefilado cada 3 segundos...</span>
              </div>
            )}
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-xs font-semibold uppercase text-slate-400">Última Inspección Generada</span>
                <BadgeEstado estado={lastResult.estado} size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">ID Inspección:</span>
                  <p className="font-mono font-bold text-slate-200">#{lastResult.id_inspeccion}</p>
                </div>
                <div>
                  <span className="text-slate-500">Ángulo Registrado:</span>
                  <p className="font-mono text-base font-bold text-orange-400">{lastResult.angulo}°</p>
                </div>
                <div>
                  <span className="text-slate-500">Lote / Batch:</span>
                  <p className="font-mono text-slate-300">{lastResult.lote_correlativo} / {lastResult.batch_correlativo}</p>
                </div>
                <div>
                  <span className="text-slate-500">Receta Aplicada:</span>
                  <p className="text-slate-300 truncate">{lastResult.nombre_receta} {lastResult.limite_minimo ? `(${lastResult.limite_minimo}° - ${lastResult.limite_maximo}°)` : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* API Integration Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Integración API Externa (Python / k6 / SCADA)
              </span>
              <button
                onClick={copyCurl}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado' : 'Copiar cURL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 border border-slate-800 overflow-x-auto select-all">
              {curlExample}
            </pre>
            <p className="text-[11px] text-slate-500">
              * El sistema calcula y almacena el estado automáticamente de forma inmutable (RNF05).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
