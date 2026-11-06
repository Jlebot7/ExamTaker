import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award,
  RotateCcw,
  Home,
  User,
  KeyRound,
  FileCheck,
  Percent,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam, Submission } from '../types';

export const ResultsLookupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [examPin, setExamPin] = useState(initialCode);
  const [studentCode, setStudentCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchedExam, setSearchedExam] = useState<Exam | null>(null);
  const [searchedSubmission, setSearchedSubmission] = useState<Submission | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setExamPin(initialCode);
    }
  }, [initialCode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = examPin.trim().toUpperCase();
    const cleanDni = studentCode.trim();

    if (!cleanPin || !cleanDni) {
      setErrorMessage('Por favor ingresa tanto el código del examen como tu DNI o código de estudiante.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(false);

    try {
      // 1. Fetch exam
      const exam = await examService.getExam(cleanPin);
      if (!exam) {
        setErrorMessage('No se encontró ninguna evaluación con el código ingresado.');
        setSearchedExam(null);
        setSearchedSubmission(null);
        return;
      }

      // 2. Fetch submission for that student
      const sub = await studentService.findSubmissionByCode(cleanPin, cleanDni);
      if (!sub) {
        setErrorMessage('No se encontró ningún registro para el DNI/código ingresado en esta evaluación.');
        setSearchedExam(null);
        setSearchedSubmission(null);
        return;
      }

      setSearchedExam(exam);
      setSearchedSubmission(sub);
      setHasSearched(true);
    } catch (err) {
      console.error('Error al consultar resultados:', err);
      setErrorMessage('Ocurrió un error al consultar los resultados. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchedExam(null);
    setSearchedSubmission(null);
    setHasSearched(false);
    setErrorMessage(null);
    setStudentCode('');
  };

  const finalScore = searchedSubmission?.finalScore ?? null;
  const maxScore = searchedSubmission?.maxScore || searchedExam?.totalPoints || 0;
  const percentage = maxScore > 0 && finalScore !== null
    ? Math.round((finalScore / maxScore) * 100)
    : 0;
  const status = searchedSubmission?.status || 'submitted';
  const isApproved = status !== 'disqualified' && percentage >= 60;
  const hasOpenScores = searchedSubmission?.openQuestionScores && Object.keys(searchedSubmission.openQuestionScores).length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] surface-deep border border-white/8 text-[11px] uppercase tracking-wider font-medium text-emerald-300 mb-3">
            <Search className="w-3.5 h-3.5 text-[#00827c]" />
            <span>Portal de Estudiantes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
            Tablero de Consulta de Resultados
          </h1>
          <p className="text-xs sm:text-sm text-[#bbc7c6] mt-2 max-w-md mx-auto">
            Ingresa el código del examen y tu DNI o código de matrícula para consultar tu calificación final y retroalimentación pedagógica.
          </p>
        </div>

        {/* Search Card (Shown when not showing results) */}
        {!hasSearched ? (
          <div className="surface-card rounded-[16px] p-6 sm:p-8 border border-white/8 space-y-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#edfffe] uppercase tracking-wider mb-2">
                  Código de Evaluación (PIN)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={examPin}
                    onChange={(e) => setExamPin(e.target.value.toUpperCase())}
                    placeholder="Ej. EX-ABC123"
                    className="w-full pl-10 pr-4 py-2.5 rounded-[6px] surface-deep border border-white/10 text-white placeholder:text-[#bbc7c6]/50 focus:outline-none focus:border-[#00827c] text-sm uppercase font-mono tracking-wider transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#edfffe] uppercase tracking-wider mb-2">
                  DNI o Código de Estudiante
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#bbc7c6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="Ej. 70123456 o 2024-U1"
                    className="w-full pl-10 pr-4 py-2.5 rounded-[6px] surface-deep border border-white/10 text-white placeholder:text-[#bbc7c6]/50 focus:outline-none focus:border-[#00827c] text-sm font-mono transition"
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-[6px] surface-deep border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-[6px] btn-bioluminescent text-white text-xs font-medium uppercase tracking-wider inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Buscando evaluación...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar Mi Resultado</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-white/8 flex items-center justify-between text-xs text-[#bbc7c6]">
              <Link to="/student" className="hover:text-[#edfffe] transition inline-flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>¿Vas a rendir un examen? Ingresa aquí</span>
              </Link>
              <Link to="/" className="hover:text-[#edfffe] transition inline-flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                <span>Inicio</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Results Display Card */
          <div className="surface-card rounded-[16px] p-6 sm:p-8 border border-white/8 space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-[8px] surface-deep border border-white/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#00827c] block">
                  {searchedExam?.id}
                </span>
                <h2 className="text-base sm:text-lg font-medium text-white">
                  {searchedExam?.title}
                </h2>
                <p className="text-xs text-[#bbc7c6] mt-0.5">
                  Estudiante: <span className="text-white font-medium">{searchedSubmission?.studentName}</span> • DNI: <span className="font-mono text-white">{searchedSubmission?.studentCode}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="self-start sm:self-center px-3 py-1.5 rounded-[6px] surface-card hover:bg-[#025a53] border border-white/10 text-xs text-[#edfffe] font-medium uppercase tracking-wider inline-flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>Nueva Búsqueda</span>
              </button>
            </div>

            {/* In Progress or Pending Review Notice */}
            {status === 'in_progress' ? (
              <div className="p-6 rounded-[12px] surface-deep border border-amber-500/40 text-center space-y-2">
                <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-amber-300">Evaluación en Progreso</h3>
                <p className="text-xs text-[#bbc7c6]">
                  Esta evaluación aún no ha sido entregada por el estudiante.
                </p>
              </div>
            ) : finalScore === null ? (
              <div className="p-6 rounded-[12px] surface-deep border border-amber-500/40 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-amber-300">Revisión Pedagógica en Curso</h3>
                <p className="text-xs text-[#bbc7c6] leading-relaxed max-w-md mx-auto">
                  Tu examen ha sido entregado correctamente y contiene preguntas abiertas. Tu docente está revisando las respuestas con asistencia de IA pedagógica (<span className="font-mono text-[#edfffe]">openai/gpt-oss-120b</span>). Tu calificación final aparecerá aquí una vez publicada por tu profesor.
                </p>
              </div>
            ) : (
              /* Graded Score Card */
              <div className="p-6 rounded-[12px] surface-deep border border-white/10 text-center relative overflow-hidden">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className={`w-4 h-4 ${isApproved ? 'text-emerald-300' : 'text-[#bbc7c6]'}`} />
                    <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[#bbc7c6]">
                      Calificación Final Oficial
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl sm:text-6xl font-medium tracking-tight text-[#fde9ff] font-mono">
                      {finalScore}
                    </span>
                    <span className="text-xl sm:text-2xl font-medium text-[#bbc7c6] font-mono">
                      / {maxScore} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[6px] text-xs font-mono surface-card text-[#edfffe] border border-white/10">
                      <Percent className="w-3 h-3 text-[#00827c]" />
                      {percentage}%
                    </span>

                    {status === 'disqualified' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[6px] text-xs font-mono surface-card border border-rose-500/40 text-rose-300">
                        <ShieldAlert className="w-3 h-3" />
                        Anulado (0 pts)
                      </span>
                    ) : isApproved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[6px] text-xs font-mono surface-card border border-emerald-500/40 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Aprobado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[6px] text-xs font-mono surface-card border border-rose-500/40 text-rose-300">
                        <XCircle className="w-3 h-3" />
                        No Aprobado
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full surface-card h-2 rounded-[6px] mt-5 overflow-hidden border border-white/8">
                    <div
                      className={`h-full transition-all duration-1000 ease-out rounded-[6px] ${
                        status === 'disqualified'
                          ? 'bg-rose-500 w-0'
                          : isApproved
                          ? 'bg-gradient-to-r from-[#00827c] to-[#edfffe]'
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: status === 'disqualified' ? '0%' : `${Math.min(100, Math.max(0, percentage))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Questions breakdown / summary */}
            <div className="p-4 rounded-[6px] surface-deep border border-white/8 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <span className="text-[#bbc7c6]">Preguntas Respondidas:</span>
                <span className="font-mono text-white">
                  {Object.keys(searchedSubmission?.answers || {}).length} de {searchedExam?.questions.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <span className="text-[#bbc7c6]">Infracciones Anti-trampa:</span>
                <span className={`font-mono ${
                  (searchedSubmission?.violationCount || 0) === 0 ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  {searchedSubmission?.violationCount || 0} / {searchedExam?.maxViolations || 3}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 text-[#bbc7c6]">
                  <FileCheck className="w-3.5 h-3.5 text-[#00827c]" />
                  Estado de Certificación:
                </span>
                <span className="text-emerald-300 font-mono">
                  {status === 'submitted' ? 'Entrega Registrada ✓' : status === 'timed_out' ? 'Tiempo Expirado' : 'Descalificado'}
                </span>
              </div>
            </div>

            {/* Feedback Pedagógico Detallado de Preguntas Abiertas */}
            {hasOpenScores && (
              <div className="p-5 rounded-[12px] surface-deep border border-[#00827c]/40 text-left space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/8">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-white">
                    Retroalimentación Pedagógica de Preguntas Abiertas
                  </h3>
                </div>

                <div className="space-y-4">
                  {Object.entries(searchedSubmission!.openQuestionScores!).map(([qId, grade]) => {
                    const question = searchedExam?.questions.find(q => q.id === qId);
                    const studentAns = searchedSubmission?.answers?.[qId] || '(Sin respuesta)';

                    return (
                      <div key={qId} className="p-3.5 rounded-[8px] surface-card border border-white/8 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-medium text-white">
                            {question?.prompt || `Pregunta ${qId}`}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-[4px] surface-deep text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            {grade.score} / {grade.maxPoints} pts
                          </span>
                        </div>

                        <div className="text-[11px] text-[#bbc7c6] p-2.5 rounded-[6px] surface-deep italic border-l-2 border-[#00827c]">
                          &quot;{studentAns}&quot;
                        </div>

                        {(grade.feedback || grade.rationale) && (
                          <div className="text-xs text-[#edfffe] leading-relaxed space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-[#00827c] block">
                              Justificación Pedagógica:
                            </span>
                            <p>{grade.feedback || grade.rationale}</p>
                          </div>
                        )}

                        {grade.strengths && grade.strengths.length > 0 && (
                          <div className="text-[11px] space-y-1">
                            <span className="font-semibold text-emerald-300">Puntos Fuertes Identificados:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-[#bbc7c6]">
                              {grade.strengths.map((str, idx) => (
                                <li key={idx}>{str}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {grade.improvements && grade.improvements.length > 0 && (
                          <div className="text-[11px] space-y-1">
                            <span className="font-semibold text-amber-300">Oportunidades de Mejora:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-[#bbc7c6]">
                              {grade.improvements.map((imp, idx) => (
                                <li key={idx}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 py-3 px-4 rounded-[6px] surface-deep hover:bg-[#025a53] text-[#edfffe] border border-white/10 text-xs font-medium uppercase tracking-wider inline-flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>Consultar Otra Calificación</span>
              </button>
              <Link
                to="/"
                className="flex-1 py-3 px-4 rounded-[6px] btn-bioluminescent text-white text-xs font-medium uppercase tracking-wider inline-flex items-center justify-center gap-2 transition"
              >
                <Home className="w-4 h-4" />
                <span>Volver al Inicio</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
