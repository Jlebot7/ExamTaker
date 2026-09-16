import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Clock, 
  ShieldAlert, 
  Share2, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  BarChart2, 
  Eye, 
  Sparkles, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import type { Exam } from '../types';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadExams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await examService.getExamsByTeacher(user.uid);
      setExams(list);
    } catch (err) {
      setActionError('Error al cargar la lista de exámenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [user]);

  const handleCopyLink = (examId: string) => {
    const origin = window.location.origin + window.location.pathname;
    const link = `${origin}#/student?code=${examId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(examId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (examId: string) => {
    navigator.clipboard.writeText(examId);
    setCopiedId(`pin_${examId}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePublish = async (exam: Exam) => {
    try {
      await examService.updateExam(exam.id, { isPublished: !exam.isPublished });
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, isPublished: !e.isPublished } : e));
    } catch (err) {
      setActionError('Error al cambiar el estado de publicación');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await examService.deleteExam(deleteId);
      setExams(prev => prev.filter(e => e.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setActionError('Error al eliminar la evaluación');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Panel de Gestión Docente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Mis Evaluaciones
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Crea exámenes seguros, monitorea alumnos en vivo y supervisa las alertas de integridad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/exam/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Evaluación</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total de Evaluaciones</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{exams.length}</p>
          <span className="text-[11px] text-slate-500">
            {exams.filter(e => e.isPublished).length} publicadas y activas
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Evaluaciones Activas</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {exams.filter(e => e.isPublished).length}
          </p>
          <span className="text-[11px] text-slate-500">Disponibles con PIN de acceso</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Seguridad y Supervisión</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">Anti-Trampa</p>
          <span className="text-[11px] text-slate-500">Monitoreo activo de pestañas y foco</span>
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs underline">Descartar</button>
        </div>
      )}

      {/* Exam List */}
      {loading ? (
        <div className="min-h-[250px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 my-6">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-200">Aún no has creado ninguna evaluación</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Crea tu primer examen configurando tiempo límite, tolerancia de infracciones y preguntas de opción múltiple.
          </p>
          <Link
            to="/teacher/exam/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primer examen</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
          {exams.map(exam => (
            <div
              key={exam.id}
              className="glass-card rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between overflow-hidden group shadow-lg"
            >
              <div className="p-5">
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-400 font-bold uppercase">
                      PIN: {exam.id}
                    </span>
                    <button
                      onClick={() => handleCopyCode(exam.id)}
                      title="Copiar PIN"
                      className="p-1 rounded text-slate-500 hover:text-slate-200 transition"
                    >
                      {copiedId === `pin_${exam.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleTogglePublish(exam)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition border ${
                      exam.isPublished
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {exam.isPublished ? 'Publicado' : 'Borrador'}
                  </button>
                </div>

                {/* Title and Description */}
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                  {exam.description || 'Sin descripción adicional.'}
                </p>

                {/* Exam Specs */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                  <div className="flex flex-col items-center">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 mb-1" />
                    <span className="text-xs font-bold text-slate-200">{exam.durationMinutes}m</span>
                    <span className="text-[10px] text-slate-500">Duración</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <FileText className="w-3.5 h-3.5 text-purple-400 mb-1" />
                    <span className="text-xs font-bold text-slate-200">
                      {exam.questions?.length || 0}
                    </span>
                    <span className="text-[10px] text-slate-500">Preguntas</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 mb-1" />
                    <span className="text-xs font-bold text-slate-200">{exam.maxViolations}</span>
                    <span className="text-[10px] text-slate-500">Máx. Infrac.</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3.5 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to={`/teacher/exam/${exam.id}/audit`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Auditoría & Calificaciones</span>
                </Link>

                <button
                  onClick={() => handleCopyLink(exam.id)}
                  title="Copiar enlace para estudiantes"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  {copiedId === exam.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <Link
                  to={`/teacher/exam/${exam.id}/edit`}
                  title="Editar Examen"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setDeleteId(exam.id)}
                  title="Eliminar Examen"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl border border-slate-800 animate-fadeIn">
            <h3 className="text-base font-bold text-white mb-2">¿Eliminar esta evaluación?</h3>
            <p className="text-xs text-slate-400 mb-5">
              Esta acción borrará permanentemente las preguntas, las claves y todos los registros de alumnos e infracciones.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
