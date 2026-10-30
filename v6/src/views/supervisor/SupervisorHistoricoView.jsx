import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BadgeEstado } from '../../components/common/BadgeEstado.jsx';
import { 
  Filter, 
  Download, 
  RotateCcw, 
  MessageSquarePlus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Send
} from 'lucide-react';

export function SupervisorHistoricoView() {
  const { user } = useAuth();

  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [limite] = useState(20);

  const [lotes, setLotes] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [turnos, setTurnos] = useState([]);

  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroReceta, setFiltroReceta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [sortBy, setSortBy] = useState('fecha_hora');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [selectedInsp, setSelectedInsp] = useState(null);
  const [modalObsOpen, setModalObsOpen] = useState(false);
  const [observacionesList, setObservacionesList] = useState([]);
  const [nuevaObsTexto, setNuevaObsTexto] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [obsFeedback, setObsFeedback] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await api.getFiltrosMeta();
        setLotes(res.lotes || []);
        setRecetas(res.recetas || []);
        setTurnos(res.turnos || []);
      } catch (err) {
        console.error('[HISTORICO] Error al cargar filtros meta:', err);
      }
    }
    loadMeta();
  }, []);

  const cargarHistorico = async () => {
    setLoading(true);
    try {
      const res = await api.getHistorico({
        page: pagina,
        limit: limite,
        fecha_desde: filtroFechaDesde || undefined,
        fecha_hasta: filtroFechaHasta || undefined,
        id_lote: filtroLote || undefined,
        id_receta: filtroReceta || undefined,
        estado: filtroEstado || undefined,
        id_turno: filtroTurno || undefined,
        sort_by: sortBy,
        order: sortOrder,
      });

      setInspecciones(res.inspecciones || []);
      setTotal(res.total || 0);
      setTotalPaginas(res.total_paginas || 1);
    } catch (err) {
      console.error('[HISTORICO] Error al consultar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorico();
  }, [pagina, filtroFechaDesde, filtroFechaHasta, filtroLote, filtroReceta, filtroEstado, filtroTurno, sortBy, sortOrder]);

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroLote('');
    setFiltroReceta('');
    setFiltroEstado('');
    setFiltroTurno('');
    setPagina(1);
  };

  const handleOpenObservaciones = async (insp) => {
    setSelectedInsp(insp);
    setNuevaObsTexto('');
    setObsFeedback(null);
    setModalObsOpen(true);

    try {
      const res = await api.getInspeccionDetalle(insp.id_inspeccion);
      setObservacionesList(res.observaciones || []);
    } catch (err) {
      console.error('[OBSERVACIONES] Error al cargar observaciones:', err);
    }
  };

  const handleGuardarObservacion = async (e) => {
    e.preventDefault();
    if (!selectedInsp || !nuevaObsTexto.trim()) return;

    setSavingObs(true);
    try {
      const res = await api.crearObservacion({
        id_inspeccion: selectedInsp.id_inspeccion,
        texto: nuevaObsTexto.trim(),
      });

      setObservacionesList([res.observacion, ...observacionesList]);
      setNuevaObsTexto('');
      setObsFeedback('Observación registrada conforme a normativa inmutable.');
      setTimeout(() => setObsFeedback(null), 3000);

      setInspecciones(prev =>
        prev.map(i =>
          i.id_inspeccion === selectedInsp.id_inspeccion
            ? { ...i, total_observaciones: (i.total_observaciones || 0) + 1 }
            : i
        )
      );
    } catch (err) {
      alert('Error al registrar observación: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingObs(false);
    }
  };

  const exportarCSV = () => {
    if (inspecciones.length === 0) return;

    const headers = [
      'ID Inspección',
      'Fecha y Hora (ISO)',
      'Ángulo (°)',
      'Estado',
      'Lote',
      'Batch',
      'Receta',
      'Límite Mínimo',
      'Límite Máximo',
      'Turno',
      'Observaciones',
    ];

    const rows = inspecciones.map(i => [
      i.id_inspeccion,
      i.fecha_hora,
      i.angulo,
      i.estado,
      i.lote_correlativo,
      i.batch_correlativo,
      `"${i.nombre_receta || 'Sin Receta'}"`,
      i.limite_minimo ?? '',
      i.limite_maximo ?? '',
      i.turno_nombre,
      i.total_observaciones,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trazabilidad_trefilado_aza_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Histórico de Trazabilidad</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Supervisor (CU4 / CU6)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro inmutable de 2.000+ inspecciones con filtros combinables y bitácora técnica
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            disabled={inspecciones.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Panel de Filtros Combinables */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Filter size={15} className="text-orange-400" />
            <span>Filtros Combinables del Histórico</span>
          </div>
          <button
            onClick={limpiarFiltros}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Limpiar filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => { setFiltroFechaDesde(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => { setFiltroFechaHasta(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lote</label>
            <select
              value={filtroLote}
              onChange={(e) => { setFiltroLote(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los lotes ({lotes.length})</option>
              {lotes.map(l => (
                <option key={l.id_lote} value={l.id_lote}>{l.correlativo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Receta</label>
            <select
              value={filtroReceta}
              onChange={(e) => { setFiltroReceta(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todas las recetas</option>
              <option value="null">Sin Receta asignada</option>
              {recetas.map(r => (
                <option key={r.id_receta} value={r.id_receta}>
                  {r.nombre_receta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los estados</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
              <option value="sin receta">Sin Receta</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Turno</label>
            <select
              value={filtroTurno}
              onChange={(e) => { setFiltroTurno(e.target.value); setPagina(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los turnos</option>
              {turnos.map(t => (
                <option key={t.id_turno} value={t.id_turno}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-850">
          <span>Total registros filtrados: <strong className="text-white font-mono">{total}</strong></span>
          <span className="font-mono text-slate-400">Página {pagina} de {totalPaginas}</span>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('id_inspeccion'); setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC'); }}>
                  ID
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('fecha_hora'); setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC'); }}>
                  Fecha y Hora
                </th>
                <th className="py-3 px-4">Lote / Turno</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Receta de Trefilado</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('angulo'); setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC'); }}>
                  Ángulo Medido
                </th>
                <th className="py-3 px-4">Tolerancia</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('estado'); setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC'); }}>
                  Estado
                </th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando datos de SQLite (trefilado.db)...</span>
                    </div>
                  </td>
                </tr>
              ) : inspecciones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron inspecciones que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                inspecciones.map((row) => (
                  <tr key={row.id_inspeccion} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                      #{row.id_inspeccion}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(row.fecha_hora).toLocaleString('es-CL')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{row.lote_correlativo}</div>
                      <div className="text-[10px] text-slate-400">Turno {row.turno_nombre}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {row.batch_correlativo}
                    </td>
                    <td className="py-3 px-4">
                      {row.nombre_receta ? (
                        <div className="font-medium text-slate-200">{row.nombre_receta}</div>
                      ) : (
                        <span className="text-amber-400 font-mono italic">Sin Receta</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-orange-400">
                      {row.angulo}°
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {row.limite_minimo ? `[${row.limite_minimo}° — ${row.limite_maximo}°]` : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <BadgeEstado estado={row.estado} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenObservaciones(row)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                          row.total_observaciones > 0
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-750'
                        }`}
                        title="Ver o registrar observaciones"
                      >
                        <MessageSquarePlus size={13} />
                        <span>{row.total_observaciones > 0 ? `${row.total_observaciones}` : 'Nota'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            Mostrando <span className="text-white font-mono">{inspecciones.length}</span> de <span className="text-white font-mono">{total}</span> registros
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 font-mono text-slate-300 font-bold">
              {pagina} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Observaciones (CU6 / RNF06 - Append Only) */}
      {modalObsOpen && selectedInsp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Bitácora de Inspección #{selectedInsp.id_inspeccion}</span>
                  <BadgeEstado estado={selectedInsp.estado} size="sm" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Lote: {selectedInsp.lote_correlativo} | Ángulo: {selectedInsp.angulo}° | Batch: {selectedInsp.batch_correlativo}
                </p>
              </div>
              <button
                onClick={() => setModalObsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {obsFeedback && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  <span>{obsFeedback}</span>
                </div>
              )}

              <form onSubmit={handleGuardarObservacion} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Registrar Nueva Observación Técnica
                </label>
                <textarea
                  rows={3}
                  required
                  value={nuevaObsTexto}
                  onChange={(e) => setNuevaObsTexto(e.target.value)}
                  placeholder="Describa el motivo de la desviación, ajuste térmico, cambio de hilera, etc..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500 resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    * Registrado por: <strong className="text-slate-300">{user?.nombre_usuario} ({user?.rol})</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={savingObs || !nuevaObsTexto.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>{savingObs ? 'Guardando...' : 'Guardar Observación'}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Historial de Notas ({observacionesList.length})
                </h4>

                {observacionesList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No hay observaciones previas registradas para esta inspección.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {observacionesList.map(obs => (
                      <div key={obs.id_observacion} className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-orange-400 capitalize">
                            {obs.nombre_usuario || user?.nombre_usuario} ({obs.usuario_rol || user?.rol})
                          </span>
                          <span className="font-mono text-slate-500">
                            {new Date(obs.fecha_hora).toLocaleString('es-CL')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {obs.texto}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
              <button
                onClick={() => setModalObsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
