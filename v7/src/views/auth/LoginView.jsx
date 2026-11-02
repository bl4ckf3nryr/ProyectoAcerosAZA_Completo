import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Flame, Lock, User, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { RecuperarPasswordModal } from '../../components/auth/RecuperarPasswordModal.jsx';

export function LoginView({ onNavigateToReset }) {
  const { login, quickLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [recuperarModalOpen, setRecuperarModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (role) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await quickLogin(role);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión rápida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10">
        
        {/* Branding header */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-b from-slate-800/60 to-transparent border-b border-slate-800/70 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 mb-3 shadow-inner">
            <Flame size={34} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ACEROS AZA</h1>
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mt-1">
            Planta de Trefilado Industrial
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Sistema de Monitoreo & Trazabilidad de Ángulo
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">Error de Autenticación</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. operador1, supervisor, admin"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setRecuperarModalOpen(true)}
                  className="text-[11px] text-orange-400 hover:text-orange-300 hover:underline transition cursor-pointer flex items-center gap-1"
                >
                  <KeyRound size={12} />
                  <span>¿Olvidaste tu contraseña?</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Validando Credenciales...' : 'Ingresar al Sistema'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick evaluation access */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Acceso Rápido de Evaluación (1 Clic)
              </span>
              <ShieldCheck size={14} className="text-orange-400" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuick('Operador')}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-blue-400 uppercase block">Operador</span>
                <span className="text-[11px] font-mono text-slate-400 group-hover:text-white">operador1</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('Supervisor')}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">Supervisor</span>
                <span className="text-[11px] font-mono text-slate-400 group-hover:text-white">supervisor</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('Administrador')}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-left transition cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-purple-400 uppercase block">Admin</span>
                <span className="text-[11px] font-mono text-slate-400 group-hover:text-white">admin</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              * Bloqueo corporativo activo tras 3 intentos fallidos (CU1).
            </p>
          </div>

        </div>

        {/* Footer credits */}
        <div className="px-8 py-3.5 bg-slate-950/80 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Desarrollado para <span className="font-semibold text-slate-200">Aceros AZA / INACAP</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Equipo: Lancelot Castro & Rodrigo Mancilla
          </p>
        </div>

      </div>

      {/* Modal de Recuperación de Contraseña */}
      <RecuperarPasswordModal
        isOpen={recuperarModalOpen}
        onClose={() => setRecuperarModalOpen(false)}
        onNavigateToReset={onNavigateToReset}
      />
    </div>
  );
}
