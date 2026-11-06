import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  User, 
  Award, 
  AlertCircle, 
  BookOpen, 
  CheckCircle2, 
  Lightbulb, 
  TrendingUp, 
  RefreshCw 
} from 'lucide-react';
import type { Exam, ExamKey, Submission, OpenQuestionGrade } from '../../types';
import { evaluateOpenAnswerWithAi } from '../../services/aiExamService';

interface StudentGradingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  examKey: ExamKey;
  submission: Submission;
  onSaveGrading: (
    studentUid: string, 
    openQuestionScores: Record<string, OpenQuestionGrade>
  ) => Promise<void>;
}

export const StudentGradingReviewModal: React.FC<StudentGradingReviewModalProps> = ({
  isOpen,
  onClose,
  exam,
  examKey,
  submission,
  onSaveGrading,
}) => {
  if (!isOpen) return null;

  // Filter only open-ended questions
  const openQuestions = exam.questions.filter(q => q.type === 'open_ended');

  // Local state for open question grades and feedback
  const [grades, setGrades] = useState<Record<string, OpenQuestionGrade>>(() => {
    const initial: Record<string, OpenQuestionGrade> = {};
    openQuestions.forEach(q => {
      const existing = submission.openQuestionScores?.[q.id];
      if (existing) {
        initial[q.id] = { ...existing };
      } else {
        initial[q.id] = {
          points: 0,
          feedback: '',
        };
      }
    });
    return initial;
  });

  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [isBatchEvaluating, setIsBatchEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-calculated score from closed questions
  const closedEarnedPoints = React.useMemo(() => {
    let earned = 0;
    exam.questions.forEach(q => {
      if (q.type !== 'open_ended') {
        const keyData = examKey.keys[q.id];
        if (!keyData) return;
        const studentAns = submission.answers?.[q.id];
        if (Array.isArray(studentAns)) {
          if (
            studentAns.length === keyData.correctOptionIds.length &&
            studentAns.every(id => keyData.correctOptionIds.includes(id))
          ) {
            earned += keyData.points;
          }
        } else if (typeof studentAns === 'string') {
          if (keyData.correctOptionIds.includes(studentAns)) {
            earned += keyData.points;
          }
        }
      }
    });
    return earned;
  }, [exam.questions, examKey.keys, submission.answers]);

  // Total current score including open questions
  const totalOpenPoints = Object.values(grades).reduce((sum, g) => sum + (Number(g.points) || 0), 0);
  const currentTotalScore = submission.status === 'disqualified' ? 0 : closedEarnedPoints + totalOpenPoints;
  const maxScore = exam.totalPoints;

  // Evaluate a single open question using Groq (openai/gpt-oss-120b)
  const handleEvaluateQuestion = async (questionId: string) => {
    const q = openQuestions.find(item => item.id === questionId);
    if (!q) return;

    const keyData = examKey.keys[questionId];
    const studentText = (submission.answers?.[questionId] as string) || '';

    setAiLoading(prev => ({ ...prev, [questionId]: true }));
    setErrorMessage(null);

    try {
      const result = await evaluateOpenAnswerWithAi({
        questionPrompt: q.prompt,
        maxPoints: q.points,
        rubric: keyData?.rubric,
        idealAnswer: keyData?.idealAnswer,
        studentAnswer: studentText,
      });

      setGrades(prev => ({
        ...prev,
        [questionId]: {
          points: result.suggestedPoints,
          feedback: result.rationale,
          aiSuggestedPoints: result.suggestedPoints,
          aiRationale: result.rationale,
          strengths: result.strengths,
          improvements: result.improvements,
          gradedAt: Date.now(),
        },
      }));
    } catch (err: unknown) {
      console.error('Error al evaluar con IA:', err);
      const msg = err instanceof Error ? err.message : 'Error al conectar con la IA de Groq';
      setErrorMessage(msg);
    } finally {
      setAiLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Batch evaluate all open questions
  const handleBatchEvaluateAll = async () => {
    setIsBatchEvaluating(true);
    setErrorMessage(null);

    for (const q of openQuestions) {
      try {
        await handleEvaluateQuestion(q.id);
      } catch (e) {
        console.warn(`Error en evaluación batch de pregunta ${q.id}:`, e);
      }
    }

    setIsBatchEvaluating(false);
  };

  // Apply AI suggestion to teacher score and feedback
  const handleApplyAiSuggestion = (questionId: string) => {
    const g = grades[questionId];
    if (!g || g.aiSuggestedPoints === undefined) return;

    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: g.aiSuggestedPoints ?? prev[questionId].points,
        feedback: g.aiRationale || prev[questionId].feedback,
      },
    }));
  };

  const handleUpdatePoints = (questionId: string, val: number, max: number) => {
    const clamped = Math.min(max, Math.max(0, val));
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: clamped,
      },
    }));
  };

  const handleUpdateFeedback = (questionId: string, feedback: string) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSaveGrading(submission.studentUid, grades);
      onClose();
    } catch (err: unknown) {
      console.error('Error al guardar calificaciones:', err);
      const msg = err instanceof Error ? err.message : 'Error al guardar la calificación';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="surface-card max-w-4xl w-full max-h-[92vh] rounded-[16px] border border-white/10 flex flex-col overflow-hidden shadow-none">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 surface-deep">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[6px] bg-[#003734] border border-[#00827c]/40 text-[#cbfffc] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-medium text-white truncate">
                  {submission.studentName}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#011d1c] border border-white/10 text-[#edfffe]">
                  DNI: {submission.studentCode}
                </span>
                {submission.status === 'disqualified' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-rose-500/20 border border-rose-500/40 text-rose-300">
                    Descalificado
                  </span>
                )}
              </div>
              <p className="text-xs text-[#bbc7c6] mt-0.5 truncate">
                Evaluación: {exam.title} • {openQuestions.length} {openQuestions.length === 1 ? 'pregunta abierta' : 'preguntas abiertas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Score pill preview */}
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-[#bbc7c6] block font-mono">
                Puntaje Total Proyectado:
              </span>
              <span className="text-sm sm:text-base font-medium text-[#fde9ff] font-mono">
                {currentTotalScore} / {maxScore} pts
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-[6px] text-[#bbc7c6] hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/8 bg-[#011d1c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#bbc7c6]">
            <Award className="w-4 h-4 text-[#00827c]" />
            <span>
              Cerradas auto-calificadas: <strong className="text-white font-mono">{closedEarnedPoints} pts</strong> • Abiertas asignadas: <strong className="text-[#cbfffc] font-mono">{totalOpenPoints} pts</strong>
            </span>
          </div>

          <button
            type="button"
            disabled={isBatchEvaluating}
            onClick={handleBatchEvaluateAll}
            className="btn-bioluminescent rounded-[6px] px-3.5 py-1.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {isBatchEvaluating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluando con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Evaluar Todas con IA (GPT-OSS 120B)</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body (Scrollable List of Open Questions) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {openQuestions.length === 0 ? (
            <div className="p-8 text-center text-[#bbc7c6] text-xs">
              Este examen no contiene preguntas de tipo abierto o desarrollo.
            </div>
          ) : (
            openQuestions.map((q, idx) => {
              const keyData = examKey.keys[q.id];
              const studentAnswer = (submission.answers?.[q.id] as string) || '';
              const currentGrade = grades[q.id] || { points: 0, feedback: '' };
              const isLoadingThis = aiLoading[q.id] || false;
              const hasAiResult = currentGrade.aiSuggestedPoints !== undefined;

              return (
                <div
                  key={q.id}
                  className="surface-deep rounded-[12px] border border-white/10 p-5 space-y-4"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/8 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-[4px] bg-[#003734] text-[#cbfffc] font-mono text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-xs uppercase tracking-wider font-medium text-[#edfffe]">
                        Pregunta Abierta #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-[4px] bg-[#011d1c] text-[#fde9ff] border border-white/8">
                        Máx. {q.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <h3 className="text-xs text-[#bbc7c6] uppercase tracking-wider mb-1 font-mono">Consigna:</h3>
                    <p className="text-sm font-medium text-white leading-relaxed">
                      {q.prompt}
                    </p>
                  </div>

                  {/* Teacher Rubric & Model Answer */}
                  {(keyData?.rubric || keyData?.idealAnswer) && (
                    <div className="p-3.5 rounded-[8px] bg-[#003734]/30 border border-[#00827c]/30 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#cbfffc] font-medium font-mono text-[11px] uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Criterios del Docente (Clave Secreta):</span>
                      </div>
                      {keyData.rubric && (
                        <p className="text-[#edfffe] leading-relaxed">
                          <strong>Rúbrica:</strong> {keyData.rubric}
                        </p>
                      )}
                      {keyData.idealAnswer && (
                        <p className="text-[#bbc7c6] leading-relaxed">
                          <strong>Respuesta de referencia:</strong> {keyData.idealAnswer}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Student Written Response */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#bbc7c6] uppercase tracking-wider font-mono">
                        Respuesta del Estudiante:
                      </span>
                      <span className="text-[11px] font-mono text-[#bbc7c6]">
                        {studentAnswer.trim() ? `${studentAnswer.length} caracteres` : 'Sin respuesta'}
                      </span>
                    </div>
                    <div className="p-4 rounded-[8px] bg-[#011d1c] border border-white/10 text-xs sm:text-sm text-white leading-relaxed whitespace-pre-wrap font-sans">
                      {studentAnswer.trim() ? (
                        studentAnswer
                      ) : (
                        <span className="text-[#707777] italic">
                          El alumno no redactó ninguna respuesta para esta pregunta.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Evaluation Section */}
                  <div className="pt-2 border-t border-white/8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <span className="text-xs uppercase tracking-wider font-medium text-[#edfffe] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
                        <span>Asistente de Evaluación IA (Groq: openai/gpt-oss-120b)</span>
                      </span>

                      <button
                        type="button"
                        disabled={isLoadingThis || !studentAnswer.trim()}
                        onClick={() => handleEvaluateQuestion(q.id)}
                        className="btn-aurora px-3 py-1.5 rounded-[6px] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {isLoadingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Analizando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{hasAiResult ? 'Re-analizar con IA' : 'Sugerir Nota con IA'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Results Card */}
                    {hasAiResult && (
                      <div className="p-4 rounded-[10px] bg-[#003734]/40 border border-[#00827c]/40 space-y-3 animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/8">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#bbc7c6]">Sugerencia IA:</span>
                            <span className="px-2.5 py-1 rounded-[6px] bg-[#011d1c] border border-[#cbfffc]/40 text-[#cbfffc] font-mono font-medium text-xs">
                              {currentGrade.aiSuggestedPoints} / {q.points} pts
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyAiSuggestion(q.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase text-[#cbfffc] hover:underline"
                          >
                            <Check className="w-3 h-3" />
                            <span>Aplicar Sugerencia de la IA</span>
                          </button>
                        </div>

                        {currentGrade.aiRationale && (
                          <p className="text-xs text-[#edfffe] leading-relaxed">
                            <strong>Justificación pedagógica:</strong> {currentGrade.aiRationale}
                          </p>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                          {currentGrade.strengths && currentGrade.strengths.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-emerald-300 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Puntos fuertes detectados:
                              </span>
                              <ul className="list-disc list-inside text-[#bbc7c6] space-y-0.5">
                                {currentGrade.strengths.map((s, sIdx) => (
                                  <li key={sIdx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {currentGrade.improvements && currentGrade.improvements.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-amber-300 font-medium flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Puntos a reforzar:
                              </span>
                              <ul className="list-disc list-inside text-[#bbc7c6] space-y-0.5">
                                {currentGrade.improvements.map((imp, iIdx) => (
                                  <li key={iIdx}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Teacher Decision Controls */}
                  <div className="p-4 rounded-[10px] bg-[#011d1c] border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-white">
                          Puntaje Final Asignado por el Docente:
                        </label>
                        <span className="text-[11px] text-[#bbc7c6]">
                          Puedes validar la sugerencia de la IA o asignar el valor que consideres justo.
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={q.points}
                          value={currentGrade.points}
                          onChange={e => handleUpdatePoints(q.id, Number(e.target.value), q.points)}
                          className="w-20 bg-[#003734] border border-white/20 focus:border-[#cbfffc] rounded-[6px] px-3 py-1.5 text-center font-mono font-medium text-sm text-[#fde9ff] outline-none"
                        />
                        <span className="text-xs font-mono text-[#bbc7c6]">/ {q.points} pts</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#edfffe] mb-1">
                        Retroalimentación para el Estudiante:
                      </label>
                      <textarea
                        rows={2}
                        value={currentGrade.feedback || ''}
                        onChange={e => handleUpdateFeedback(q.id, e.target.value)}
                        placeholder="Escribe comentarios, felicitaciones o recomendaciones que el alumno verá en su tablero de resultados..."
                        className="w-full bg-[#003734]/30 border border-white/10 focus:border-[#cbfffc] rounded-[6px] p-2.5 text-xs text-white placeholder-[#707777] outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 surface-deep flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#bbc7c6]">Nota Final Resultante:</span>
            <span className="text-lg font-medium font-mono text-[#fde9ff]">
              {currentTotalScore} / {maxScore} pts ({maxScore > 0 ? Math.round((currentTotalScore / maxScore) * 100) : 0}%)
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[6px] text-xs font-medium uppercase tracking-wider text-[#bbc7c6] hover:text-white transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="btn-bioluminescent px-5 py-2.5 rounded-[6px] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar y Publicar Calificación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
