import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { shuffleWithSeed } from '../utils/shuffle';
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
          user.studentCode || '',
          fetchedExam.questions?.map(q => q.id) || [],
          fetchedExam.randomizeQuestions !== false
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

    const nextAnswers = {
      ...answers,
      [questionId]: optionId,
    };
    setAnswers(nextAnswers);

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

  // Order questions according to this student's persistent randomized sequence
  const orderedQuestions = useMemo(() => {
    if (!exam?.questions) return [];
    if (!submission?.questionOrder || submission.questionOrder.length === 0) {
      return exam.questions;
    }
    const qMap = new Map(exam.questions.map(q => [q.id, q]));
    const result: typeof exam.questions = [];
    for (const qId of submission.questionOrder) {
      const q = qMap.get(qId);
      if (q) {
        result.push(q);
        qMap.delete(qId);
      }
    }
    for (const remaining of qMap.values()) {
      result.push(remaining);
    }
    return result;
  }, [exam?.questions, submission?.questionOrder]);

  const currentQ = orderedQuestions[currentQuestionIndex];
  const totalQuestions = orderedQuestions.length;
  const answeredCount = Object.keys(answers).length;

  // Memoize deterministic option shuffle per student and question
  const currentOptions = useMemo(() => {
    if (!currentQ || !currentQ.options) return [];
    if (!user?.uid) return currentQ.options;
    return shuffleWithSeed(currentQ.options, `${user.uid}-${currentQ.id}`);
  }, [currentQ, user?.uid]);

  if (loading || !exam || !submission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#012624] p-4 text-white">
        <div className="w-10 h-10 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-[#bbc7c6] uppercase tracking-wider font-mono">
          Sincronizando evaluación con la terminal...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#012624] text-white select-none">
      {/* Top Banner: Distraction-Free Exam Header */}
      <header className="sticky top-0 z-30 border-b border-white/8 surface-deep px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Exam Title & Student Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[6px] bg-[#003734] border border-white/10 text-[#edfffe] flex items-center justify-center font-mono font-medium text-xs shrink-0">
              {currentQuestionIndex + 1}/{totalQuestions}
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-medium text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs md:max-w-md">
                {exam.title}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[#bbc7c6] truncate hidden xs:block font-mono">
                {user?.displayName} {user?.studentCode ? `• ${user.studentCode}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Synced Server Timer */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border font-mono text-xs sm:text-sm font-medium transition ${
                isCriticalTime
                  ? 'surface-card border-rose-500/50 text-rose-300 animate-pulse'
                  : isLowTime
                  ? 'surface-card border-amber-500/50 text-amber-300'
                  : 'surface-card border-white/10 text-[#edfffe]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00827c]" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Right Actions: Anti-cheat Badge & Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Violations Strike Meter: Desktop */}
            <div
              title="Monitoreo activo anti-trampa"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium border ${
                violationCount === 0
                  ? 'surface-card border-white/8 text-[#bbc7c6]'
                  : violationCount < exam.maxViolations
                  ? 'surface-card border-amber-500/40 text-amber-300'
                  : 'surface-card border-rose-500/40 text-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#00827c]" />
              <span className="font-mono text-[11px]">
                {violationCount}/{exam.maxViolations} Infracciones
              </span>
            </div>

            {/* Violations Badge: Mobile */}
            {violationCount > 0 && (
              <div
                title={`${violationCount} infracciones`}
                className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-mono font-medium surface-card border border-amber-500/40 text-amber-300"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>{violationCount}</span>
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              title={fullscreenActive ? "Salir de Pantalla Completa" : "Pantalla Completa"}
              className="hidden md:inline-flex p-2 rounded-[6px] surface-card border border-white/8 text-[#bbc7c6] hover:text-white transition"
            >
              {fullscreenActive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-bioluminescent rounded-[6px] px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Finalizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile/Tablet Quick Navigator Strip (Visible below lg) */}
      <div className="lg:hidden sticky top-[53px] sm:top-[61px] z-20 surface-deep border-b border-white/8 px-3 py-2">
        <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] text-[#bbc7c6]">
          <span className="font-medium text-white uppercase tracking-wider text-[10px]">Navegador:</span>
          <span className="font-mono text-[10px]">
            {answeredCount}/{totalQuestions} respondidas
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          {orderedQuestions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const isAnswered = Boolean(answers[q.id]);

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`min-w-[34px] h-[34px] rounded-[6px] font-mono text-xs font-medium shrink-0 flex items-center justify-center transition border ${
                  isCurrent
                    ? 'border-[#edfffe] bg-[#00827c] text-white'
                    : isAnswered
                    ? 'border-[#00827c]/40 bg-[#003734] text-[#edfffe]'
                    : 'border-white/8 surface-card text-[#bbc7c6]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Examination Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 animate-fadeIn">
        {/* Left Column: Active Question Container */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          <div className="surface-card rounded-[16px] border border-white/8 p-6 sm:p-8 space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-[6px] surface-deep border border-white/10 text-[#edfffe]">
                  Pregunta {currentQuestionIndex + 1} de {totalQuestions}
                </span>
                <span className="text-xs text-[#bbc7c6]">
                  • {currentQ.points} {currentQ.points === 1 ? 'punto' : 'puntos'}
                </span>
              </div>

              {savingAnswer && (
                <span className="text-[11px] font-mono text-[#edfffe] animate-pulse">
                  Guardando en vivo...
                </span>
              )}
            </div>

            {/* Prompt */}
            <div>
              <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                {currentQ.prompt}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentOptions.map((option, idx) => {
                const isSelected = answers[currentQ.id] === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, option.id)}
                    className={`w-full text-left p-4 rounded-[6px] border transition flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-[#003734] border-[#00827c] text-white'
                        : 'surface-deep border-white/8 hover:bg-[#003734]/50 hover:border-white/15 text-[#bbc7c6]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected
                          ? 'border-[#00827c] bg-[#00827c] text-white'
                          : 'border-white/20'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-[2px] bg-white"></span>}
                    </span>

                    <div className="flex-1">
                      <span className="text-xs font-mono mr-2 text-[#bbc7c6]">
                        {String.fromCharCode(65 + idx)})
                      </span>
                      <span className={`text-xs sm:text-sm ${isSelected ? 'text-white font-medium' : 'text-[#bbc7c6]'}`}>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] surface-card border border-white/8 text-[#bbc7c6] hover:text-white hover:bg-[#025a53] text-xs font-medium uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs text-[#bbc7c6] font-mono">
              {answeredCount} de {totalQuestions} respondidas
            </span>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="btn-bioluminescent rounded-[6px] px-4 py-2 text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn-aurora rounded-[6px] px-4 py-2 text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 text-white"
              >
                <span>Revisar y Entregar</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Navigator Palette (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="surface-card rounded-[16px] border border-white/8 p-5 sticky top-20">
            <h3 className="text-[10px] font-medium text-[#bbc7c6] uppercase tracking-[0.1em] mb-4">
              Mapa de Preguntas
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {orderedQuestions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = Boolean(answers[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 rounded-[6px] font-mono text-xs font-medium flex items-center justify-center transition border ${
                      isCurrent
                        ? 'border-[#edfffe] bg-[#00827c] text-white'
                        : isAnswered
                        ? 'border-[#00827c]/40 bg-[#003734] text-[#edfffe]'
                        : 'border-white/8 surface-deep text-[#bbc7c6] hover:bg-[#003734] hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-white/8 space-y-2 text-[11px] text-[#bbc7c6]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[3px] bg-[#003734] border border-[#00827c]/40"></span>
                <span>Respondida ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[3px] surface-deep border border-white/8"></span>
                <span>Pendiente ({totalQuestions - answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[3px] bg-[#00827c] border border-[#edfffe]"></span>
                <span>Pregunta Actual</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Cheat Warning Modal */}
      {activeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="surface-card max-w-md w-full p-6 rounded-[16px] border border-amber-500/50 text-center space-y-4">
            <div className="w-14 h-14 rounded-[6px] surface-deep border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-medium text-white">
              ¡Alerta de Integridad Detectada!
            </h3>

            <p className="text-xs text-[#bbc7c6] leading-relaxed">
              {activeWarning.message}
            </p>

            <div className="p-3 rounded-[6px] surface-deep border border-white/8 text-[11px] text-amber-300 font-mono">
              Infracciones acumuladas: {activeWarning.violationNumber} / {activeWarning.maxViolations}
            </div>

            <button
              type="button"
              onClick={dismissWarning}
              className="w-full py-2.5 px-4 rounded-[6px] bg-amber-600 hover:bg-amber-500 text-white font-medium uppercase tracking-wider text-xs transition"
            >
              He entendido, regresar a mi prueba
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="surface-card max-w-md w-full p-6 rounded-[16px] border border-white/10 space-y-4">
            <h3 className="text-base font-medium text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00827c]" />
              <span>¿Confirmas la entrega de tu evaluación?</span>
            </h3>

            <p className="text-xs text-[#bbc7c6] leading-relaxed">
              Has respondido <strong className="text-white font-mono">{answeredCount}</strong> de <strong className="text-white font-mono">{totalQuestions}</strong> preguntas.
              {answeredCount < totalQuestions && (
                <span className="block text-amber-300 mt-2 p-2 rounded-[6px] surface-deep border border-amber-500/30">
                  ⚠️ Atención: Tienes {totalQuestions - answeredCount} preguntas sin contestar.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-[6px] text-[#bbc7c6] hover:text-white hover:bg-[#025a53] transition"
              >
                Continuar respondiendo
              </button>
              <button
                type="button"
                disabled={isSubmittingFinal}
                onClick={handleConfirmSubmit}
                className="btn-bioluminescent rounded-[6px] px-4 py-2 text-xs font-medium uppercase tracking-wider transition disabled:opacity-50"
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