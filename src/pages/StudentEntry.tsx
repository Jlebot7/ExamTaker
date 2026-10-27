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
        console.error('Error al validar código de examen:', err);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-lg">
        <div className="surface-card rounded-[16px] p-6 sm:p-8 border border-white/8 relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[6px] surface-deep border border-white/10 mb-3 text-[#edfffe]">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00827c]"></span>
              <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#edfffe]/80 font-medium">
                AUROS TESTQ // TERMINAL DE EVALUACIÓN
              </span>
            </div>
            <h1 className="text-2xl font-medium text-white tracking-tight">
              Ingreso a Evaluación
            </h1>
            <p className="text-xs text-[#bbc7c6] mt-1 max-w-xs mx-auto leading-relaxed">
              Ingresa el código PIN proporcionado por tu docente y tus datos de estudiante.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-[6px] surface-deep border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleStartExam} className="space-y-4">
            {/* Exam PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6]">
                  Código o PIN del Examen
                </label>
                {isValidatingExam && (
                  <span className="text-[10px] font-mono text-[#edfffe] animate-pulse">Verificando...</span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={examCode}
                  onChange={e => setExamCode(e.target.value.toUpperCase())}
                  placeholder="Ej: EVAL-2026"
                  className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans placeholder-[#bbc7c6]/50 outline-none transition"
                />
              </div>
            </div>

            {/* Exam Preview Card if Found */}
            {examPreview && (
              <div className="p-4 rounded-[6px] surface-deep border border-[#00827c]/40 animate-fadeIn">
                <div className="flex items-center gap-2 text-[#edfffe] text-xs font-medium mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Examen Encontrado y Activo</span>
                </div>
                <h3 className="text-sm font-medium text-white">{examPreview.title}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#bbc7c6]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#00827c]" />
                    <span>{examPreview.durationMinutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-[#fde9ff]" />
                    <span>{examPreview.questions.length} preguntas ({examPreview.totalPoints} pts)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#edfffe]" />
                    <span>Máx. {examPreview.maxViolations} infracciones</span>
                  </div>
                </div>
              </div>
            )}

            {/* Student Name */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6] mb-1.5">
                Nombres y Apellidos
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Ej: Sofía Ramírez Morales"
                  className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#bbc7c6]/50 outline-none transition"
                />
              </div>
            </div>

            {/* Student Identification / Code */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6] mb-1.5">
                Matrícula, DNI o Código de Estudiante
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  placeholder="Ej: EST-202409"
                  className="w-full surface-deep border border-white/10 focus:border-[#00827c] rounded-[6px] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#bbc7c6]/50 outline-none transition"
                />
              </div>
            </div>

            {/* Anti-cheat Disclaimer */}
            <div className="p-3.5 rounded-[6px] surface-deep border border-amber-500/20 text-[11px] text-[#bbc7c6] flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Aviso de Integridad:</strong> Este examen cuenta con supervisión activa. Salir de la ventana, cambiar de pestaña o abrir el menú contextual registrará una infracción en tiempo real.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !examPreview}
              className="w-full mt-2 btn-bioluminescent rounded-[6px] py-3 px-4 font-medium uppercase tracking-wider text-xs transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
};