import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Home
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
        const [examData, subData] = await Promise.all([
          examService.getExam(examId),
          studentService.startOrGetSubmission(examId, user.uid, user.displayName || '', user.studentCode || '')
        ]);

        setExam(examData);
        setSubmission(subData);

        // If submitted normally, launch celebratory confetti
        if (subData.status === 'submitted') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#a855f7', '#10b981', '#38bdf8']
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Status Header Icon and Title */}
          {status === 'submitted' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">¡Evaluación Entregada con Éxito!</h1>
              <p className="text-xs text-slate-400 mt-1">
                Tus respuestas han sido recibidas y almacenadas de forma segura en la base de datos.
              </p>
            </div>
          )}

          {status === 'timed_out' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">Tiempo de Evaluación Finalizado</h1>
              <p className="text-xs text-slate-400 mt-1">
                El tiempo sincronizado con el servidor expiró. Las respuestas seleccionadas hasta ese momento fueron enviadas automáticamente.
              </p>
            </div>
          )}

          {status === 'disqualified' && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-rose-400">Evaluación Descalificada</h1>
              <p className="text-xs text-slate-400 mt-1">
                El examen fue anulado de forma automática por exceder el número máximo de infracciones de integridad detectadas por el sistema anti-trampa.
              </p>
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Evaluación:</span>
              <span className="font-bold text-slate-200 text-right truncate max-w-[200px]">
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
              <span className="text-slate-400">Infracciones Registradas:</span>
              <span className={`font-mono font-bold ${
                (submission?.violationCount || 0) === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {submission?.violationCount || 0} / {exam?.maxViolations || 3}
              </span>
            </div>

            {submission?.finalScore !== null && (
              <div className="flex items-center justify-between text-xs pt-1 text-indigo-300 font-bold">
                <span>Puntaje Obtenido:</span>
                <span className="text-sm font-mono bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                  {submission?.finalScore} / {submission?.maxScore || exam?.totalPoints} pts
                </span>
              </div>
            )}
          </div>

          {/* Return button */}
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold transition"
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
