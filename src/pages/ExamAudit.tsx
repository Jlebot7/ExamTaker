import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet, 
  Eye, 
  RefreshCw, 
  Search,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam, Submission, IntegrityLog } from '../types';

export const ExamAudit: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();

  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Student for Integrity Logs Modal
  const [selectedStudent, setSelectedStudent] = useState<Submission | null>(null);
  const [studentLogs, setStudentLogs] = useState<IntegrityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Reset Modals & Notifications
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [studentToReset, setStudentToReset] = useState<Submission | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;

    // 1. Fetch exam metadata
    examService.getExam(examId).then(data => {
      setExam(data);
      setLoading(false);
    });

    // 2. Subscribe to submissions in real time
    const unsubscribeSubmissions = studentService.subscribeToSubmissions(
      examId,
      (subsMap) => {
        setSubmissions(subsMap || {});
      }
    );

    return () => {
      unsubscribeSubmissions();
    };
  }, [examId]);

  // Subscribe to student logs when a student is selected
  useEffect(() => {
    if (!examId || !selectedStudent) {
      setStudentLogs([]);
      return;
    }

    setLoadingLogs(true);
    const unsubscribeLogs = studentService.subscribeToStudentLogs(
      examId,
      selectedStudent.studentUid,
      (logs) => {
        setStudentLogs(logs);
        setLoadingLogs(false);
      }
    );

    return () => {
      unsubscribeLogs();
    };
  }, [examId, selectedStudent]);

  const submissionList = Object.values(submissions);

  // Computed Metrics
  const totalStudents = submissionList.length;
  const inProgressCount = submissionList.filter(s => s.status === 'in_progress').length;
  const completedCount = submissionList.filter(s => s.status === 'submitted' || s.status === 'timed_out').length;
  const disqualifiedCount = submissionList.filter(s => s.status === 'disqualified').length;
  
  const gradedList = submissionList.filter(s => s.finalScore !== null && s.maxScore !== null);
  const averageScore = gradedList.length > 0 
    ? (gradedList.reduce((sum, s) => sum + (s.finalScore || 0), 0) / gradedList.length).toFixed(1)
    : 'N/A';

  // Filtered List
  const filteredSubmissions = submissionList.filter(sub => {
    const matchesSearch = 
      sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return sub.status === statusFilter;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (submissionList.length === 0) {
      alert('No hay envíos para exportar');
      return;
    }

    const headers = ['Nombre Estudiante', 'Código / Matrícula', 'Estado', 'Puntaje Obtenido', 'Puntaje Máximo', 'Infracciones', 'Inicio', 'Envío'];
    const rows = submissionList.map(s => [
      `"${s.studentName}"`,
      `"${s.studentCode}"`,
      `"${s.status}"`,
      s.finalScore !== null ? s.finalScore : 'Pendiente',
      s.maxScore !== null ? s.maxScore : exam?.totalPoints || '',
      s.violationCount || 0,
      `"${new Date(s.startedAt).toLocaleString()}"`,
      s.submittedAt ? `"${new Date(s.submittedAt).toLocaleString()}"` : 'En curso'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_evaluacion_${exam?.id || 'exam'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset entire exam (all student submissions & logs)
  const confirmResetAll = async () => {
    if (!examId) return;
    setIsResetting(true);
    setActionError(null);
    try {
      await studentService.resetAllSubmissions(examId);
      setSubmissions({});
      setShowResetAllModal(false);
      setSelectedStudent(null);
      setActionSuccess('La evaluación ha sido reiniciada por completo. Todos los estudiantes pueden volver a acceder.');
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err) {
      console.error('Error al reiniciar examen completo:', err);
      setActionError('Error al reiniciar los intentos de la evaluación');
    } finally {
      setIsResetting(false);
    }
  };

  // Reset a single student submission
  const confirmResetStudent = async () => {
    if (!examId || !studentToReset) return;
    setIsResetting(true);
    setActionError(null);
    try {
      await studentService.resetStudentSubmission(examId, studentToReset.studentUid);
      setSubmissions(prev => {
        const next = { ...prev };
        delete next[studentToReset.studentUid];
        return next;
      });
      setActionSuccess(`El intento de ${studentToReset.studentName} (${studentToReset.studentCode}) fue reiniciado exitosamente. Ya puede ingresar nuevamente.`);
      if (selectedStudent?.studentUid === studentToReset.studentUid) {
        setSelectedStudent(null);
      }
      setStudentToReset(null);
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err) {
      console.error('Error al reiniciar intento de estudiante:', err);
      setActionError('Error al reiniciar el intento del estudiante');
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            En Curso
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Completado
          </span>
        );
      case 'timed_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Clock className="w-3 h-3" />
            Tiempo Límite
          </span>
        );
      case 'disqualified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <XCircle className="w-3 h-3" />
            Descalificado
          </span>
        );
      default:
        return null;
    }
  };

  const getViolationBadge = (count: number, maxAllowed: number = 3) => {
    if (count === 0) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
          0 /{maxAllowed}
        </span>
      );
    }
    if (count < maxAllowed) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
          {count} /{maxAllowed}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-bold text-xs">
        {count} /{maxAllowed} (Excedido)
      </span>
    );
  };

  const formatLogType = (type: string) => {
    switch (type) {
      case 'tab_blur':
        return 'Pérdida de foco / Cambio de ventana';
      case 'visibility_hidden':
        return 'Pestaña minimizada u oculta';
      case 'contextmenu':
        return 'Intento de click derecho (Menú contextual)';
      case 'fullscreen_exit':
        return 'Salida de pantalla completa';
      case 'paste_attempt':
        return 'Intento de pegar contenido (Clipboard)';
      case 'devtools_opened':
        return 'Apertura de herramientas de desarrollo (F12)';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowResetAllModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 hover:text-amber-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reiniciar Examen Completo</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 hover:text-white transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Calificaciones (CSV)</span>
          </button>
        </div>
      </div>

      {/* Error Notification */}
      {actionError && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs underline">Descartar</button>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccess && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs underline">Cerrar</button>
        </div>
      )}

      {/* Header Info */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-800 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase">
                PIN: {exam?.id}
              </span>
              <span className="text-xs text-slate-400">• {exam?.durationMinutes} minutos</span>
              <span className="text-xs text-slate-400">• {exam?.questions.length} preguntas</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{exam?.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
              Sincronización en vivo activa
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Total Alumnos</span>
          <p className="text-2xl font-black text-white mt-1">{totalStudents}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">En Curso Ahora</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{inProgressCount}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Completados</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{completedCount}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Promedio Puntos</span>
          <p className="text-2xl font-black text-indigo-300 mt-1">{averageScore}</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Descalificados</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{disqualifiedCount}</p>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por alumno o código..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400">Filtrar:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500"
            >
              <option value="all">Todos los estados</option>
              <option value="in_progress">En Curso</option>
              <option value="submitted">Completados</option>
              <option value="timed_out">Tiempo Límite</option>
              <option value="disqualified">Descalificados</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No se registraron estudiantes con los filtros actuales.
            </div>
          ) : (
            filteredSubmissions.map(sub => (
              <div key={sub.studentUid} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{sub.studentName}</h4>
                    <p className="text-[11px] font-mono text-slate-400">ID: {sub.studentCode}</p>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                  <span className="text-slate-400">Calificación:</span>
                  <span className="font-mono font-bold">
                    {sub.finalScore !== null ? (
                      <span className="text-indigo-300">
                        {sub.finalScore} / {sub.maxScore || exam?.totalPoints} pts
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">Pendiente</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Infracciones:</span>
                  {getViolationBadge(sub.violationCount || 0, exam?.maxViolations || 3)}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Inicio: {new Date(sub.startedAt).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedStudent(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Auditoría</span>
                    </button>
                    <button
                      onClick={() => setStudentToReset(sub)}
                      title="Reiniciar intento para permitir reingreso"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 uppercase text-[10px] text-slate-400 tracking-wider border-b border-slate-800 font-bold">
              <tr>
                <th className="px-6 py-3.5">Estudiante</th>
                <th className="px-6 py-3.5">Código / ID</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Calificación</th>
                <th className="px-6 py-3.5">Infracciones</th>
                <th className="px-6 py-3.5">Hora Inicio</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No se registraron estudiantes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map(sub => (
                  <tr key={sub.studentUid} className="hover:bg-slate-900/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-100">
                      {sub.studentName}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {sub.studentCode}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {sub.finalScore !== null ? (
                        <span className="text-indigo-300">
                          {sub.finalScore} / {sub.maxScore || exam?.totalPoints} pts
                        </span>
                      ) : (
                        <span className="text-slate-500 font-normal">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getViolationBadge(sub.violationCount || 0, exam?.maxViolations || 3)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(sub.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudent(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Logs</span>
                        </button>
                        <button
                          onClick={() => setStudentToReset(sub)}
                          title="Reiniciar intento para permitir reingreso"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integrity Logs Modal / Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Historial de Integridad y Sospechas
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Estudiante: <span className="text-slate-200 font-semibold">{selectedStudent.studentName}</span> ({selectedStudent.studentCode})
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total de Infracciones Registradas:</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  {selectedStudent.violationCount || 0} / {exam?.maxViolations || 3}
                </span>
              </div>

              {loadingLogs ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  <span>Sin infracciones. El estudiante mantuvo el foco constante en la prueba.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Línea de Tiempo de Eventos Detectados
                  </h4>
                  {studentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20 flex items-start gap-3 text-xs"
                    >
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        #{log.violationNumber}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            {formatLogType(log.eventType)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStudentToReset(selectedStudent)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Intento del Alumno</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Confirmation Modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Reiniciar Examen Completo?</h3>
                <span className="text-xs font-mono text-amber-400 font-bold">PIN: {exam?.id}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Esta acción eliminará todas las entregas, respuestas, calificaciones e historial de infracciones de <strong>{totalStudents} estudiantes registrados</strong>.
            </p>
            <p className="text-xs text-slate-400 mb-6 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              💡 El examen permanecerá activo y las preguntas no se modificarán. <strong>Todos los alumnos podrán reingresar y rendir la prueba nuevamente</strong> desde cero.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmResetAll}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition shadow-md shadow-amber-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <span>Reiniciando...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sí, Reiniciar Todo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Single Student Confirmation Modal */}
      {studentToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Reiniciar intento del estudiante?</h3>
                <span className="text-xs text-slate-300 font-semibold">{studentToReset.studentName} ({studentToReset.studentCode})</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Se eliminarán las respuestas guardadas, su calificación actual ({studentToReset.finalScore !== null ? `${studentToReset.finalScore} pts` : 'Pendiente'}) y las <strong>{studentToReset.violationCount || 0} infracciones</strong> registradas.
            </p>
            <p className="text-xs text-slate-400 mb-6 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              💡 El estudiante podrá ingresar nuevamente con su código o matrícula y <strong>comenzar una nueva sesión limpia</strong> con el tiempo completo.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setStudentToReset(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmResetStudent}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition shadow-md shadow-amber-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <span>Reiniciando...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sí, Reiniciar Intento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
