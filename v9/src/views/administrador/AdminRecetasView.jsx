import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { BookOpen, Plus, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function AdminRecetasView() {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [soloVigentes, setSoloVigentes] = useState(false);

  const [nombreReceta, setNombreReceta] = useState('');
  const [limiteMinimo, setLimiteMinimo] = useState('');
  const [limiteMaximo, setLimiteMaximo] = useState('');
  const [recetaAnteriorId, setRecetaAnteriorId] = useState('');
  const [errorForm, setErrorForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadRecetas = async () => {
    setLoading(true);
    try {
      const res = await api.getRecetas(soloVigentes);
      setRecetas(res.recetas || []);
    } catch (err) {
      console.error('Error al cargar recetas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecetas();
  }, [soloVigentes]);

  const handleOpenNueva = (recetaPrevia) => {
    setErrorForm(null);
    if (recetaPrevia) {
      setNombreReceta(recetaPrevia.nombre_receta);
      setLimiteMinimo(String(recetaPrevia.limite_minimo));
      setLimiteMaximo(String(recetaPrevia.limite_maximo));
      setRecetaAnteriorId(String(recetaPrevia.id_receta));
    } else {
      setNombreReceta('');
      setLimiteMinimo('');
      setLimiteMaximo('');
      setRecetaAnteriorId('');
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm(null);

    const min = parseFloat(limiteMinimo);
    const max = parseFloat(limiteMaximo);

    if (isNaN(min) || isNaN(max)) {
      setErrorForm('Los límites deben ser números reales válidos.');
      return;
    }

    if (min >= max) {
      setErrorForm(`El límite mínimo (${min}°) debe ser estrictamente menor que el límite máximo (${max}°).`);
      return;
    }

    setSaving(true);
    try {
      await api.crearReceta({
        nombre_receta: nombreReceta.trim(),
        limite_minimo: min,
        limite_maximo: max,
        id_receta_anterior: recetaAnteriorId ? Number(recetaAnteriorId) : undefined,
      });

      setModalOpen(false);
      loadRecetas();
    } catch (err) {
      setErrorForm(err.message || 'Error al guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarVigencia = async (id, nombre) => {
    if (!confirm(`¿Está seguro de cerrar la vigencia de la receta "${nombre}"? Los registros históricos mantendrán su relación pero no podrá asignarse a nuevas producciones.`)) {
      return;
    }

    try {
      await api.cerrarVigenciaReceta(id);
      loadRecetas();
    } catch (err) {
      alert('Error al cerrar vigencia: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Gestión de Recetas de Trefilado</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
              Admin (CU7)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configuración de tolerancias mínimas/máximas y versionado temporal inmutable por vigencia
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              checked={soloVigentes}
              onChange={(e) => setSoloVigentes(e.target.checked)}
              className="accent-orange-500 rounded"
            />
            <span>Solo recetas vigentes</span>
          </label>

          <button
            onClick={() => handleOpenNueva()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Nueva Receta</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Nombre de la Receta</th>
                <th className="py-3 px-4">Tolerancia [Mín — Máx]</th>
                <th className="py-3 px-4">Vigencia Desde</th>
                <th className="py-3 px-4">Vigencia Hasta</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Muestras Asociadas</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Cargando catálogo de recetas de trefilado...
                  </td>
                </tr>
              ) : recetas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron recetas configuradas.
                  </td>
                </tr>
              ) : (
                recetas.map(r => (
                  <tr key={r.id_receta} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      #{r.id_receta}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {r.nombre_receta}
                    </td>
                    <td className="py-3 px-4 font-mono text-orange-600 dark:text-orange-400 font-bold">
                      [{r.limite_minimo}° — {r.limite_maximo}°]
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {new Date(r.vigente_desde).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {r.vigente_hasta ? new Date(r.vigente_hasta).toLocaleDateString('es-CL') : 'Indefinida (Activa)'}
                    </td>
                    <td className="py-3 px-4">
                      {r.es_vigente === 1 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={13} />
                          <span>Vigente</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center gap-1 w-fit">
                          <Clock size={13} />
                          <span>Histórica / Cerrada</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {r.total_inspecciones} inspección(es)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {r.es_vigente === 1 ? (
                          <>
                            <button
                              onClick={() => handleOpenNueva(r)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                              title="Crear nueva versión cerrando la actual"
                            >
                              Versionar
                            </button>
                            <button
                              onClick={() => handleCerrarVigencia(r.id_receta, r.nombre_receta)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[11px] font-medium cursor-pointer"
                              title="Cerrar vigencia de la receta"
                            >
                              Cerrar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenNueva(r)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 border border-slate-300 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                          >
                            Reactivar en Nueva Versión
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-orange-500 dark:text-orange-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {recetaAnteriorId ? 'Versionar Receta Existente' : 'Registrar Nueva Receta de Trefilado'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorForm && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500 dark:text-rose-400 shrink-0" />
                  <p>{errorForm}</p>
                </div>
              )}

              {recetaAnteriorId && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs">
                  <p className="font-semibold">Control de Versionado por Vigencia (RNF05)</p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-200/80 mt-0.5">
                    Se cerrará la vigencia de la versión #{recetaAnteriorId} preservando intactas todas las inspecciones históricas asociadas a ella.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre de la Receta / Calibre
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Alambrón 5.5mm Grado 1008"
                  value={nombreReceta}
                  onChange={(e) => setNombreReceta(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Límite Mínimo (Grados °)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="12.0"
                    value={limiteMinimo}
                    onChange={(e) => setLimiteMinimo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Límite Máximo (Grados °)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="14.5"
                    value={limiteMaximo}
                    onChange={(e) => setLimiteMaximo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Regla obligatoria de dominio: <strong className="text-orange-600 dark:text-orange-400">Límite Mínimo &lt; Límite Máximo</strong>. Las inspecciones calculan automáticamente el estado "aprobado" dentro de este rango.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Guardando...' : (recetaAnteriorId ? 'Crear Nueva Versión' : 'Crear Receta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
