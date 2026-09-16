import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Home,
  Award,
  ShieldAlert,
  Percent,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam, Submission } from '../types';

export const ExamFinished: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();

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
          studentService.startOrGetSubmission(examId, user.uid, user.displayName || '', user.studentCode || '')
        ]);

        // If score was not yet computed for a finished exam, trigger grading calculation
        if (subData && subData.finalScore === null && subData.status !== 'in_progress') {
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
            colors: ['#6366f1', '#a855f7', '#10b981', '#38bdf8', '#fbbf24']
          });
        }
      } catch (err) {
        console.error('Error al cargar resultado final:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [examId, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl">
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Status Header Icon and Title */}
          {status === 'submitted' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">¡Evaluación Entregada con Éxito!</h1>
              <p className="text-xs text-slate-400 mt-1">
                Tus respuestas han sido evaluadas y registradas en Cloud Firestore.
              </p>
            </div>
          )}

          {status === 'timed_out' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">Tiempo de Evaluación Finalizado</h1>
              <p className="text-xs text-slate-400 mt-1">
                El tiempo sincronizado expiró. Tus respuestas fueron evaluadas y registradas automáticamente.
              </p>
            </div>
          )}

          {status === 'disqualified' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-rose-400">Evaluación Descalificada</h1>
              <p className="text-xs text-slate-400 mt-1">
                El examen fue anulado de forma automática por exceder el límite de infracciones anti-trampa.
              </p>
            </div>
          )}

          {/* Calificación Final Destacada */}
          {finalScore !== null && (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/70 to-indigo-950/40 border border-indigo-500/30 shadow-xl relative overflow-hidden">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <Award className={`w-5 h-5 ${isApproved ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
                    Calificación Final
                  </span>
                </div>

                {/* Score Number Display */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                    {finalScore}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-400 font-mono">
                    / {maxScore} pts
                  </span>
                </div>

                {/* Percentage & Approval Badge */}
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                    <Percent className="w-3 h-3" />
                    {percentage}%
                  </span>

                  {status === 'disqualified' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-400">
                      <ShieldAlert className="w-3 h-3" />
                      Anulado (0 pts)
                    </span>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-400">
                      <XCircle className="w-3 h-3" />
                      No Aprobado
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-700/60">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${
                      status === 'disqualified'
                        ? 'bg-rose-500 w-0'
                        : isApproved
                        ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                    }`}
                    style={{ width: status === 'disqualified' ? '0%' : `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Evaluación:</span>
              <span className="font-bold text-slate-200 text-right truncate max-w-[220px]">
                {exam?.title}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Estudiante:</span>
              <span className="font-semibold text-slate-200">
                {submission?.studentName} ({submission?.studentCode})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Preguntas Respondidas:</span>
              <span className="font-mono font-bold text-slate-200">
                {Object.keys(submission?.answers || {}).length} de {exam?.questions.length || 0}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Infracciones Anti-trampa:</span>
              <span className={`font-mono font-bold ${
                (submission?.violationCount || 0) === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {submission?.violationCount || 0} / {exam?.maxViolations || 3}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-emerald-400">
              <span className="flex items-center gap-1.5 text-slate-400">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Estado en la Nube:
              </span>
              <span className="font-mono font-bold">
                Guardado en Firestore ✓
              </span>
            </div>
          </div>

          {/* Return button */}
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 text-xs font-semibold transition"
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
