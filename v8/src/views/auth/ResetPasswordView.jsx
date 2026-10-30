import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  Flame, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  User, 
  Clock, 
  ArrowLeft,
  Sun,
  Moon
} from 'lucide-react';

export function ResetPasswordView({ token: propToken, onReturnToLogin }) {
  const [token, setToken] = useState(propToken || '');
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Extraer token de URL si no viene en props
  useEffect(() => {
    let activeToken = propToken;
    if (!activeToken) {
      const params = new URLSearchParams(window.location.search);
      activeToken = params.get('token');
    }

    if (!activeToken) {
      setVerifying(false);
      setTokenValid(false);
      setVerifyError('No se encontró ningún token de recuperación en la dirección proporcionada.');
      return;
    }

    setToken(activeToken);

    // Verificar validez del token en el backend
    async function verifyToken() {
      setVerifying(true);
      setVerifyError(null);
      try {
        const res = await fetch(`/api/auth/verificar-token-reset?token=${encodeURIComponent(activeToken)}`);
        const data = await res.json();

        if (res.ok && data.valido) {
          setTokenValid(true);
          setUserInfo(data.usuario);
        } else {
          setTokenValid(false);
          setVerifyError(data.error || 'El enlace de recuperación es inválido o ha expirado.');
        }
      } catch (err) {
        setTokenValid(false);
        setVerifyError('Error al comunicarse con el servidor para validar el enlace.');
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [propToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifíquelas.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          nuevaPassword: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la contraseña');
      }

      setSuccessMsg(data.message || 'Contraseña actualizada correctamente en la base de datos.');
    } catch (err) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleGoLogin = () => {
    if (onReturnToLogin) {
      onReturnToLogin();
    } else {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Botón de alternancia de tema */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-md"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-10 transition-colors">
        
        {/* Branding header */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-b from-slate-50 dark:from-slate-800/60 to-transparent border-b border-slate-200 dark:border-slate-800/70 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-orange-600/20 text-orange-500 dark:text-orange-400 border border-orange-500/30 mb-3 shadow-inner">
            <Flame size={34} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ACEROS AZA</h1>
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-1">
            Planta de Trefilado Industrial
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Restablecimiento Seguro de Contraseña
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">

          {/* Estado de Verificación Inicial */}
          {verifying ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Validando enlace criptográfico en base de datos...
              </p>
            </div>
          ) : !tokenValid ? (
            /* Error en Token o Expirado */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-bold text-rose-800 dark:text-rose-200">Enlace No Válido o Expirado</p>
                  <p className="mt-1 leading-relaxed text-rose-700 dark:text-rose-300/90">{verifyError}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-semibold">
                  <Clock size={14} className="text-orange-500 dark:text-orange-400" />
                  <span>Políticas de Seguridad Corporativa:</span>
                </div>
                <p className="leading-relaxed">
                  Por seguridad en Aceros AZA, cada enlace de recuperación es de un solo uso y cuenta con una vigencia máxima de 1 hora desde su generación.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoLogin}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-transparent"
              >
                <ArrowLeft size={14} />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </div>
          ) : successMsg ? (
            /* Éxito al restablecer */
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">¡Contraseña Restablecida!</h3>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                  {successMsg}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                  <ShieldCheck size={14} />
                  <span>Estado de la Cuenta Actualizado:</span>
                </div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside text-[11px]">
                  <li>Nuevo hash cifrado con Bcrypt en SQLite (<code className="text-orange-600 dark:text-orange-300 font-mono">trefilado.db</code>).</li>
                  <li>Token de recuperación revocado y limpiado en base de datos.</li>
                  <li>Contador de intentos fallidos restablecido a 0.</li>
                  <li>Cuenta habilitada y lista para operar.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleGoLogin}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ir a Iniciar Sesión</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            /* Formulario para ingresar nueva contraseña */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info del usuario detectado */}
              {userInfo && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <User size={15} className="text-orange-500 dark:text-orange-400" />
                    <span className="font-semibold">{userInfo.nombre_usuario}</span>
                    <span className="text-slate-500">({userInfo.apellido})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-slate-200 dark:border-slate-700">
                    {userInfo.rol}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <p className="font-semibold">Error al Restablecer</p>
                    <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Indicador de coincidencia */}
              {password && confirmPassword && (
                <div className="text-[11px] flex items-center gap-1.5">
                  {password === confirmPassword ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 size={13} />
                      Las contraseñas coinciden
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertCircle size={13} />
                      Las contraseñas aún no coinciden
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Actualizando Contraseña...' : 'Actualizar y Habilitar Cuenta'}</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleGoLogin}
                className="w-full py-2 px-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Volver al Login sin guardar cambios</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer credits */}
        <div className="px-8 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Desarrollado para <span className="font-semibold text-slate-800 dark:text-slate-200">Aceros AZA / INACAP</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Equipo: Lancelot Castro & Rodrigo Mancilla
          </p>
        </div>

      </div>
    </div>
  );
}
