import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { MessageSquare, Clock, User, RefreshCw } from 'lucide-react';
import { BadgeEstado } from '../../components/common/BadgeEstado.jsx';

export function SupervisorObservacionesView() {
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadObs = async () => {
    setLoading(true);
    try {
      const res = await api.getObservaciones();
      setObservaciones(res.observaciones || []);
    } catch (err) {
      console.error('Error al listar observaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Bitácora Global de Observaciones Técnicas</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              CU6 (RNF06 - Append Only)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro inmutable de incidencias metalúrgicas, desgastes de troquel y notas de turno en planta AZA
          </p>
        </div>

        <button
          onClick={loadObs}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-orange-400' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            Cargando observaciones técnicas...
          </div>
        ) : observaciones.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            No hay observaciones registradas en la bitácora.
          </div>
        ) : (
          observaciones.map(obs => (
            <div key={obs.id_observacion} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-3 hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-400">Nota #{obs.id_observacion}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-mono">Insp #{obs.id_inspeccion} ({obs.inspeccion_angulo}°)</span>
                  </div>
                  <BadgeEstado estado={obs.inspeccion_estado} size="sm" />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  {obs.texto}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-500" />
                  <span className="font-semibold text-slate-300 capitalize">{obs.nombre_usuario} {obs.apellido}</span>
                  <span className="text-slate-500">({obs.usuario_rol})</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 font-mono">
                  <Clock size={12} />
                  <span>{new Date(obs.fecha_hora).toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
