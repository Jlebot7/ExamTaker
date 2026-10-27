import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TeacherAuth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginTeacher, registerTeacher, loginDemoTeacher, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await loginTeacher(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo');
        }
        await registerTeacher(email, password, displayName);
      }
      navigate('/teacher');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al autenticar';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setLocalError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setLocalError('Este correo electrónico ya está registrado.');
      } else if (msg.includes('auth/weak-password')) {
        setLocalError('La contraseña debe tener al menos 6 caracteres.');
      } else if (msg.includes('auth/operation-not-allowed')) {
        setLocalError('El método de correo y contraseña aún no ha sido habilitado en Firebase Console (Authentication > Sign-in method).');
      } else {
        setLocalError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    loginDemoTeacher();
    navigate('/teacher');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="surface-card rounded-[16px] p-6 sm:p-8 border border-white/8 relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[6px] surface-deep border border-white/10 mb-3 text-[#edfffe]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00827c]"></span>
              <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#edfffe]/80 font-medium">
                TERMINAL DOCENTE
              </span>
            </div>
            <h1 className="text-2xl font-medium text-white tracking-tight">
              Portal del Docente
            </h1>
            <p className="text-xs text-[#bbc7c6] mt-1 max-w-xs mx-auto leading-relaxed">
              Gestiona evaluaciones, supervisa intentos en tiempo real y audita la integridad sin fugas.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-[6px] surface-deep p-1 mb-6 border border-white/8">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setLocalError(null); }}
              className={`flex-1 py-1.5 text-xs font-medium uppercase tracking-wider rounded-[4px] transition-all ${
                isLogin
                  ? 'bg-[#003734] text-white border border-white/10'
                  : 'text-[#bbc7c6] hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setLocalError(null); }}
              className={`flex-1 py-1.5 text-xs font-medium uppercase tracking-wider rounded-[4px] transition-all ${
                !isLogin
                  ? 'bg-[#003734] text-white border border-white/10'
                  : 'text-[#bbc7c6] hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Error banner */}
          {localError && (
            <div className="mb-5 p-3 rounded-[6px] surface-deep border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{localError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6] mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Prof. Juan Pérez"
                    className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#bbc7c6]/50 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6] mb-1.5">
                Correo Institucional o Personal
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="docente@universidad.edu"
                  className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#bbc7c6]/50 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#bbc7c6]/50 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 btn-bioluminescent rounded-[6px] py-2.5 px-4 font-medium uppercase tracking-wider text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Ingresar al Panel' : 'Crear Cuenta'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Button */}
          <div className="mt-6 pt-6 border-t border-white/8">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[6px] surface-deep hover:bg-[#025a53] text-[#edfffe] border border-white/10 text-xs font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#fde9ff]" />
              <span>Acceso Rápido con Perfil Docente Demo</span>
            </button>
            <p className="text-[11px] text-[#bbc7c6]/70 text-center mt-2">
              {isFirebaseActive 
                ? 'Conectado a Firebase Authentication y Realtime Database.'
                : 'Usa el perfil demo para explorar todas las herramientas de inmediato.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};