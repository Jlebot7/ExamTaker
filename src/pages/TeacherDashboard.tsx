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
  AlertCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam } from '../types';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetExamId, setResetExamId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadExams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await examService.getExamsByTeacher(user.uid);
      setExams(list);
    } catch {
      setActionError('Error al cargar la lista de evaluaciones');
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
    } catch {
      setActionError('Error al cambiar el estado de publicación');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await examService.deleteExam(deleteId);
      setExams(prev => prev.filter(e => e.id !== deleteId));
      setDeleteId(null);
    } catch {
      setActionError('Error al eliminar la evaluación');
    }
  };

  const confirmReset = async () => {
    if (!resetExamId) return;
    setIsResetting(true);
    setActionError(null);
    try {
      await studentService.resetAllSubmissions(resetExamId);
      setActionSuccess(`La evaluación "${resetExamId}" fue reiniciada exitosamente. Los alumnos registrados podrán ingresar nuevamente desde cero.`);
      setResetExamId(null);
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err) {
      console.error('Error al reiniciar evaluación:', err);
      setActionError('Error al reiniciar las respuestas y registros de la evaluación');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00827c] animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#edfffe]/80 font-medium">
              AUROS TESTQ // PANEL DE CONTROL DOCENTE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
            Mis Evaluaciones
          </h1>
          <p className="text-sm text-[#bbc7c6] mt-1 max-w-2xl leading-relaxed">
            Crea exámenes seguros, monitorea alumnos en vivo y supervisa las alertas de integridad sin fugas de datos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/teacher/exam/new"
            className="w-full sm:w-auto btn-bioluminescent rounded-[6px] px-4 py-2.5 inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Evaluación</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        <div className="surface-card p-5 rounded-[16px] border border-white/8 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6]">
              Total Evaluaciones
            </span>
            <FileText className="w-4 h-4 text-[#00827c]" />
          </div>
          <p className="text-3xl font-medium text-[#fde9ff] mt-2 font-mono">{exams.length}</p>
          <span className="text-[11px] text-[#bbc7c6]/70 mt-1">
            {exams.filter(e => e.isPublished).length} publicadas y disponibles
          </span>
        </div>

        <div className="surface-card p-5 rounded-[16px] border border-white/8 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6]">
              Evaluaciones Activas
            </span>
            <Eye className="w-4 h-4 text-[#edfffe]" />
          </div>
          <p className="text-3xl font-medium text-[#edfffe] mt-2 font-mono">
            {exams.filter(e => e.isPublished).length}
          </p>
          <span className="text-[11px] text-[#bbc7c6]/70 mt-1">
            Listas para rendición con PIN de acceso
          </span>
        </div>

        <div className="surface-card p-5 rounded-[16px] border border-white/8 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#bbc7c6]">
              Vigilancia Activa
            </span>
            <ShieldAlert className="w-4 h-4 text-[#fde9ff]" />
          </div>
          <p className="text-2xl font-medium text-white mt-2">Zero-Leak</p>
          <span className="text-[11px] text-[#bbc7c6]/70 mt-1">
            Supervisión continua de foco, pestañas y portapapeles
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="mb-6 p-3.5 rounded-[6px] surface-deep border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs text-[#bbc7c6] hover:text-white underline">
            Descartar
          </button>
        </div>
      )}

      {/* Success Banner */}
      {actionSuccess && (
        <div className="mb-6 p-3.5 rounded-[6px] surface-deep border border-[#00827c]/40 text-[#edfffe] text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#edfffe]" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs text-[#bbc7c6] hover:text-white underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Exam List */}
      {loading ? (
        <div className="min-h-[250px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="surface-card rounded-[16px] p-12 text-center border border-white/8 my-6">
          <FileText className="w-12 h-12 text-[#00827c]/60 mx-auto mb-3" />
          <h2 className="text-base font-medium text-white">Aún no has creado ninguna evaluación</h2>
          <p className="text-xs text-[#bbc7c6] max-w-md mx-auto mt-1 mb-5">
            Crea tu primer examen configurando tiempo límite, tolerancia de infracciones y preguntas con IA o manuales.
          </p>
          <Link
            to="/teacher/exam/new"
            className="btn-bioluminescent inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-medium uppercase tracking-wider"
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
              className="surface-card rounded-[16px] border border-white/8 hover:border-[#00827c]/40 transition flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6">
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-[6px] surface-deep border border-white/8 text-[#edfffe] font-medium uppercase">
                      PIN: {exam.id}
                    </span>
                    <button
                      onClick={() => handleCopyCode(exam.id)}
                      title="Copiar PIN"
                      className="p-1 rounded-[6px] text-[#bbc7c6] hover:text-white transition"
                    >
                      {copiedId === `pin_${exam.id}` ? (
                        <Check className="w-3.5 h-3.5 text-[#edfffe]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleTogglePublish(exam)}
                    className={`px-2.5 py-1 rounded-[6px] text-[10px] font-medium uppercase tracking-wider transition border ${
                      exam.isPublished
                        ? 'surface-deep border-[#00827c]/40 text-[#edfffe] hover:border-[#00827c]'
                        : 'surface-deep border-white/8 text-[#bbc7c6] hover:text-white'
                    }`}
                  >
                    {exam.isPublished ? '● Publicado' : '○ Borrador'}
                  </button>
                </div>

                {/* Title and Description */}
                <h3 className="text-lg font-medium text-white group-hover:text-[#edfffe] transition line-clamp-1">
                  {exam.title}
                </h3>
                <p className="text-xs text-[#bbc7c6] mt-1.5 line-clamp-2 min-h-[32px] leading-relaxed">
                  {exam.description || 'Sin descripción adicional.'}
                </p>

                {/* Exam Specs */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/8 text-center">
                  <div className="flex flex-col items-center">
                    <Clock className="w-3.5 h-3.5 text-[#00827c] mb-1" />
                    <span className="text-xs font-mono font-medium text-white">{exam.durationMinutes}m</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#bbc7c6]/70">Duración</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <FileText className="w-3.5 h-3.5 text-[#fde9ff] mb-1" />
                    <span className="text-xs font-mono font-medium text-white">
                      {exam.questions?.length || 0}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#bbc7c6]/70">Preguntas</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#edfffe] mb-1" />
                    <span className="text-xs font-mono font-medium text-white">{exam.maxViolations}</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#bbc7c6]/70">Máx. Infrac.</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3.5 surface-deep border-t border-white/8 flex items-center justify-between gap-2">
                <Link
                  to={`/teacher/exam/${exam.id}/audit`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[6px] bg-[#003734] hover:bg-[#025a53] text-[#edfffe] border border-white/8 text-xs font-medium transition"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Auditoría & Calificaciones</span>
                </Link>

                <button
                  onClick={() => handleCopyLink(exam.id)}
                  title="Copiar enlace para estudiantes"
                  className="p-2 rounded-[6px] bg-[#003734] hover:bg-[#025a53] text-[#bbc7c6] hover:text-white border border-white/8 transition"
                >
                  {copiedId === exam.id ? (
                    <Check className="w-3.5 h-3.5 text-[#edfffe]" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => setResetExamId(exam.id)}
                  title="Reiniciar Examen (Permitir reingreso de alumnos)"
                  className="p-2 rounded-[6px] bg-[#003734] hover:bg-[#025a53] text-[#bbc7c6] hover:text-[#fde9ff] border border-white/8 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <Link
                  to={`/teacher/exam/${exam.id}/edit`}
                  title="Editar Examen"
                  className="p-2 rounded-[6px] bg-[#003734] hover:bg-[#025a53] text-[#bbc7c6] hover:text-white border border-white/8 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setDeleteId(exam.id)}
                  title="Eliminar Examen"
                  className="p-2 rounded-[6px] bg-[#003734] hover:bg-rose-950/60 text-[#bbc7c6] hover:text-rose-300 border border-white/8 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetExamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="surface-card max-w-md w-full p-6 rounded-[16px] border border-white/10 animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[6px] surface-deep border border-amber-500/40 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">¿Reiniciar evaluación?</h3>
                <span className="text-xs font-mono text-amber-300 font-medium">PIN: {resetExamId}</span>
              </div>
            </div>
            <p className="text-xs text-[#bbc7c6] leading-relaxed mb-3">
              Esta acción <strong className="text-white">eliminará todas las respuestas, notas e infracciones acumuladas</strong> de todos los estudiantes que hayan rendido este examen.
            </p>
            <div className="text-xs text-[#bbc7c6] mb-6 surface-deep p-3 rounded-[6px] border border-white/8">
              💡 La estructura del examen, las preguntas y las claves secretas <strong className="text-white">se mantendrán intactas</strong>. Los mismos estudiantes podrán volver a ingresar con su código o PIN y realizar la evaluación desde cero.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setResetExamId(null)}
                className="px-4 py-2 text-xs font-medium rounded-[6px] text-[#bbc7c6] hover:bg-[#025a53] hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmReset}
                className="px-4 py-2 text-xs font-medium rounded-[6px] bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <span>Reiniciando...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sí, Reiniciar Evaluación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="surface-card max-w-sm w-full p-6 rounded-[16px] border border-white/10 animate-fadeIn">
            <h3 className="text-base font-medium text-white mb-2">¿Eliminar esta evaluación?</h3>
            <p className="text-xs text-[#bbc7c6] mb-5 leading-relaxed">
              Esta acción borrará permanentemente las preguntas, las claves y todos los registros de alumnos e infracciones.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-[6px] text-[#bbc7c6] hover:bg-[#025a53] hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-2 text-xs font-medium rounded-[6px] bg-rose-600 hover:bg-rose-500 text-white transition"
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