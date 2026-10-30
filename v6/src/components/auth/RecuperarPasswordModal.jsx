import React, { useState } from 'react';
import { 
  KeyRound, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  User,
  Clock
} from 'lucide-react';

export function RecuperarPasswordModal({ isOpen, onClose, onNavigateToReset }) {
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setIdentificador('');
    setRecoveryData(null);
    setErrorMsg(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificador.trim()) {
      setErrorMsg('Por favor ingrese su RUT o nombre de usuario.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/auth/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: identificador.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la recuperación');
      }

      setRecoveryData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const goToResetView = (token) => {
    handleClose();
    if (onNavigateToReset) {
      onNavigateToReset(token);
    } else {
      window.location.href = `/reset-password?token=${encodeURIComponent(token)}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Recuperación de Contraseña
              </h2>
              <p className="text-xs text-slate-400">
                Aceros AZA — Planta de Trefilado Industrial
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">Atención</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {!recoveryData ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingresa tu <strong className="text-white">RUT</strong> o <strong className="text-white">nombre de usuario</strong> registrado. Se generará un token criptográfico seguro en la base de datos corporativa con vigencia de 1 hora.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  RUT o Nombre de Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="ej. operador1 o 13.333.333-3"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Botones de sugerencia para evaluación rápida */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Usuarios de prueba disponibles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'operador1', id: 'operador1' },
                    { label: 'supervisor', id: 'supervisor' },
                    { label: 'admin', id: 'admin' },
                    { label: '11.111.111-1 (RUT Admin)', id: '11.111.111-1' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIdentificador(item.id)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] border border-slate-700 transition cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Generando Token...' : 'Generar Enlace de Recuperación'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {recoveryData.encontrado ? (
                <>
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-300">
                          Enlace de recuperación generado en BD
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Se ha registrado un token criptográfico seguro para el usuario{' '}
                          <strong className="text-white font-mono">{recoveryData.usuario?.nombre_usuario}</strong> ({recoveryData.usuario?.rol}).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Token & Expiración */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
                        <Clock size={13} className="text-orange-400" />
                        Vigencia de Seguridad
                      </span>
                      <span className="font-mono text-emerald-400 text-[11px]">
                        1 hora (expira {new Date(recoveryData.expira).toLocaleTimeString('es-CL')})
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Token Criptográfico (BD SQLite):
                      </span>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-orange-300 break-all select-all">
                        {recoveryData.token}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Enlace Directo Generado:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 truncate select-all">
                          {recoveryData.link}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(recoveryData.link)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                          title="Copiar enlace"
                        >
                          <Copy size={13} />
                          <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      Probar con otro usuario
                    </button>

                    <button
                      type="button"
                      onClick={() => goToResetView(recoveryData.token)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Restablecer Contraseña Ahora</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-2">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        {recoveryData.mensaje}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8">
                      Nota de evaluación: Verifica que el RUT o usuario coincida con los registrados en la BD (ej. <code className="text-orange-300 font-mono">operador1</code>, <code className="text-orange-300 font-mono">supervisor</code>, <code className="text-orange-300 font-mono">admin</code>).
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      Volver a Intentar
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
