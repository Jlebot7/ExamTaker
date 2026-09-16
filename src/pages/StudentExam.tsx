import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  AlertTriangle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import { useServerTimer } from '../hooks/useServerTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import type { Exam, Submission } from '../types';

export const StudentExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  // 1. Authenticate and initialize exam submission
  useEffect(() => {
    if (!examId) return;

    if (!user || user.role !== 'student') {
      navigate(`/student?code=${examId}`, { replace: true });
      return;
    }

    const initExam = async () => {
      setLoading(true);
      try {
        const fetchedExam = await examService.getExam(examId);
        if (!fetchedExam || !fetchedExam.isPublished) {
          navigate('/student', { replace: true });
          return;
        }

        const currentSub = await studentService.startOrGetSubmission(
          examId,
          user.uid,
          user.displayName || 'Estudiante',
          user.studentCode || ''
        );

        if (currentSub.status !== 'in_progress') {
          navigate(`/exam-finished/${examId}`, { replace: true });
          return;
        }

        setExam(fetchedExam);
        setSubmission(currentSub);
        setAnswers(currentSub.answers || {});
      } catch (err) {
        console.error('Error al inicializar la sesión del examen:', err);
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [examId, user, navigate]);

  // Timeout handler: Auto submit when time runs out
  const handleTimeExpired = useCallback(async () => {
    if (!examId || !user || isSubmittingFinal) return;
    setIsSubmittingFinal(true);
    try {
      await studentService.submitExam(examId, user.uid, 'timed_out');
      navigate(`/exam-finished/${examId}`, { replace: true });
    } catch (err) {
      console.error('Error en auto-envío por tiempo:', err);
      navigate(`/exam-finished/${examId}`, { replace: true });
    }
  }, [examId, user, isSubmittingFinal, navigate]);

  // Anti-cheat Disqualification handler
  const handleDisqualified = useCallback(async () => {
    if (!examId || !user || isSubmittingFinal) return;
    setIsSubmittingFinal(true);
    try {
      await studentService.submitExam(examId, user.uid, 'disqualified');
      navigate(`/exam-finished/${examId}`, { replace: true });
    } catch (err) {
      console.error('Error en auto-envío por descalificación:', err);
      navigate(`/exam-finished/${examId}`, { replace: true });
    }
  }, [examId, user, isSubmittingFinal, navigate]);

  // Synchronized Server Timer Hook
  const { formattedTime, isLowTime, isCriticalTime } = useServerTimer({
    startedAt: submission?.startedAt || Date.now(),
    durationMinutes: exam?.durationMinutes || 15,
    onTimeExpired: handleTimeExpired,
  });

  // Anti-cheat Monitoring Hook
  const { violationCount, activeWarning, dismissWarning } = useAntiCheat({
    examId: examId || '',
    studentUid: user?.uid || '',
    maxViolations: exam?.maxViolations || 3,
    initialViolations: submission?.violationCount || 0,
    isActive: !loading && submission?.status === 'in_progress' && !isSubmittingFinal,
    onDisqualified: handleDisqualified,
  });

  // Save selected option in real time
  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (isSubmittingFinal) return;

    // Optimistic local state update
    const nextAnswers = {
      ...answers,
      [questionId]: optionId,
    };
    setAnswers(nextAnswers);

    // Persist to Firebase Realtime Database
    setSavingAnswer(true);
    try {
      if (examId && user) {
        await studentService.saveAnswer(examId, user.uid, questionId, optionId);
      }
    } catch (err) {
      console.error('Error al guardar respuesta:', err);
    } finally {
      setSavingAnswer(false);
    }
  };

  // Final manual submission by student
  const handleConfirmSubmit = async () => {
    if (!examId || !user) return;
    setIsSubmittingFinal(true);
    try {
      await studentService.submitExam(examId, user.uid, 'submitted');
      navigate(`/exam-finished/${examId}`, { replace: true });
    } catch (err) {
      console.error('Error al entregar examen:', err);
      setIsSubmittingFinal(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreenActive(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreenActive(false);
    }
  };

  if (loading || !exam || !submission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-400">Sincronizando evaluación segura con el servidor...</p>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestionIndex];
  const totalQuestions = exam.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Banner: Distraction-Free Exam Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Exam Title & Student Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
              {currentQuestionIndex + 1}/{totalQuestions}
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs md:max-w-md">
                {exam.title}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
                {user?.displayName} {user?.studentCode ? `• ${user.studentCode}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Synced Server Timer */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-bold transition ${
                isCriticalTime
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : isLowTime
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-indigo-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Right Actions: Anti-cheat Badge & Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Violations Strike Meter: Desktop */}
            <div
              title="Monitoreo activo anti-trampa"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                violationCount === 0
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : violationCount < exam.maxViolations
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">
                {violationCount} / {exam.maxViolations} Infracciones
              </span>
            </div>

            {/* Violations Badge: Mobile */}
            {violationCount > 0 && (
              <div
                title={`${violationCount} infracciones`}
                className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>{violationCount}</span>
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              title={fullscreenActive ? "Salir de Pantalla Completa" : "Pantalla Completa"}
              className="hidden md:inline-flex p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              {fullscreenActive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Finalizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile/Tablet Quick Navigator Strip (Visible below lg) */}
      <div className="lg:hidden sticky top-[53px] sm:top-[61px] z-20 bg-slate-950/95 border-b border-slate-800/80 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Navegador Rápido:</span>
          <span className="font-mono text-[10px]">
            {answeredCount}/{totalQuestions} respondidas
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          {exam.questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const isAnswered = Boolean(answers[q.id]);

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`min-w-[34px] h-[34px] rounded-lg font-mono text-xs font-bold shrink-0 flex items-center justify-center transition border ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-600 text-white ring-2 ring-indigo-400/40 scale-105'
                    : isAnswered
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Examination Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left Column: Active Question Container */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          <div className="glass-card rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                  Pregunta {currentQuestionIndex + 1} de {totalQuestions}
                </span>
                <span className="text-xs text-slate-400">
                  • {currentQ.points} {currentQ.points === 1 ? 'punto' : 'puntos'}
                </span>
              </div>

              {savingAnswer && (
                <span className="text-[11px] text-indigo-400 animate-pulse font-medium">
                  Guardando respuesta en tiempo real...
                </span>
              )}
            </div>

            {/* Prompt */}
            <div>
              <p className="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed">
                {currentQ.prompt}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((option, idx) => {
                const isSelected = answers[currentQ.id] === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, option.id)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                    </span>

                    <div className="flex-1">
                      <span className="text-xs text-slate-400 font-mono mr-2">
                        {String.fromCharCode(65 + idx)})
                      </span>
                      <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls Below Question */}
          <div className="flex items-center justify-between gap-4 mt-6">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs text-slate-500 font-mono">
              {answeredCount} de {totalQuestions} respondidas
            </span>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
              >
                <span>Revisar y Entregar</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Navigator Palette (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="glass-card rounded-2xl border border-slate-800 p-5 sticky top-20">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Mapa de Preguntas
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {exam.questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = Boolean(answers[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition border ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-500/30 text-white ring-2 ring-indigo-500/40'
                        : isAnswered
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></span>
                <span>Respondida ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800"></span>
                <span>Pendiente ({totalQuestions - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border border-indigo-500 bg-indigo-500/30"></span>
                <span>Pregunta Actual</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Cheat Warning Modal */}
      {activeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-amber-500/50 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-white">
              ¡Alerta de Integridad Detectada!
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeWarning.message}
            </p>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-amber-300 font-mono">
              Infracciones acumuladas: {activeWarning.violationNumber} / {activeWarning.maxViolations}
            </div>

            <button
              type="button"
              onClick={dismissWarning}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 transition"
            >
              He entendido, regresar a mi prueba
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>¿Confirmas la entrega de tu evaluación?</span>
            </h3>

            <p className="text-xs text-slate-400">
              Has respondido <strong className="text-white">{answeredCount}</strong> de <strong className="text-white">{totalQuestions}</strong> preguntas.
              {answeredCount < totalQuestions && (
                <span className="block text-amber-400 mt-1">
                  Atención: Tienes {totalQuestions - answeredCount} preguntas sin contestar.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Continuar respondiendo
              </button>
              <button
                type="button"
                disabled={isSubmittingFinal}
                onClick={handleConfirmSubmit}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition disabled:opacity-50"
              >
                {isSubmittingFinal ? 'Entregando...' : 'Sí, Entregar Evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
