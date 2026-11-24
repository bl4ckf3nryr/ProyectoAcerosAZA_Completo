import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.js';
import {
  Clock,
  User,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Filter,
  AlertCircle
} from 'lucide-react';
import { BadgeEstado } from '../../components/common/BadgeEstado.jsx';

const FILTROS_ESTADO = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'rechazada', label: 'Rechazadas' },
];

export function SupervisorObservacionesView() {
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadObs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getObservaciones();
      setObservaciones(res.observaciones || []);
    } catch (err) {
      console.error('Error al listar observaciones:', err);
      setErrorMsg(err.message || 'No fue posible cargar las observaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObs();
  }, []);

  const handleActualizarEstado = async (idObservacion, nuevoEstado) => {
    setUpdatingId(idObservacion);
    setErrorMsg('');
    try {
      const res = await api.actualizarEstadoObservacion(idObservacion, nuevoEstado);
      setObservaciones((prev) =>
        prev.map((obs) =>
          obs.id_observacion === idObservacion
            ? { ...obs, estado: res.observacion?.estado || nuevoEstado }
            : obs
        )
      );
    } catch (err) {
      console.error('Error al actualizar estado de observación:', err);
      setErrorMsg(err.message || 'No se pudo actualizar el estado de la observación.');
    } finally {
      setUpdatingId(null);
    }
  };

  const conteos = useMemo(() => {
    return observaciones.reduce(
      (acc, obs) => {
        const est = (obs.estado || 'pendiente').toLowerCase();
        acc.todas += 1;
        if (est === 'pendiente') acc.pendiente += 1;
        else if (est === 'aprobada') acc.aprobada += 1;
        else if (est === 'rechazada') acc.rechazada += 1;
        return acc;
      },
      { todas: 0, pendiente: 0, aprobada: 0, rechazada: 0 }
    );
  }, [observaciones]);

  const observacionesFiltradas = useMemo(() => {
    if (filtroEstado === 'todas') return observaciones;
    return observaciones.filter(
      (obs) => (obs.estado || 'pendiente').toLowerCase() === filtroEstado
    );
  }, [observaciones, filtroEstado]);

  const renderBadgeEstadoObservacion = (estado) => {
    const est = (estado || 'pendiente').toLowerCase();
    if (est === 'aprobada') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Aprobada</span>
        </span>
      );
    }
    if (est === 'rechazada') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300">
          <XCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Rechazada</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y controles de filtro */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Bitácora Global de Observaciones Técnicas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Revisión y aprobación de incidencias metalúrgicas, desgastes de troquel y notas de turno en planta AZA
            </p>
          </div>

          <button
            onClick={loadObs}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer inline-flex items-center gap-2 text-xs font-semibold"
            title="Actualizar listado"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Filtro por estado de aprobación */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <Filter size={14} />
            <span>Filtrar por estado:</span>
          </div>
          {FILTROS_ESTADO.map((item) => {
            const activo = filtroEstado === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltroEstado(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
                  activo
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    activo
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {conteos[item.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Lista vertical de una sola columna (100% ancho por tarjeta) */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="w-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            Cargando observaciones técnicas...
          </div>
        ) : observacionesFiltradas.length === 0 ? (
          <div className="w-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            {filtroEstado === 'todas'
              ? 'No hay observaciones registradas en la bitácora.'
              : `No existen observaciones en estado "${FILTROS_ESTADO.find((f) => f.id === filtroEstado)?.label}".`}
          </div>
        ) : (
          observacionesFiltradas.map((obs) => {
            const estadoObs = (obs.estado || 'pendiente').toLowerCase();
            const isPendiente = estadoObs === 'pendiente';
            const isUpdating = updatingId === obs.id_observacion;

            return (
              <div
                key={obs.id_observacion}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-md flex flex-col space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                {/* Cabecera de tarjeta */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      Nota #{obs.id_observacion}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
                      Inspección #{obs.id_inspeccion} ({obs.inspeccion_angulo}°)
                    </span>
                    <BadgeEstado estado={obs.inspeccion_estado} size="sm" />
                  </div>

                  {/* Estado actual o botones de aprobación */}
                  <div className="flex items-center gap-2">
                    {isPendiente ? (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleActualizarEstado(obs.id_observacion, 'aprobada')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>{isUpdating ? 'Guardando...' : 'Aprobar'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleActualizarEstado(obs.id_observacion, 'rechazada')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition cursor-pointer"
                        >
                          <XCircle size={14} />
                          <span>{isUpdating ? 'Guardando...' : 'Rechazar'}</span>
                        </button>
                      </>
                    ) : (
                      renderBadgeEstadoObservacion(estadoObs)
                    )}
                  </div>
                </div>

                {/* Cuerpo de texto */}
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 font-normal">
                  {obs.texto}
                </p>

                {/* Pie de tarjeta */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400 dark:text-slate-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {obs.nombre_usuario} {obs.apellido}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">({obs.usuario_rol})</span>
                    {isPendiente && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Pendiente de revisión
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono">
                    <Clock size={12} />
                    <span>{new Date(obs.fecha_hora).toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
