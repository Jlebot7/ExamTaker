import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  User, 
  Hash, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ShieldAlert 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam } from '../types';

export const StudentEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [examCode, setExamCode] = useState(initialCode);
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  
  const [examPreview, setExamPreview] = useState<Exam | null>(null);
  const [isValidatingExam, setIsValidatingExam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  // Validate exam code on blur or change
  useEffect(() => {
    const cleanCode = examCode.trim();
    if (!cleanCode) {
      setExamPreview(null);
      setErrorMessage(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingExam(true);
      setErrorMessage(null);
      try {
        const found = await examService.getExam(cleanCode);
        if (!found) {
          setExamPreview(null);
          setErrorMessage('No se encontró ninguna evaluación con este código.');
        } else if (!found.isPublished) {
          setExamPreview(null);
          setErrorMessage('Esta evaluación aún no ha sido publicada por el docente.');
        } else {
          setExamPreview(found);
          setErrorMessage(null);
        }
      } catch (err) {
        setErrorMessage('Error al consultar el código del examen.');
      } finally {
        setIsValidatingExam(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [examCode]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!examPreview) {
      setErrorMessage('Por favor ingresa un código de examen válido y publicado.');
      return;
    }

    if (!studentName.trim() || !studentCode.trim()) {
      setErrorMessage('Por favor completa todos tus datos personales.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sign in anonymously via Firebase Auth
      const studentUid = await loginStudent(studentName.trim(), studentCode.trim());

      // 2. Initialize or recover submission session in Realtime Database
      const submission = await studentService.startOrGetSubmission(
        examPreview.id,
        studentUid,
        studentName.trim(),
        studentCode.trim()
      );

      // Check if already finished
      if (submission.status !== 'in_progress') {
        navigate(`/exam-finished/${examPreview.id}`);
        return;
      }

      // 3. Navigate to the evaluation interface
      navigate(`/exam/${examPreview.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar la sesión del examen';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25 mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Ingreso a Evaluación
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ingresa el código del examen proporcionado por tu docente y tus datos de estudiante.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleStartExam} className="space-y-4">
            {/* Exam PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Código o PIN del Examen
                </label>
                {isValidatingExam && (
                  <span className="text-[11px] text-indigo-400 animate-pulse">Verificando...</span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={examCode}
                  onChange={e => setExamCode(e.target.value.toUpperCase())}
                  placeholder="Ej: DEMO-101"
                  className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Exam Preview Card if Found */}
            {examPreview && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Examen Encontrado y Activo</span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{examPreview.title}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{examPreview.durationMinutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-purple-400" />
                    <span>{examPreview.questions.length} preguntas ({examPreview.totalPoints} pts)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Máx. {examPreview.maxViolations} infracciones</span>
                  </div>
                </div>
              </div>
            )}

            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombres y Apellidos
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Ej: Sofía Ramírez Morales"
                  className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Student Identification / Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Matrícula, DNI o Código de Estudiante
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  placeholder="Ej: EST-202409"
                  className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Anti-cheat Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso de Integridad:</strong> Este examen cuenta con supervisión activa. Salir de la pantalla, cambiar de pestaña o abrir el menú contextual registrará una infracción en tiempo real.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !examPreview}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Iniciando sesión segura...</span>
              ) : (
                <>
                  <span>Comenzar Evaluación</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo helper */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setExamCode('DEMO-101')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              ¿Probar con el examen de demostración (DEMO-101)?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
