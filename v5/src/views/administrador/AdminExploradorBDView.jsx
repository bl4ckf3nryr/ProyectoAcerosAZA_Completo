import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { 
  Database, 
  Table, 
  Key, 
  Link2, 
  Code, 
  Play, 
  ShieldCheck, 
  AlertCircle, 
  Layers, 
  HardDrive
} from 'lucide-react';

export function AdminExploradorBDView() {
  const [dbInfo, setDbInfo] = useState(null);
  const [selectedTable, setSelectedTable] = useState('INSPECCION');
  const [activeTab, setActiveTab] = useState('estructura');
  const [loading, setLoading] = useState(true);

  const [tableSchema, setTableSchema] = useState(null);
  const [tablePreview, setTablePreview] = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [sqlQuery, setSqlQuery] = useState(
    'SELECT id_inspeccion, angulo, estado, fecha_hora, id_lote, id_receta \nFROM INSPECCION \nORDER BY id_inspeccion DESC \nLIMIT 20;'
  );
  const [queryResult, setQueryResult] = useState(null);
  const [executingSql, setExecutingSql] = useState(false);
  const [sqlError, setSqlError] = useState(null);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await api.getDbTables();
      setDbInfo(res);
      if (res.tables && res.tables.length > 0 && !selectedTable) {
        setSelectedTable(res.tables[0].name);
      }
    } catch (err) {
      console.error('[DB EXPLORER] Error al listar tablas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    async function loadSchema() {
      try {
        const schema = await api.getDbTableSchema(selectedTable);
        setTableSchema(schema);
      } catch (err) {
        console.error('Error al cargar esquema de tabla:', err);
      }
    }
    loadSchema();
    setPreviewPage(1);
  }, [selectedTable]);

  useEffect(() => {
    if (!selectedTable || activeTab !== 'datos') return;
    async function loadPreview() {
      setLoadingPreview(true);
      try {
        const preview = await api.getDbTablePreview(selectedTable, previewPage, 15);
        setTablePreview(preview);
      } catch (err) {
        console.error('Error al cargar preview:', err);
      } finally {
        setLoadingPreview(false);
      }
    }
    loadPreview();
  }, [selectedTable, activeTab, previewPage]);

  const handleExecuteSql = async () => {
    setExecutingSql(true);
    setSqlError(null);
    try {
      const res = await api.ejecutarDbQuery(sqlQuery);
      setQueryResult(res);
    } catch (err) {
      setSqlError(err.message || 'Error al ejecutar consulta');
      setQueryResult(null);
    } finally {
      setExecutingSql(false);
    }
  };

  const plantillasSql = [
    {
      title: 'Top 15 Últimas Inspecciones',
      sql: 'SELECT id_inspeccion, angulo, estado, fecha_hora, id_lote FROM INSPECCION ORDER BY id_inspeccion DESC LIMIT 15;',
    },
    {
      title: 'Tasa y Promedio por Receta',
      sql: `SELECT 
  r.nombre_receta, 
  COUNT(i.id_inspeccion) AS total, 
  ROUND(AVG(i.angulo), 2) AS angulo_promedio,
  SUM(CASE WHEN i.estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobadas,
  SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazadas
FROM INSPECCION i 
LEFT JOIN RECETA r ON i.id_receta = r.id_receta 
GROUP BY r.id_receta;`,
    },
    {
      title: 'Trazabilidad Turnos & Lotes',
      sql: `SELECT 
  t.nombre AS turno, 
  l.correlativo AS lote, 
  COUNT(i.id_inspeccion) AS muestras,
  ROUND(AVG(i.angulo), 2) AS angulo_prom
FROM LOTE l
JOIN TURNO t ON l.id_turno = t.id_turno
JOIN INSPECCION i ON l.id_lote = i.id_lote
GROUP BY l.id_lote
ORDER BY l.id_lote DESC
LIMIT 12;`,
    },
    {
      title: 'Observaciones con Usuario y Rol',
      sql: `SELECT 
  o.id_observacion, 
  o.texto, 
  u.nombre_usuario, 
  r.nombre AS rol, 
  o.fecha_hora 
FROM OBSERVACION o
JOIN USUARIO u ON o.id_usuario = u.id_usuario
JOIN ROL r ON u.id_rol = r.id_rol
ORDER BY o.id_observacion DESC
LIMIT 10;`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Explorador de Base de Datos SQLite Embebido</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono">
              DB Browser Web
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspección directa de catálogo relacional, metadatos DDL y sandbox de consultas SQL de solo lectura
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
          <HardDrive size={15} className="text-orange-400" />
          <div>
            <span className="font-mono text-white font-bold">{dbInfo?.db_file || 'trefilado.db'}</span>
            <span className="text-slate-400 font-mono ml-2">
              ({dbInfo?.tables_count ?? 8} tablas • {dbInfo ? `${Math.round(dbInfo.approx_size_bytes / 1024)} KB` : '420 KB'})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tablas del Esquema ({dbInfo?.tables?.length ?? 8})</span>
            <Database size={14} className="text-orange-400" />
          </div>

          <div className="space-y-1">
            {dbInfo?.tables?.map((t) => {
              const isSelected = selectedTable === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
                    <span className="font-mono">{t.name}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-orange-800 text-orange-200' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
                    {t.row_count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
            <p>• Motor: SQLite 3 (WASM Embebido)</p>
            <p>• Archivo: <span className="font-mono text-slate-400">/db/trefilado.db</span></p>
            <p>• Claves foráneas: <span className="text-emerald-400 font-bold">PRAGMA foreign_keys = ON</span></p>
          </div>
        </div>

        {/* Panel Central */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-1 shadow-md">
            <button
              onClick={() => setActiveTab('estructura')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'estructura'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Key size={14} />
              <span>Estructura & Claves ({selectedTable})</span>
            </button>

            <button
              onClick={() => setActiveTab('datos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'datos'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Table size={14} />
              <span>Explorador de Filas ({tableSchema?.row_count ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('consola')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'consola'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code size={14} />
              <span>Consola SQL (Solo Lectura)</span>
            </button>
          </div>

          {/* TAB 1: Estructura */}
          {activeTab === 'estructura' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <span>Columnas y Tipos de Datos — Tabla "{selectedTable}"</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Definición de tipos SQLite nativos (INTEGER, REAL, TEXT) y restricciones de integridad
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Columna</th>
                      <th className="py-2.5 px-3">Tipo SQLite</th>
                      <th className="py-2.5 px-3">Clave Primaria (PK)</th>
                      <th className="py-2.5 px-3">Not Null</th>
                      <th className="py-2.5 px-3">Valor Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {tableSchema?.columns?.map((col) => (
                      <tr key={col.cid} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-500">{col.cid}</td>
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                          {col.pk && <Key size={12} className="text-amber-400" />}
                          <span>{col.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-orange-400 font-semibold">{col.type}</td>
                        <td className="py-2.5 px-3">
                          {col.pk ? <span className="text-amber-400 font-bold">PRIMARY KEY</span> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {col.notnull ? <span className="text-emerald-400 font-bold">NOT NULL</span> : <span className="text-slate-600">NULL</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {col.dflt_value ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Link2 size={14} className="text-blue-400" />
                  <span>Relaciones & Claves Foráneas (FK)</span>
                </h4>
                {tableSchema?.foreign_keys?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-xl border border-slate-850">
                    Esta tabla no posee claves foráneas hacia otras entidades.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {tableSchema?.foreign_keys?.map((fk, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs font-mono flex items-center justify-between">
                        <div>
                          <span className="text-white font-bold">{selectedTable}.{fk.from}</span>
                          <span className="text-slate-500 mx-2">→ REFERENCES →</span>
                          <span className="text-orange-400 font-bold">{fk.table}({fk.to})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ON UPDATE {fk.on_update} / ON DELETE {fk.on_delete}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-400" />
                  <span>Índices Creados para Optimización de Rendimiento</span>
                </h4>
                <div className="space-y-1.5">
                  {tableSchema?.indexes?.map((idx, i) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-purple-300 font-bold">{idx.name}</span>
                        <span className="text-slate-500 ml-2">sobre columnas: [{idx.columns?.join(', ')}]</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {idx.unique ? 'UNIQUE' : 'INDEX'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Datos */}
          {activeTab === 'datos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Datos Registrados — {selectedTable}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total registros en tabla: <strong className="font-mono text-white">{tablePreview?.total ?? 0}</strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      {tablePreview?.rows && tablePreview.rows.length > 0
                        ? Object.keys(tablePreview.rows[0]).map((col) => (
                            <th key={col} className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {col}
                            </th>
                          ))
                        : <th>Sin columnas</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {loadingPreview ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          Cargando filas de SQLite...
                        </td>
                      </tr>
                    ) : tablePreview?.rows?.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          La tabla no contiene filas registradas.
                        </td>
                      </tr>
                    ) : (
                      tablePreview?.rows?.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/40">
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 text-slate-300 max-w-xs truncate">
                              {val === null ? <span className="text-slate-600 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>Página {previewPage} de {tablePreview?.total_paginas ?? 1}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage <= 1}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPreviewPage(p => Math.min(tablePreview?.total_paginas || 1, p + 1))}
                    disabled={previewPage >= (tablePreview?.total_paginas || 1)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Consola SQL */}
          {activeTab === 'consola' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Code size={16} className="text-orange-400" />
                    <span>Consola Interactiva SQL (Solo Lectura)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ejecute sentencias <code className="text-orange-400 font-mono">SELECT</code> de auditoría sobre <code className="text-white font-mono">trefilado.db</code>.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Sandbox Seguro (Solo SELECT)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Consultas de Auditoría Recomendadas (Clic para cargar):
                </span>
                <div className="flex flex-wrap gap-2">
                  {plantillasSql.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSqlQuery(p.sql)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-orange-400 hover:text-white transition cursor-pointer"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={5}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Ingrese consulta SELECT..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-hidden focus:border-orange-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  * Límite automático de seguridad: 100 filas máx.
                </span>
                <button
                  onClick={handleExecuteSql}
                  disabled={executingSql || !sqlQuery.trim()}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Play size={14} />
                  <span>{executingSql ? 'Ejecutando en SQLite...' : 'Ejecutar Consulta'}</span>
                </button>
              </div>

              {sqlError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error en Ejecución de Consulta</p>
                    <p className="font-mono mt-0.5">{sqlError}</p>
                  </div>
                </div>
              )}

              {queryResult && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Filas retornadas: <strong className="text-white font-mono">{queryResult.filas_retornadas}</strong></span>
                      <span>•</span>
                      <span>Tiempo de ejecución: <strong className="text-orange-400 font-mono">{queryResult.tiempo_ms} ms</strong></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-950 z-10">
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                          {queryResult.columnas?.map((col) => (
                            <th key={col} className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {queryResult.filas?.length === 0 ? (
                          <tr>
                            <td colSpan={queryResult.columnas?.length || 1} className="py-6 text-center text-slate-500">
                              La consulta no retornó registros.
                            </td>
                          </tr>
                        ) : (
                          queryResult.filas?.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-800/40">
                              {queryResult.columnas?.map((col, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-slate-300 whitespace-nowrap">
                                  {row[col] === null ? <span className="text-slate-600 italic">NULL</span> : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
