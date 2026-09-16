import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Lock, 
  Eye
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [quickCode, setQuickCode] = useState('');
  const navigate = useNavigate();

  const handleQuickEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim()) {
      navigate(`/student?code=${encodeURIComponent(quickCode.trim().toUpperCase())}`);
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6 animate-soft-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arquitectura Serverless • Supervisión en Tiempo Real</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Evaluaciones en línea con{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              integridad absoluta
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Plataforma estilo TestPortal de alto rendimiento con sincronización continua en Firebase, reloj de servidor inalterable y detección proactiva de sospechas.
          </p>

          {/* Action Boxes */}
          <div className="mt-10 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {/* Student Quick Access Card */}
            <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 glow-indigo relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">¿Eres Estudiante?</h2>
                  <p className="text-xs text-slate-400">Ingresa con el código de examen</p>
                </div>
              </div>

              <form onSubmit={handleQuickEntry} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={quickCode}
                  onChange={e => setQuickCode(e.target.value.toUpperCase())}
                  placeholder="Ej: DEMO-101"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:font-sans placeholder-slate-500 outline-none uppercase"
                />
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/30"
                >
                  <span>Ingresar a la Prueba</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Teacher Portal Card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">¿Eres Docente?</h2>
                  <p className="text-xs text-slate-400">Crea exámenes y supervisa envíos</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col justify-end h-24">
                <button
                  type="button"
                  onClick={() => navigate('/teacher/login')}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <span>Acceso al Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Garantía de Integridad y Rendimiento
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Diseñado con los estándares más estrictos de seguridad serverless y supervisión activa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Motor Anti-Trampa</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supervisión proactiva de visibilidad, desenfoque de ventana (blur), menús contextuales y atajos de teclado con registro inmediato de infracciones en el panel docente.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Zero Answer-Key Leak</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aislamiento estricto de la matriz de respuestas correctas en nodos protegidos por reglas de seguridad. El estudiante nunca recibe la clave en su memoria o red.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Reloj Sincronizado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cálculo de tiempo restante atado a la hora del servidor con <code className="text-indigo-400 font-mono text-[11px]">.info/serverTimeOffset</code> para anular cualquier intento de manipulación del reloj local.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
