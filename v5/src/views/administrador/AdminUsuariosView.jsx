import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { UserPlus, CheckCircle2, Lock, Unlock, AlertCircle, X } from 'lucide-react';

export function AdminUsuariosView() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rut, setRut] = useState('');
  const [apellido, setApellido] = useState('');
  const [password, setPassword] = useState('');
  const [idRol, setIdRol] = useState('3');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editApellido, setEditApellido] = useState('');
  const [editIdRol, setEditIdRol] = useState('3');
  const [editPassword, setEditPassword] = useState('');

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.getUsuarios();
      setUsuarios(res.usuarios || []);
      setRoles(res.roles || []);
    } catch (err) {
      console.error('Error al listar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await api.crearUsuario({
        nombre_usuario: nombreUsuario.trim(),
        rut: rut.trim(),
        apellido: apellido.trim(),
        password: password.trim(),
        id_rol: Number(idRol),
      });

      setModalNuevoOpen(false);
      setNombreUsuario('');
      setRut('');
      setApellido('');
      setPassword('');
      loadUsuarios();
    } catch (err) {
      setFormError(err.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (id) => {
    try {
      await api.toggleUsuarioEstado(id);
      loadUsuarios();
    } catch (err) {
      alert('Error al modificar estado: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleOpenEditar = (u) => {
    setSelectedUser(u);
    setEditApellido(u.apellido);
    setEditIdRol(String(u.id_rol));
    setEditPassword('');
    setFormError(null);
    setModalEditarOpen(true);
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setFormError(null);

    try {
      await api.actualizarUsuario(selectedUser.id_usuario, {
        apellido: editApellido.trim(),
        id_rol: Number(editIdRol),
        password: editPassword.trim() || undefined,
      });

      setModalEditarOpen(false);
      loadUsuarios();
    } catch (err) {
      setFormError(err.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Gestión de Usuarios & Control RBAC</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Admin (CU8)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Administración de credenciales, roles únicos, validación de RUT chileno y política de 3 intentos fallidos
          </p>
        </div>

        <button
          onClick={() => { setFormError(null); setModalNuevoOpen(true); }}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Registrar Usuario</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Usuario (Login)</th>
                <th className="py-3 px-4">RUT Chileno</th>
                <th className="py-3 px-4">Apellido</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Estado / Intentos</th>
                <th className="py-3 px-4">Observaciones Creadas</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.map(u => (
                <tr key={u.id_usuario} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">
                    #{u.id_usuario}
                  </td>
                  <td className="py-3 px-4 font-bold text-white font-mono">
                    {u.nombre_usuario}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {u.rut}
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    {u.apellido}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      u.rol_nombre === 'Administrador' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                      u.rol_nombre === 'Supervisor' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                      'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    }`}>
                      {u.rol_nombre}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.habilitado === 1 ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 size={14} />
                        <span>Habilitado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                        <Lock size={14} />
                        <span>Bloqueado ({u.intentos_fallidos} intentos)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {u.total_observaciones}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditar(u)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleEstado(u.id_usuario)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                          u.habilitado === 1
                            ? 'bg-rose-950/40 text-rose-400 border-rose-800/60 hover:bg-rose-900/60'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                        }`}
                        title={u.habilitado === 1 ? 'Inhabilitar cuenta' : 'Desbloquear y rehabilitar cuenta'}
                      >
                        {u.habilitado === 1 ? <Lock size={12} /> : <Unlock size={12} />}
                        <span>{u.habilitado === 1 ? 'Bloquear' : 'Desbloquear'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalNuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-orange-400" />
                <h3 className="text-base font-bold text-white">Registrar Nuevo Usuario</h3>
              </div>
              <button onClick={() => setModalNuevoOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. operador4"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">RUT Chileno (con dígito verificador)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 16.789.123-4"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500 font-mono"
                />
                <span className="text-[10px] text-slate-500">Validado mediante algoritmo chileno módulo 11</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="ej. González"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rol en Planta</label>
                <select
                  value={idRol}
                  onChange={(e) => setIdRol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                >
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEditarOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Editar Usuario: {selectedUser.nombre_usuario}</h3>
              <button onClick={() => setModalEditarOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Apellido</label>
                <input
                  type="text"
                  required
                  value={editApellido}
                  onChange={(e) => setEditApellido(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rol</label>
                <select
                  value={editIdRol}
                  onChange={(e) => setEditIdRol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                >
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nueva Contraseña (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para no modificar"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditarOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
