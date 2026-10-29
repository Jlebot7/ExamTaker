import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertCircle,
  BarChart3,
  X
} from 'lucide-react';
import { examService } from '../services/examService';
import { studentService } from '../services/studentService';
import type { Exam, ExamKey, Submission, IntegrityLog } from '../types';

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

  // Item Analysis Modal State
  const [showItemAnalysisModal, setShowItemAnalysisModal] = useState(false);

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

  // Grading runs on the teacher's client: students can no longer read the answer key.
  const [examKey, setExamKey] = useState<ExamKey | null>(null);
  const gradingRef = useRef(false);

  useEffect(() => {
    if (!examId) return;
    examService.getExamKey(examId)
      .then(setExamKey)
      .catch(err => console.error('Error al cargar la clave del examen:', err));
  }, [examId]);

  useEffect(() => {
    if (!examId || !examKey || gradingRef.current) return;
    gradingRef.current = true;
    studentService.gradePendingSubmissions(examId, submissions, examKey)
      .catch(err => console.error('Error al calificar entregas:', err))
      .finally(() => { gradingRef.current = false; });
  }, [examId, examKey, submissions]);

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

  // Item Analysis (Psicometría: Dificultad P y frecuencia de distractores)
  const itemAnalysis = useMemo(() => {
    if (!exam || !examKey || !exam.questions) return [];
    const finishedSubs = submissionList.filter(s => s.status !== 'in_progress');
    const totalFinished = finishedSubs.length;

    return exam.questions.map((q, qIndex) => {
      const correctOptionIds = examKey.keys[q.id]?.correctOptionIds || [];
      const responses = finishedSubs.filter(s => s.answers && s.answers[q.id] !== undefined);
      const totalAnswers = responses.length;

      let correctCount = 0;
      const optionFrequency: Record<string, number> = {};
      q.options.forEach(opt => { optionFrequency[opt.id] = 0; });

      responses.forEach(s => {
        const studentAns = s.answers[q.id];
        if (Array.isArray(studentAns)) {
          studentAns.forEach(optId => {
            optionFrequency[optId] = (optionFrequency[optId] || 0) + 1;
          });
          const isCorrect = studentAns.length === correctOptionIds.length &&
            studentAns.every(id => correctOptionIds.includes(id));
          if (isCorrect) correctCount++;
        } else if (typeof studentAns === 'string') {
          optionFrequency[studentAns] = (optionFrequency[studentAns] || 0) + 1;
          if (correctOptionIds.includes(studentAns)) correctCount++;
        }
      });

      const pDifficulty = totalAnswers > 0 ? (correctCount / totalAnswers) : 0;
      return {
        questionNumber: qIndex + 1,
        question: q,
        totalAnswers,
        totalFinished,
        correctCount,
        pDifficulty,
        optionFrequency,
        correctOptionIds,
      };
    });
  }, [exam, examKey, submissionList]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium surface-deep border border-cyan-500/30 text-[#cbfffc]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00827c] animate-pulse"></span>
            En progreso
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium surface-deep border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Entregado
          </span>
        );
      case 'timed_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium surface-deep border border-amber-500/30 text-amber-300">
            <Clock className="w-3 h-3" />
            Tiempo agotado
          </span>
        );
      case 'disqualified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium surface-deep border border-rose-500/30 text-rose-300">
            <XCircle className="w-3 h-3" />
            Descalificado
          </span>
        );
      default:
        return null;
    }
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
        <div className="w-8 h-8 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#bbc7c6] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowItemAnalysisModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-[6px] surface-deep border border-white/10 hover:border-[#cbfffc] text-xs font-medium text-[#edfffe] hover:text-white transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span>Análisis de Ítems</span>
          </button>

          <button
            onClick={() => setShowResetAllModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-[6px] surface-deep border border-amber-500/30 hover:border-amber-400 text-xs font-medium text-amber-300 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Examen Completo</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-[6px] surface-deep border border-white/10 hover:border-[#00827c] text-xs font-medium text-[#edfffe] hover:text-white transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00827c]" />
            <span>Exportar Calificaciones (CSV)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-6 p-4 rounded-[6px] surface-deep border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-[6px] surface-deep border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="surface-card rounded-[16px] p-6 mb-8 border border-white/8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[#edfffe] surface-deep px-2.5 py-0.5 rounded-[6px] border border-white/8 font-mono">
                PIN: {exam?.id}
              </span>
              <span className="text-xs text-[#bbc7c6]">
                {exam?.durationMinutes} min límite • Máx. {exam?.maxViolations} infracciones • Promedio: <strong className="text-white font-mono">{averageScore !== 'N/A' ? `${averageScore} pts` : '—'}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-medium text-white mt-2">
              Auditoría en Tiempo Real: {exam?.title}
            </h1>
            <p className="text-xs text-[#bbc7c6] mt-1 max-w-2xl line-clamp-1">
              {exam?.description || 'Supervisión en vivo de intentos estudiantiles y flujo telemétrico anti-trampa.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-medium surface-deep border border-white/8 text-[#edfffe]">
              <RefreshCw className="w-3.5 h-3.5 text-[#00827c] animate-spin" />
              Sincronización Activa
            </span>
          </div>
        </div>

        {/* Realtime Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/8">
          <div className="surface-deep p-4 rounded-[6px] border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-[#bbc7c6]">Alumnos Totales</span>
            <div className="text-2xl font-medium text-white font-mono mt-1">{totalStudents}</div>
          </div>
          <div className="surface-deep p-4 rounded-[6px] border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-cyan-300">En Progreso</span>
            <div className="text-2xl font-medium text-cyan-200 font-mono mt-1">{inProgressCount}</div>
          </div>
          <div className="surface-deep p-4 rounded-[6px] border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300">Entregados</span>
            <div className="text-2xl font-medium text-emerald-200 font-mono mt-1">{completedCount}</div>
          </div>
          <div className="surface-deep p-4 rounded-[6px] border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-rose-300">Descalificados</span>
            <div className="text-2xl font-medium text-rose-200 font-mono mt-1">{disqualifiedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Content: Table & Filters */}
      <div className="surface-card rounded-[16px] border border-white/8 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#bbc7c6]" />
            <input
              type="text"
              placeholder="Buscar por estudiante o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#011d1c] border border-white/10 rounded-[6px] text-xs text-white placeholder:text-[#707777] focus:outline-none focus:border-[#00827c]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#bbc7c6] shrink-0">Filtrar Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#011d1c] border border-white/10 rounded-[6px] text-xs text-white focus:outline-none focus:border-[#00827c]"
            >
              <option value="all">Todos ({submissionList.length})</option>
              <option value="in_progress">En progreso</option>
              <option value="submitted">Entregados</option>
              <option value="timed_out">Tiempo agotado</option>
              <option value="disqualified">Descalificados</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8 bg-[#011d1c]/50 text-[10px] uppercase tracking-[0.14em] text-[#bbc7c6]">
                <th className="py-3.5 px-4 font-medium">Estudiante</th>
                <th className="py-3.5 px-4 font-medium">Estado</th>
                <th className="py-3.5 px-4 font-medium">Respuestas</th>
                <th className="py-3.5 px-4 font-medium">Calificación</th>
                <th className="py-3.5 px-4 font-medium">Infracciones</th>
                <th className="py-3.5 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-[#bbc7c6]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#707777]">
                    No se encontraron entregas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const answeredCount = Object.keys(sub.answers || {}).length;
                  const totalQuestions = exam?.questions.length || 0;
                  const hasViolations = (sub.violationCount || 0) > 0;

                  return (
                    <tr key={sub.studentUid} className="hover:bg-[#003734]/30 transition">
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{sub.studentName}</div>
                        <div className="text-[10px] text-[#707777] font-mono mt-0.5">{sub.studentCode}</div>
                      </td>

                      <td className="py-4 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <span className="text-white">{answeredCount}</span> / {totalQuestions}
                      </td>

                      <td className="py-4 px-4 font-mono">
                        {sub.finalScore !== null ? (
                          <span className="font-medium text-[#fde9ff]">
                            {sub.finalScore} / {sub.maxScore || exam?.totalPoints} pts
                          </span>
                        ) : (
                          <span className="text-[#707777] italic">Pendiente</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-medium ${
                            sub.violationCount === 0 
                              ? 'text-emerald-300' 
                              : (sub.violationCount || 0) >= (exam?.maxViolations || 3) 
                              ? 'text-rose-400 font-bold' 
                              : 'text-amber-300'
                          }`}>
                            {sub.violationCount || 0}
                          </span>
                          {hasViolations && (
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedStudent(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] surface-deep border border-white/10 hover:border-cyan-400 text-xs font-medium text-[#edfffe] hover:text-white transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Logs</span>
                          </button>

                          <button
                            onClick={() => setStudentToReset(sub)}
                            title="Reiniciar intento individual"
                            className="p-1.5 rounded-[6px] surface-deep border border-amber-500/20 hover:border-amber-400 text-amber-300 hover:text-white transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Analysis Modal */}
      {showItemAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="surface-card max-w-4xl w-full max-h-[90vh] flex flex-col rounded-[16px] border border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] surface-deep border border-[#00827c]/40 text-[#cbfffc] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Análisis Psicométrico de Ítems</h2>
                  <p className="text-xs text-[#bbc7c6]">
                    Dificultad de preguntas ($P$) y frecuencia de distractores en base a entregas reales.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemAnalysisModal(false)}
                className="p-2 text-[#bbc7c6] hover:text-white rounded-[6px] hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {itemAnalysis.length === 0 ? (
                <div className="py-12 text-center text-[#707777]">
                  No hay respuestas registradas aún para calcular métricas psicométricas.
                </div>
              ) : (
                itemAnalysis.map(item => {
                  const pPercent = Math.round(item.pDifficulty * 100);
                  const isEasy = pPercent >= 80;
                  const isBalanced = pPercent >= 40 && pPercent < 80;

                  return (
                    <div key={item.question.id} className="p-5 surface-deep rounded-[12px] border border-white/8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/8">
                        <span className="text-sm font-medium text-white">
                          Pregunta #{item.questionNumber}: {item.question.prompt}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-[6px] text-xs font-mono font-medium border ${
                            isEasy 
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : isBalanced
                              ? 'bg-cyan-500/10 text-[#cbfffc] border-cyan-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            P = {pPercent}% ({isEasy ? 'Muy Fácil' : isBalanced ? 'Equilibrada' : 'Alta Dificultad'})
                          </span>
                          <span className="text-[10px] text-[#707777] font-mono">
                            {item.correctCount}/{item.totalAnswers} aciertos
                          </span>
                        </div>
                      </div>

                      {/* Options breakdown */}
                      <div className="mt-4 space-y-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#bbc7c6]">
                          Distribución de respuestas y distractores:
                        </span>
                        {item.question.options.map((opt, optIdx) => {
                          const count = item.optionFrequency[opt.id] || 0;
                          const optPercent = item.totalAnswers > 0 ? Math.round((count / item.totalAnswers) * 100) : 0;
                          const isCorrect = item.correctOptionIds.includes(opt.id);

                          return (
                            <div key={opt.id} className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-white">
                                  <span className="font-mono text-[#707777]">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span>{opt.text}</span>
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      ✓ Correcta
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-[#bbc7c6]">
                                  {count} ({optPercent}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 surface-card rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isCorrect ? 'bg-[#00827c]' : 'bg-[#707777]'
                                  }`}
                                  style={{ width: `${optPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/8 surface-deep flex justify-end">
              <button
                onClick={() => setShowItemAnalysisModal(false)}
                className="px-4 py-2 rounded-[6px] surface-card text-xs font-medium text-white hover:bg-white/10 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Student Logs Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="surface-card max-w-2xl w-full max-h-[85vh] flex flex-col rounded-[16px] border border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/8 flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Registro Telemétrico de Integridad
                </h3>
                <p className="text-xs text-[#bbc7c6] mt-0.5">
                  Estudiante: <strong className="text-white">{selectedStudent.studentName}</strong> ({selectedStudent.studentCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-[6px] hover:bg-white/5 text-[#bbc7c6] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingLogs ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentLogs.length === 0 ? (
                <div className="py-12 text-center text-[#707777] text-xs">
                  No se registraron sospechas de infracción para este estudiante. Sesión 100% limpia.
                </div>
              ) : (
                studentLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-[6px] surface-deep border border-white/5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-medium text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Infracción #{log.violationNumber}: {formatLogType(log.eventType)}</span>
                      </div>
                      <p className="text-[#bbc7c6] mt-1 text-[11px] leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#707777] font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/8 surface-deep flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-[6px] surface-card text-xs font-medium text-white hover:bg-white/10 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Entire Exam Confirmation Modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="surface-card max-w-md w-full p-6 rounded-[16px] border border-white/10">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <div className="w-10 h-10 rounded-[6px] surface-deep border border-amber-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-300" />
              </div>
              <h3 className="text-base font-medium text-white">¿Reiniciar la evaluación completa?</h3>
            </div>
            <p className="text-xs text-[#bbc7c6] leading-relaxed mb-4">
              Esta acción eliminará <strong className="text-white">TODAS las entregas actuales ({submissionList.length} estudiantes)</strong> y sus registros de infracción. Los alumnos podrán ingresar nuevamente con sus matrículas a realizar el examen desde cero.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-[6px] text-[#bbc7c6] hover:bg-[#025a53] hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmResetAll}
                className="px-4 py-2 text-xs font-medium rounded-[6px] bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-2 disabled:opacity-50"
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
          <div className="surface-card max-w-md w-full p-6 rounded-[16px] border border-white/10">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <div className="w-10 h-10 rounded-[6px] surface-deep border border-amber-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">¿Reiniciar intento del estudiante?</h3>
                <span className="text-xs text-[#bbc7c6] font-medium">{studentToReset.studentName} ({studentToReset.studentCode})</span>
              </div>
            </div>
            <p className="text-xs text-[#bbc7c6] leading-relaxed mb-3">
              Se eliminarán las respuestas guardadas, su calificación actual ({studentToReset.finalScore !== null ? `${studentToReset.finalScore} pts` : 'Pendiente'}) y las <strong className="text-white">{studentToReset.violationCount || 0} infracciones</strong> registradas.
            </p>
            <div className="text-xs text-[#bbc7c6] mb-6 surface-deep p-3 rounded-[6px] border border-white/8">
              💡 El estudiante podrá ingresar nuevamente con su código o matrícula y <strong className="text-white">comenzar una nueva sesión limpia</strong> con el tiempo completo.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setStudentToReset(null)}
                className="px-4 py-2 text-xs font-medium rounded-[6px] text-[#bbc7c6] hover:bg-[#025a53] hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={confirmResetStudent}
                className="px-4 py-2 text-xs font-medium rounded-[6px] bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-2 disabled:opacity-50"
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
