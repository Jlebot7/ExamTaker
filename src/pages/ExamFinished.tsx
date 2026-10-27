import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Home,
  Award,
  ShieldAlert,
  Percent,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam, Submission } from '../types';

export const ExamFinished: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId || !user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        let [examData, subData] = await Promise.all([
          examService.getExam(examId),
          studentService.getSubmission(examId, user.uid)
        ]);

        // If the teacher has reset this student's submission or entire exam, redirect to take it
        if (!subData || subData.status === 'in_progress') {
          navigate(`/exam/${examId}`, { replace: true });
          return;
        }

        // If score was not yet computed for a finished exam, trigger grading calculation
        if (subData.finalScore === null) {
          try {
            subData = await studentService.submitExam(examId, user.uid, subData.status);
          } catch (evalErr) {
            console.warn('Error re-calculating grade:', evalErr);
          }
        }

        setExam(examData);
        setSubmission(subData);

        // Celebration confetti if passed
        const earned = subData?.finalScore ?? 0;
        const total = subData?.maxScore || examData?.totalPoints || 1;
        const ratio = earned / total;

        if (subData.status === 'submitted' && ratio >= 0.6) {
          confetti({
            particleCount: ratio >= 0.8 ? 100 : 60,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00827c', '#edfffe', '#fde9ff', '#025a53']
          });
        }
      } catch (err) {
        console.error('Error al cargar resultado final:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [examId, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#012624] text-white">
        <div className="w-8 h-8 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const status = submission?.status || 'submitted';
  const finalScore = submission?.finalScore ?? null;
  const maxScore = submission?.maxScore || exam?.totalPoints || 0;
  const percentage = maxScore > 0 && finalScore !== null 
    ? Math.round((finalScore / maxScore) * 100) 
    : 0;
  const isApproved = status !== 'disqualified' && percentage >= 60;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-xl">
        <div className="surface-card rounded-[16px] p-6 sm:p-8 border border-white/8 relative text-center">
          {/* Status Header Icon and Title */}
          {status === 'submitted' && (
            <div className="mb-6">
              <div className="w-14 h-14 rounded-[6px] surface-deep border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-medium text-white">¡Evaluación Entregada con Éxito!</h1>
              <p className="text-xs text-[#bbc7c6] mt-1">
                Tus respuestas han sido evaluadas y registradas de forma segura.
              </p>
            </div>
          )}

          {status === 'timed_out' && (
            <div className="mb-6">
              <div className="w-14 h-14 rounded-[6px] surface-deep border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-medium text-white">Tiempo de Evaluación Finalizado</h1>
              <p className="text-xs text-[#bbc7c6] mt-1">
                El tiempo sincronizado expiró. Tus respuestas fueron evaluadas automáticamente.
              </p>
            </div>
          )}

          {status === 'disqualified' && (
            <div className="mb-6">
              <div className="w-14 h-14 rounded-[6px] surface-deep border border-rose-500/40 text-rose-300 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-medium text-rose-300">Evaluación Descalificada</h1>
              <p className="text-xs text-[#bbc7c6] mt-1">
                El examen fue anulado de forma automática por exceder el límite de infracciones anti-trampa.
              </p>
            </div>
          )}

          {/* Calificación Final Destacada */}
          {finalScore !== null && (
            <div className="mb-6 p-6 rounded-[16px] surface-deep border border-white/10 relative overflow-hidden">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <Award className={`w-4 h-4 ${isApproved ? 'text-[#edfffe]' : 'text-[#bbc7c6]'}`} />
                  <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[#bbc7c6]">
                    Calificación Final
                  </span>
                </div>

                {/* Score Number Display */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl sm:text-6xl font-medium tracking-tight text-[#fde9ff] font-mono">
                    {finalScore}
                  </span>
                  <span className="text-xl sm:text-2xl font-medium text-[#bbc7c6] font-mono">
                    / {maxScore} pts
                  </span>
                </div>

                {/* Percentage & Approval Badge */}
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

          {/* Details Card */}
          <div className="p-4 rounded-[6px] surface-deep border border-white/8 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/8">
              <span className="text-[#bbc7c6]">Evaluación:</span>
              <span className="font-medium text-white text-right truncate max-w-[220px]">
                {exam?.title}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/8">
              <span className="text-[#bbc7c6]">Estudiante:</span>
              <span className="font-medium text-white">
                {submission?.studentName} ({submission?.studentCode})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/8">
              <span className="text-[#bbc7c6]">Preguntas Respondidas:</span>
              <span className="font-mono font-medium text-white">
                {Object.keys(submission?.answers || {}).length} de {exam?.questions.length || 0}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/8">
              <span className="text-[#bbc7c6]">Infracciones Anti-trampa:</span>
              <span className={`font-mono font-medium ${
                (submission?.violationCount || 0) === 0 ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {submission?.violationCount || 0} / {exam?.maxViolations || 3}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-[#edfffe]">
              <span className="flex items-center gap-1.5 text-[#bbc7c6]">
                <FileCheck className="w-3.5 h-3.5 text-[#00827c]" />
                Estado en la Nube:
              </span>
              <span className="font-mono font-medium text-[#edfffe]">
                Guardado e Inmutable ✓
              </span>
            </div>
          </div>

          {/* Return & Re-entry buttons */}
          <div className="flex flex-col gap-2.5">
            <Link
              to={`/student?code=${examId}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-[6px] surface-deep hover:bg-[#025a53] text-[#edfffe] hover:text-white border border-white/10 text-xs font-medium uppercase tracking-wider transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Volver a ingresar a la evaluación (si fue reiniciada)</span>
            </Link>

            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-[6px] btn-bioluminescent text-xs font-medium uppercase tracking-wider text-white transition"
            >
              <Home className="w-4 h-4" />
              <span>Volver a la Página Principal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};