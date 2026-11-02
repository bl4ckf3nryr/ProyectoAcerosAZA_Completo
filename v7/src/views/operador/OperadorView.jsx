import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { BadgeEstado } from '../../components/common/BadgeEstado.jsx';
import { 
  RefreshCw, 
  Activity, 
  Clock, 
  Layers, 
  AlertCircle, 
  Sparkles, 
  Cpu,
  Inbox
} from 'lucide-react';

export function OperadorView({ onOpenSimulador }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(3);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsUntilNext, setSecondsUntilNext] = useState(3);
  const timerRef = useRef(null);

  const fetchUltimo = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getUltimoResultado();
      setData(res);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[OPERADOR] Error al consultar último resultado:', err);
      setError(err.message || 'Error al conectar con la estación de trefilado');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUltimo();
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setSecondsUntilNext(refreshIntervalSec);
    const interval = setInterval(() => {
      setSecondsUntilNext(prev => {
        if (prev <= 1) {
          fetchUltimo(true);
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalSec]);

  const inspeccion = data?.inspeccion;

  let gaugePercent = 50;
  if (inspeccion && inspeccion.limite_minimo && inspeccion.limite_maximo) {
    const min = inspeccion.limite_minimo;
    const max = inspeccion.limite_maximo;
    const padding = (max - min) * 0.4;
    const totalSpan = (max + padding) - (min - padding);
    gaugePercent = Math.min(100, Math.max(0, ((inspeccion.angulo - (min - padding)) / totalSpan) * 100));
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Estación de Trefilado — Control en Línea</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Vista Operador (CU3)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo continuo de ángulo de hilera con telemetría en tiempo real
          </p>
        </div>

        {/* Polling & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <label className="text-slate-300 font-medium cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span>Auto-refresh</span>
            </label>

            {autoRefresh && (
              <select
                value={refreshIntervalSec}
                onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
                className="bg-slate-900 text-orange-400 font-mono text-xs rounded border border-slate-850 px-1 py-0.5 focus:outline-hidden"
              >
                <option value={2}>2s</option>
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
              </select>
            )}

            {autoRefresh && (
              <span className="text-[10px] text-slate-500 font-mono">
                ({secondsUntilNext}s)
              </span>
            )}
          </div>

          <button
            onClick={() => fetchUltimo(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Actualizar manualmente"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-400' : ''} />
          </button>

          <button
            onClick={onOpenSimulador}
            className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition cursor-pointer"
          >
            <Cpu size={14} />
            <span>Disparar Telemetría</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0 text-rose-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Estado vacío informativo (CU3) */}
      {!loading && data && !data.existe && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Inbox size={32} />
          </div>
          <h2 className="text-lg font-bold text-white">Sin inspecciones registradas</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Aún no se han recibido mediciones de ángulo desde los sensores de trefilado de Aceros AZA.
          </p>
          <div className="mt-6">
            <button
              onClick={onOpenSimulador}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-lg shadow-orange-600/30 transition cursor-pointer"
            >
              <Cpu size={16} />
              <span>Generar Primera Inspección de Prueba</span>
            </button>
          </div>
        </div>
      )}

      {/* Panel principal de resultado de inspección */}
      {inspeccion && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
            {inspeccion.estado === 'sin receta' && (
              <div 
                className="absolute top-0 left-0 right-0 h-2.5 z-10" 
                style={{
                  backgroundImage: 'repeating-linear-gradient(-45deg, #f59e0b, #f59e0b 12px, #0f172a 12px, #0f172a 24px)'
                }}
                title="Advertencia Industrial: Muestra sin receta"
              />
            )}
            {inspeccion.estado === 'aprobado' && (
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            )}
            {inspeccion.estado === 'rechazado' && (
              <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            )}
            {inspeccion.estado === 'sin receta' && (
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Activity size={16} className="text-orange-400" />
                  <span>Última Medición Registrada (ID #{inspeccion.id_inspeccion})</span>
                </div>
                <BadgeEstado estado={inspeccion.estado} size="lg" />
              </div>

              <div className="my-6">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Ángulo de Trefilado Medido
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {inspeccion.angulo.toFixed(2)}
                  </span>
                  <span className="text-3xl font-bold text-orange-400">grados (°)</span>
                </div>
              </div>

              {inspeccion.id_receta ? (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3 mt-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Tolerancia de Calibración: <span className="text-white">{inspeccion.nombre_receta}</span>
                    </span>
                    <span className="font-mono text-slate-400">
                      Rango: [{inspeccion.limite_minimo}° — {inspeccion.limite_maximo}°]
                    </span>
                  </div>

                  <div className="relative pt-2 pb-1">
                    <div className="h-4 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-500/50"
                        style={{ left: '25%', right: '25%' }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 -translate-x-1"
                        style={{ left: `${gaugePercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono mt-2 text-slate-400">
                      <span>Mínimo: <strong className="text-slate-200">{inspeccion.limite_minimo}°</strong></span>
                      <span className="text-orange-400 font-bold">Actual: {inspeccion.angulo}°</span>
                      <span>Máximo: <strong className="text-slate-200">{inspeccion.limite_maximo}°</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-amber-500/60 bg-amber-950/40 text-amber-200 text-xs flex items-center gap-3 relative overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-3"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 8px, #78350f 8px, #78350f 16px)'
                    }}
                  />
                  <AlertCircle size={22} className="shrink-0 text-amber-400 ml-1.5" />
                  <div>
                    <p className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                      <span>Inspección sin Receta Asociada</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        FRANJA DIAGONAL ACTIVA
                      </span>
                    </p>
                    <p className="text-amber-200/90 mt-0.5">
                      Esta muestra no posee límites de tolerancia asignados en la hilera de trefilado. Se recomienda notificar de inmediato al Supervisor de Planta.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-6">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-500" />
                <span>Fecha registro sensor:</span>
                <span className="font-mono text-slate-200">{new Date(inspeccion.fecha_hora).toLocaleString('es-CL')}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Último refresco: {lastUpdated.toLocaleTimeString('es-CL')}
              </span>
            </div>
          </div>

          {/* Trazabilidad */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
                <Layers size={16} className="text-orange-400" />
                <span>Trazabilidad Operativa</span>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lote de Producción</span>
                  <p className="font-mono text-base font-bold text-white mt-0.5">{inspeccion.lote_correlativo}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Batch / Sub-lote</span>
                  <p className="font-mono text-base font-bold text-orange-400 mt-0.5">{inspeccion.batch_correlativo}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Turno de Operación</span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {inspeccion.turno_nombre} <span className="font-mono font-normal text-slate-400 text-xs">({inspeccion.turno_inicio} - {inspeccion.turno_fin})</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Receta Vigente</span>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">
                    {inspeccion.nombre_receta || 'Sin Receta Asignada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Observaciones</span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {inspeccion.total_observaciones} registro(s) asociado(s)
                    </p>
                  </div>
                  {inspeccion.total_observaciones > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      Con Notas
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-950/30 border border-orange-900/40 text-[11px] text-orange-300 flex items-start gap-2">
              <Sparkles size={16} className="shrink-0 text-orange-400 mt-0.5" />
              <p>
                El estado se evalúa en el backend de forma inmutable (RNF05). Nunca se modifica una inspección una vez emitida.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
