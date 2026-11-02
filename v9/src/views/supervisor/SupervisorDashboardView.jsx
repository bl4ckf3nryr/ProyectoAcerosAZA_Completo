import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Brush 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  Bookmark, 
  Download, 
  Layers, 
  RefreshCw,
  Filter,
  Maximize2
} from 'lucide-react';

export function SupervisorDashboardView() {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [recetaId, setRecetaId] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [loteId, setLoteId] = useState('');

  const [metaFiltros, setMetaFiltros] = useState({
    lotes: [],
    recetas: [],
    turnos: []
  });

  const [kpis, setKpis] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [byRecipeData, setByRecipeData] = useState([]);
  const [byShiftData, setByShiftData] = useState([]);
  const [histogramData, setHistogramData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [savedViews, setSavedViews] = useState([
    { name: 'Vista General Planta', filters: { fechaDesde: '', fechaHasta: '', recetaId: '', estadoFilter: '', turnoId: '', loteId: '' } },
    { name: 'Rechazos Críticos', filters: { fechaDesde: '', fechaHasta: '', recetaId: '', estadoFilter: 'rechazado', turnoId: '', loteId: '' } },
    { name: 'Turno Noche (Auditoría)', filters: { fechaDesde: '', fechaHasta: '', recetaId: '', estadoFilter: '', turnoId: '3', loteId: '' } },
    { name: 'Sin Receta Asignada', filters: { fechaDesde: '', fechaHasta: '', recetaId: 'null', estadoFilter: '', turnoId: '', loteId: '' } },
  ]);
  const [activeBookmark, setActiveBookmark] = useState('Vista General Planta');
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [showSaveBookmark, setShowSaveBookmark] = useState(false);

  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    nivel: 'month',
    data: []
  });

  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await api.getFiltrosMeta();
        setMetaFiltros({
          lotes: meta.lotes || [],
          recetas: meta.recetas || [],
          turnos: meta.turnos || []
        });
      } catch (err) {
        console.error('Error al cargar filtros meta:', err);
      }
    }
    loadMeta();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const params = {
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      id_receta: recetaId || undefined,
      estado: estadoFilter || undefined,
      id_turno: turnoId || undefined,
      id_lote: loteId || undefined
    };

    try {
      const [sumRes, trRes, recRes, shRes, histRes] = await Promise.all([
        api.getDashboardSummary(params),
        api.getDashboardTrend(params),
        api.getDashboardByRecipe(params),
        api.getDashboardByShift(params),
        api.getDashboardHistogram(params)
      ]);

      setKpis(sumRes.kpis);
      setTrendData(trRes.trend || []);
      setByRecipeData(recRes.by_recipe || []);
      setByShiftData(shRes.by_shift || []);
      setHistogramData(histRes.histogram || []);
    } catch (err) {
      console.error('[DASHBOARD] Error al cargar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [fechaDesde, fechaHasta, recetaId, estadoFilter, turnoId, loteId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fechaDesde, fechaHasta, recetaId, estadoFilter, turnoId, loteId]);

  const handleRecipeClick = (entry) => {
    if (!entry) return;
    const targetId = entry.id_receta === 0 ? 'null' : String(entry.id_receta);
    setRecetaId(prev => (prev === targetId ? '' : targetId));
  };

  const handleShiftClick = (entry) => {
    if (!entry) return;
    const targetShift = String(entry.id_turno);
    setTurnoId(prev => (prev === targetShift ? '' : targetShift));
  };

  const handleStatusFilterToggle = (status) => {
    setEstadoFilter(prev => (prev === status ? '' : status));
  };

  const handleApplyBookmark = (bm) => {
    setActiveBookmark(bm.name);
    setFechaDesde(bm.filters.fechaDesde || '');
    setFechaHasta(bm.filters.fechaHasta || '');
    setRecetaId(bm.filters.recetaId || '');
    setEstadoFilter(bm.filters.estadoFilter || '');
    setTurnoId(bm.filters.turnoId || '');
    setLoteId(bm.filters.loteId || '');
  };

  const handleSaveCurrentAsBookmark = () => {
    if (!newBookmarkName.trim()) return;
    const newBm = {
      name: newBookmarkName.trim(),
      filters: { fechaDesde, fechaHasta, recetaId, estadoFilter, turnoId, loteId }
    };
    setSavedViews([...savedViews, newBm]);
    setActiveBookmark(newBm.name);
    setNewBookmarkName('');
    setShowSaveBookmark(false);
  };

  const handleOpenDrilldown = async (nivel = 'month', mes) => {
    try {
      const res = await api.getDashboardDrilldown({ nivel, mes });
      setDrilldownModal({
        isOpen: true,
        nivel,
        mes,
        data: res.data || []
      });
    } catch (err) {
      console.error('Error en drilldown:', err);
    }
  };

  const resetAllSlicers = () => {
    setFechaDesde('');
    setFechaHasta('');
    setRecetaId('');
    setEstadoFilter('');
    setTurnoId('');
    setLoteId('');
    setActiveBookmark('');
  };

  const handleExportCsv = () => {
    if (!trendData.length) return;
    const headers = ['Fecha', 'Total Inspecciones', 'Ángulo Promedio', 'Ángulo Mínimo', 'Ángulo Máximo', 'Aprobadas', 'Rechazadas', 'Sin Receta'];
    const rows = trendData.map(d => [
      d.fecha, d.total, d.angulo_promedio, d.angulo_min, d.angulo_max, d.aprobadas, d.rechazadas, d.sin_receta
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `dashboard_kpis_aza_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Power BI Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Analítico de Trefilado</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-mono">
              Power BI Engine (RF06)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-filtering multidimensional, bandas de tolerancia, drill-down y KPIs en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              autoRefresh 
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 dark:hover:text-white'
            }`}
            title="Auto-refrescar cada 10 segundos"
          >
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} />
            <span>{autoRefresh ? 'Live (10s)' : 'En Vivo'}</span>
          </button>

          <button
            onClick={() => handleOpenDrilldown('month')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Maximize2 size={13} className="text-orange-600 dark:text-orange-400" />
            <span>Drill-Down Meses</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={resetAllSlicers}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Limpiar todos los filtros cruzados"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
            <Bookmark size={13} className="text-orange-500 dark:text-orange-400" />
            <span>Vistas Guardadas (Bookmarks):</span>
          </span>
          {savedViews.map(bm => (
            <button
              key={bm.name}
              onClick={() => handleApplyBookmark(bm)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                activeBookmark === bm.name
                  ? 'bg-orange-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {bm.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showSaveBookmark ? (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <input
                type="text"
                placeholder="Nombre de vista..."
                value={newBookmarkName}
                onChange={(e) => setNewBookmarkName(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-white px-2 py-0.5 focus:outline-hidden w-36"
              />
              <button
                onClick={handleSaveCurrentAsBookmark}
                className="px-2 py-0.5 bg-orange-600 text-white text-[11px] rounded font-semibold cursor-pointer"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowSaveBookmark(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white px-1 text-[11px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveBookmark(true)}
              className="text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 text-xs flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <span>+ Guardar Vista Actual</span>
            </button>
          )}
        </div>
      </div>

      {/* Slicers Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md space-y-3 transition-colors">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-orange-500 dark:text-orange-400" />
            <span>Slicers Interactivos (Filtros Globales)</span>
          </div>
          {(fechaDesde || fechaHasta || recetaId || estadoFilter || turnoId || loteId) && (
            <span className="text-orange-600 dark:text-orange-400 normal-case font-semibold text-[11px] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800/40">
              * Filtros activos afectando todos los gráficos
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Turno</label>
            <select
              value={turnoId}
              onChange={(e) => setTurnoId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los turnos</option>
              {metaFiltros.turnos.map(t => (
                <option key={t.id_turno} value={t.id_turno}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Receta</label>
            <select
              value={recetaId}
              onChange={(e) => setRecetaId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todas las recetas</option>
              <option value="null">Sin Receta</option>
              {metaFiltros.recetas.map(r => (
                <option key={r.id_receta} value={r.id_receta}>{r.nombre_receta}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los estados</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
              <option value="sin receta">Sin Receta</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Lote</label>
            <select
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos los lotes</option>
              {metaFiltros.lotes.map(l => (
                <option key={l.id_lote} value={l.id_lote}>{l.correlativo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-hidden focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards (RF06) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => handleStatusFilterToggle('aprobado')}
          className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-md relative overflow-hidden transition cursor-pointer group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tasa de Aprobación</span>
            <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-slate-900 dark:text-white">
              {kpis?.tasa_aprobacion ?? 0}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              ({kpis?.total_aprobadas ?? 0} muestras)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${kpis?.tasa_aprobacion ?? 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Clic para filtrar sólo inspecciones aprobadas</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Muestras</span>
            <Layers size={16} className="text-orange-500 dark:text-orange-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {kpis?.total_inspecciones ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Base histórica cargada</p>
        </div>

        <div 
          onClick={() => handleStatusFilterToggle('rechazado')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 shadow-md flex flex-col justify-between transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rechazos</span>
            <XCircle size={16} className="text-rose-500 dark:text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {kpis?.total_rechazadas ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Tasa: {kpis?.tasa_rechazo ?? 0}% (clic para aislar)</p>
        </div>

        <div 
          onClick={() => handleStatusFilterToggle('sin receta')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 shadow-md flex flex-col justify-between transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sin Receta</span>
            <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
              {kpis?.total_sin_receta ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Muestras sin calibración</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ángulo Promedio</span>
            <TrendingUp size={16} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {kpis?.angulo_promedio ?? 0}°
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            Min {kpis?.angulo_minimo ?? 0}° / Max {kpis?.angulo_maximo ?? 0}°
          </p>
        </div>
      </div>

      {/* Gráfico 1: Tendencia Temporal con Zoom Brush */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-500 dark:text-orange-400" />
              <span>Tendencia Temporal del Ángulo de Trefilado</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Línea continua con promedio diario, bandas de dispersión mínima/máxima y selector de zoom interactivo
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-block w-3 h-0.5 bg-orange-500"></span> Promedio
            <span className="inline-block w-3 h-0.5 bg-emerald-500"></span> Mín
            <span className="inline-block w-3 h-0.5 bg-rose-500"></span> Máx
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={11} tickFormatter={(str) => str.slice(5)} />
              <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} unit="°" />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', color: '#0f172a' }}
                formatter={(value, name) => [`${value}°`, name]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Line type="monotone" dataKey="angulo_promedio" name="Ángulo Promedio" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="angulo_min" name="Ángulo Mínimo" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="angulo_max" name="Ángulo Máximo" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Brush dataKey="fecha" height={25} stroke="#f97316" fill="#f8fafc" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de Gráficos 2 & 3: Producción por Receta & Turno */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Producción por Receta */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-orange-500 dark:text-orange-400" />
                <span>Producción por Receta (Barras Apiladas)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clic en cualquier barra para aplicar filtro cruzado instantáneo
              </p>
            </div>
            {recetaId && (
              <button 
                onClick={() => setRecetaId('')}
                className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium cursor-pointer"
              >
                Quitar filtro receta
              </button>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRecipeData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
                <XAxis 
                  dataKey="receta" 
                  stroke="#64748b" 
                  fontSize={10} 
                  angle={-15} 
                  textAnchor="end"
                  tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '...' : val} 
                />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar 
                  dataKey="aprobadas" 
                  name="Aprobadas" 
                  fill="#10b981" 
                  stackId="a" 
                  onClick={handleRecipeClick} 
                  cursor="pointer" 
                />
                <Bar 
                  dataKey="rechazadas" 
                  name="Rechazadas" 
                  fill="#f43f5e" 
                  stackId="a" 
                  onClick={handleRecipeClick} 
                  cursor="pointer" 
                />
                <Bar 
                  dataKey="sin_receta" 
                  name="Sin Receta" 
                  fill="#f59e0b" 
                  stackId="a" 
                  onClick={handleRecipeClick} 
                  cursor="pointer" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Desempeño por Turno */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-orange-500 dark:text-orange-400" />
                <span>Desempeño por Turno de Operación</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clic en un turno para cross-filtering (Mañana, Tarde, Noche)
              </p>
            </div>
            {turnoId && (
              <button 
                onClick={() => setTurnoId('')}
                className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium cursor-pointer"
              >
                Quitar filtro turno
              </button>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byShiftData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
                <XAxis dataKey="turno" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="aprobadas" name="Aprobadas" fill="#10b981" onClick={handleShiftClick} cursor="pointer" />
                <Bar dataKey="rechazadas" name="Rechazadas" fill="#f43f5e" onClick={handleShiftClick} cursor="pointer" />
                <Bar dataKey="sin_receta" name="Sin Receta" fill="#f59e0b" onClick={handleShiftClick} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Histograma Gaussiano */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4 transition-colors">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-orange-500 dark:text-orange-400" />
            <span>Histograma de Frecuencia Angular (Distribución Normal Gaussiana)</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Distribución de muestras por intervalos enteros de grados para verificación estadística de dispersión de trefilado
          </p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
              <XAxis dataKey="rango_angulo" stroke="#64748b" fontSize={11} unit="°" />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', color: '#0f172a' }}
                formatter={(val, name) => [`${val} inspecciones`, name]}
                labelFormatter={(lbl) => `Rango centrado en: ${lbl}°`}
              />
              <Bar dataKey="cantidad" name="Muestras" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drill-down Modal */}
      {drilldownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Maximize2 size={16} className="text-orange-500 dark:text-orange-400" />
                  <span>Drill-Down Jerárquico: {drilldownModal.nivel === 'month' ? 'Desglose por Meses' : `Desglose Días de ${drilldownModal.mes}`}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nivel actual: {drilldownModal.nivel === 'month' ? 'Año / Mes' : 'Semanas / Días'} (clic en un mes para profundizar)
                </p>
              </div>
              <button
                onClick={() => setDrilldownModal({ isOpen: false, nivel: 'month', data: [] })}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {drilldownModal.nivel === 'day' && (
                <button
                  onClick={() => handleOpenDrilldown('month')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  ← Volver al nivel mensual
                </button>
              )}

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Periodo</th>
                    <th className="py-2.5 px-3">Total Muestras</th>
                    <th className="py-2.5 px-3">Aprobadas</th>
                    <th className="py-2.5 px-3">Rechazadas</th>
                    <th className="py-2.5 px-3">Ángulo Promedio</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {drilldownModal.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{row.periodo}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">{row.total}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{row.aprobadas}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400 font-bold">{row.rechazadas}</td>
                      <td className="py-2.5 px-3 font-mono text-orange-600 dark:text-orange-400 font-bold">{row.angulo_promedio}°</td>
                      <td className="py-2.5 px-3 text-center">
                        {drilldownModal.nivel === 'month' ? (
                          <button
                            onClick={() => handleOpenDrilldown('day', row.periodo)}
                            className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Ver Días →
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Nivel Diario</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex justify-end">
              <button
                onClick={() => setDrilldownModal({ isOpen: false, nivel: 'month', data: [] })}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
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
