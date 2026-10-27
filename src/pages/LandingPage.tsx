import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Eye, 
  Clock, 
  Bot 
} from 'lucide-react';
import { ParticleSphere } from '../components/common/ParticleSphere';

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
    <div className="flex-1 flex flex-col bg-[#012624] text-[#bbc7c6]">
      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden py-16 sm:py-24">
        {/* Background 3D Particle Sphere */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
          <ParticleSphere className="w-[650px] h-[650px] sm:w-[850px] sm:h-[850px] max-w-full" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          {/* Eyebrow Label */}
          <div className="eyebrow-label mb-6 px-3.5 py-1 rounded-md bg-[#003734] border border-white/10 text-[#edfffe] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cbfffc] animate-pulse"></span>
            <span>Auros • Arquitectura Abisal de Evaluación Continua</span>
          </div>

          {/* Hero Headline (61-96px Matter 500, line-height 1.0, tracking -0.04em) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-medium text-white tracking-[-0.04em] leading-[1.0] max-w-5xl">
            Integridad absoluta y generación inteligente
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-sm sm:text-base md:text-lg text-[#bbc7c6] max-w-2xl leading-[1.4]">
            Terminal de evaluaciones segura con sincronización en tiempo real, supervisión de integridad activa y creación instantánea de exámenes asistida por IA.
          </p>

          {/* Action Cards Grid */}
          <div className="mt-12 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
            {/* Student Card */}
            <div className="surface-card p-6 sm:p-7 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <span className="eyebrow-label text-[10px] text-[#edfffe] block mb-1">Portal Estudiante</span>
                <h2 className="text-lg font-medium text-white tracking-tight">Ingresar a Evaluación</h2>
                <p className="text-xs text-[#bbc7c6] mt-1">Digita el código o PIN provisto por el docente.</p>
              </div>

              <form onSubmit={handleQuickEntry} className="mt-5 space-y-3">
                <input
                  type="text"
                  value={quickCode}
                  onChange={e => setQuickCode(e.target.value.toUpperCase())}
                  placeholder="Ej: DEMO-101"
                  className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#707777] uppercase outline-none transition"
                />
                <button
                  type="submit"
                  className="btn-aurora w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-medium uppercase"
                >
                  <span>Iniciar Examen</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#012624]" />
                </button>
              </form>
            </div>

            {/* Teacher Card */}
            <div className="surface-card p-6 sm:p-7 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <span className="eyebrow-label text-[10px] text-[#edfffe] block mb-1">Terminal Docente</span>
                <h2 className="text-lg font-medium text-white tracking-tight">Panel de Control</h2>
                <p className="text-xs text-[#bbc7c6] mt-1">Crea evaluaciones, genera con IA y supervisa en vivo.</p>
              </div>

              <div className="mt-6 flex flex-col justify-end space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/teacher/login')}
                  className="btn-action w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.08em]"
                >
                  <span>Acceso Docente</span>
                  <span className="btn-arrow w-5 h-5 text-[11px] bg-transparent border-0">↗</span>
                </button>
                <Link
                  to="/teacher/exam/new"
                  className="text-[11px] text-[#cbfffc] text-center hover:underline uppercase tracking-[0.08em]"
                >
                  Crear nuevo examen con IA →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Block (Auros Signature: Lavender Phosphor numbers at 86px) */}
      <section className="py-20 border-t border-b border-white/10 bg-[#011d1c]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center">
            {/* Stat 1 */}
            <div className="flex flex-col items-center">
              <span className="text-5xl sm:text-6xl md:text-7xl font-medium text-[#fde9ff] tracking-[-0.04em] leading-none font-mono">
                0%
              </span>
              <span className="eyebrow-label text-xs sm:text-sm text-[#edfffe] mt-3">
                Zero Answer-Key Leak
              </span>
              <p className="text-xs text-[#707777] mt-1 max-w-xs">
                Claves secretas aisladas estrictamente en nodos inaccesibles para el estudiante.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center">
              <span className="text-5xl sm:text-6xl md:text-7xl font-medium text-[#fde9ff] tracking-[-0.04em] leading-none font-mono">
                60fps
              </span>
              <span className="eyebrow-label text-xs sm:text-sm text-[#edfffe] mt-3">
                Monitoreo Anti-Trampa
              </span>
              <p className="text-xs text-[#707777] mt-1 max-w-xs">
                Supervisión de pérdida de foco, cambio de ventana y herramientas de inspección.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center">
              <span className="text-5xl sm:text-6xl md:text-7xl font-medium text-[#fde9ff] tracking-[-0.04em] leading-none font-mono">
                100%
              </span>
              <span className="eyebrow-label text-xs sm:text-sm text-[#edfffe] mt-3">
                Generación IA Groq
              </span>
              <p className="text-xs text-[#707777] mt-1 max-w-xs">
                Preguntas académicas estructuradas generadas en milisegundos con LLMs avanzados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore & Features Section (Asymmetric Two-Column Layout) */}
      <section className="py-24 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-14">
          <span className="eyebrow-label text-xs text-[#edfffe] block mb-2">Auros • Capacidades de la Plataforma</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.0] max-w-3xl">
            Diseñado como un instrumento de precisión para la docencia
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Stacked Feature Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* Feature 1: AI Generator */}
            <div className="surface-card p-8 rounded-2xl border border-white/10 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="w-8 h-8 rounded-md bg-[#011d1c] text-[#cbfffc] flex items-center justify-center mb-4">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-medium text-white tracking-tight">
                    Generación de Tests con IA (Groq)
                  </h3>
                  <p className="text-sm text-[#bbc7c6] mt-2.5 leading-[1.4]">
                    Escribe un tema de cualquier materia y define la cantidad de preguntas, tipo (opción múltiple o V/F) y complejidad. La IA estructura automáticamente el cuestionario con opciones, clave de respuesta y retroalimentación pedagógica.
                  </p>
                </div>
                <Link to="/teacher/exam/new" className="btn-arrow shrink-0" title="Probar generador">
                  ↗
                </Link>
              </div>
            </div>

            {/* Feature 2: Anti-Cheat Engine */}
            <div className="surface-card p-8 rounded-2xl border border-white/10 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="w-8 h-8 rounded-md bg-[#011d1c] text-[#edfffe] flex items-center justify-center mb-4">
                    <Eye className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-medium text-white tracking-tight">
                    Supervisión Anti-Trampa Sincronizada
                  </h3>
                  <p className="text-sm text-[#bbc7c6] mt-2.5 leading-[1.4]">
                    Detección instantánea de pérdida de foco, cambio de pestañas, menú contextual y atajos de teclado. Cada evento se registra cronológicamente en la bitácora de auditoría para el docente.
                  </p>
                </div>
                <Link to="/teacher" className="btn-arrow shrink-0" title="Ver auditoría">
                  ↗
                </Link>
              </div>
            </div>

            {/* Feature 3: Server Timer */}
            <div className="surface-card p-8 rounded-2xl border border-white/10 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="w-8 h-8 rounded-md bg-[#011d1c] text-[#fde9ff] flex items-center justify-center mb-4">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-medium text-white tracking-tight">
                    Temporizador Inalterable en la Nube
                  </h3>
                  <p className="text-sm text-[#bbc7c6] mt-2.5 leading-[1.4]">
                    El tiempo de evaluación se sincroniza con la hora de los servidores en la nube, evitando manipulaciones en el reloj local del dispositivo del estudiante y ejecutando el auto-envío al expirar.
                  </p>
                </div>
                <Link to="/student" className="btn-arrow shrink-0" title="Entrar a examen">
                  ↗
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Geometric Molecular Diagram Illustration */}
          <div className="lg:col-span-5 surface-deep p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center min-h-[460px] relative overflow-hidden">
            {/* SVG Molecular Diagram */}
            <svg className="w-full max-w-[320px] h-[320px] text-white/30" viewBox="0 0 300 300" fill="none">
              {/* Connector lines */}
              <line x1="150" y1="50" x2="80" y2="120" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="150" y1="50" x2="220" y2="120" stroke="currentColor" strokeWidth="1" />
              <line x1="80" y1="120" x2="80" y2="200" stroke="currentColor" strokeWidth="1" />
              <line x1="220" y1="120" x2="220" y2="200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="80" y1="200" x2="150" y2="250" stroke="currentColor" strokeWidth="1" />
              <line x1="220" y1="200" x2="150" y2="250" stroke="currentColor" strokeWidth="1" />
              <line x1="150" y1="50" x2="150" y2="250" stroke="rgba(203, 255, 252, 0.4)" strokeWidth="1.5" />
              <line x1="80" y1="120" x2="220" y2="200" stroke="rgba(0, 130, 124, 0.3)" strokeWidth="1" />

              {/* Molecular Circles */}
              <circle cx="150" cy="50" r="14" fill="#003734" stroke="#cbfffc" strokeWidth="2" />
              <circle cx="80" cy="120" r="10" fill="#011d1c" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="220" cy="120" r="10" fill="#011d1c" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="80" cy="200" r="10" fill="#011d1c" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="220" cy="200" r="10" fill="#011d1c" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="150" cy="250" r="16" fill="#003734" stroke="#fde9ff" strokeWidth="2" />
              <circle cx="150" cy="150" r="22" fill="#003734" stroke="#00827c" strokeWidth="2" />

              {/* Inner glowing dots */}
              <circle cx="150" cy="150" r="5" fill="#cbfffc" />
              <circle cx="150" cy="50" r="3" fill="#ffffff" />
              <circle cx="150" cy="250" r="4" fill="#fde9ff" />
            </svg>

            <span className="eyebrow-label text-xs text-[#edfffe] mt-4">Arquitectura Concurrente Zero-Leak</span>
            <p className="text-xs text-[#bbc7c6] mt-2 max-w-xs leading-relaxed">
              Mapeo de datos desacoplado entre el canvas del estudiante y la clave criptográfica del docente en Cloud Firestore.
            </p>
          </div>
        </div>
      </section>

      {/* Recessed Footer (Auros: Liquid Deep #011d1c with 120px padding) */}
      <footer className="bg-[#011d1c] py-[120px] border-t border-white/10 text-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="w-10 h-10 rounded-md bg-[linear-gradient(90deg,rgb(0,130,124)_0%,rgb(203,255,252)_100%)] flex items-center justify-center text-[#012624] font-bold text-sm mb-4">
            ▲
          </div>
          <span className="text-lg font-medium text-white tracking-[-0.03em] uppercase">
            Auros ExamTaker
          </span>
          <span className="eyebrow-label text-[10px] text-[#edfffe] mt-1 tracking-[0.15em]">
            Abyssal Terminal with Bioluminescent Data Orbs
          </span>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#bbc7c6] uppercase tracking-[0.08em]">
            <Link to="/" className="hover:text-white transition">Inicio</Link>
            <Link to="/student" className="hover:text-white transition">Portal Estudiante</Link>
            <Link to="/teacher" className="hover:text-white transition">Gestión Docente</Link>
            <Link to="/teacher/exam/new" className="hover:text-white transition">Crear con IA</Link>
          </div>

          <p className="mt-10 text-[11px] text-[#707777] font-mono">
            © 2026 Auros ExamTaker. Sistema de Evaluación Continua.
          </p>
        </div>
      </footer>
    </div>
  );
};
