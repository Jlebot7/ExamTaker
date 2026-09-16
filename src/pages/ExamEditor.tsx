import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  FileText, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { examService } from '../services/examService';
import type { Question, QuestionOption, QuestionType } from '../types';
import { WordImportModal } from '../components/exam/WordImportModal';
import type { ParsedImportItem } from '../utils/wordExamParser';

export const ExamEditor: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const isEditing = Boolean(examId);

  const { user } = useAuth();
  const navigate = useNavigate();

  // General Settings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [maxViolations, setMaxViolations] = useState(3);
  const [isPublished, setIsPublished] = useState(true);

  // Questions and Correct Answer Keys (default 4 options)
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_' + Math.random().toString(36).substring(2, 7),
      prompt: '',
      type: 'single_choice',
      points: 5,
      options: [
        { id: 'opt_1', text: '' },
        { id: 'opt_2', text: '' },
        { id: 'opt_3', text: '' },
        { id: 'opt_4', text: '' },
      ],
    },
  ]);

  // Map of questionId -> correctOptionIds
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);

  // Load existing exam if editing
  useEffect(() => {
    if (!isEditing || !examId) return;

    const loadExam = async () => {
      setLoading(true);
      try {
        const exam = await examService.getExam(examId);
        if (!exam) {
          setErrorMessage('Evaluación no encontrada');
          return;
        }

        setTitle(exam.title);
        setDescription(exam.description || '');
        setDurationMinutes(exam.durationMinutes);
        setMaxViolations(exam.maxViolations || 3);
        setIsPublished(exam.isPublished);
        setQuestions(exam.questions || []);

        // Load isolated keys
        const examKey = await examService.getExamKey(examId);
        if (examKey?.keys) {
          const map: Record<string, string[]> = {};
          Object.entries(examKey.keys).forEach(([qId, val]) => {
            map[qId] = val.correctOptionIds;
          });
          setCorrectAnswers(map);
        }
      } catch (err) {
        setErrorMessage('Error al cargar la evaluación para edición');
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, isEditing]);

  // Question manipulation (defaults to 4 options)
  const addQuestion = (type: QuestionType = 'single_choice') => {
    const newQId = 'q_' + Math.random().toString(36).substring(2, 7);
    let options: QuestionOption[] = [];

    if (type === 'true_false') {
      options = [
        { id: 'tf_true', text: 'Verdadero' },
        { id: 'tf_false', text: 'Falso' },
      ];
    } else {
      options = [
        { id: 'opt_1', text: '' },
        { id: 'opt_2', text: '' },
        { id: 'opt_3', text: '' },
        { id: 'opt_4', text: '' },
      ];
    }

    setQuestions(prev => [
      ...prev,
      {
        id: newQId,
        prompt: '',
        type,
        points: 5,
        options,
      },
    ]);
  };

  const handleWordImport = (imported: ParsedImportItem[], replaceExisting: boolean) => {
    const newQuestions: Question[] = imported.map(item => ({
      id: item.id,
      prompt: item.prompt,
      type: item.type,
      points: item.points,
      options: item.options,
    }));

    const newCorrectMap: Record<string, string[]> = {};
    imported.forEach(item => {
      newCorrectMap[item.id] = item.correctOptionIds;
    });

    if (replaceExisting) {
      setQuestions(newQuestions);
      setCorrectAnswers(newCorrectMap);
    } else {
      setQuestions(prev => {
        // If there is only 1 initial blank question, replace it cleanly
        if (prev.length === 1 && !prev[0].prompt && prev[0].options.every(o => !o.text)) {
          return newQuestions;
        }
        return [...prev, ...newQuestions];
      });
      setCorrectAnswers(prev => ({ ...prev, ...newCorrectMap }));
    }
  };

  const removeQuestion = (qIndex: number) => {
    if (questions.length <= 1) {
      alert('La evaluación debe contener al menos 1 pregunta.');
      return;
    }
    const qToRemove = questions[qIndex];
    setQuestions(prev => prev.filter((_, i) => i !== qIndex));
    setCorrectAnswers(prev => {
      const next = { ...prev };
      delete next[qToRemove.id];
      return next;
    });
  };

  const updateQuestionPrompt = (qIndex: number, text: string) => {
    setQuestions(prev => {
      const next = [...prev];
      next[qIndex].prompt = text;
      return next;
    });
  };

  const updateQuestionPoints = (qIndex: number, points: number) => {
    setQuestions(prev => {
      const next = [...prev];
      next[qIndex].points = Math.max(1, points);
      return next;
    });
  };

  const addOption = (qIndex: number) => {
    const newOptId = 'opt_' + Math.random().toString(36).substring(2, 7);
    setQuestions(prev => {
      const next = [...prev];
      next[qIndex].options.push({ id: newOptId, text: '' });
      return next;
    });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    if (questions[qIndex].options.length <= 2) {
      alert('Debe haber al menos 2 opciones por pregunta.');
      return;
    }
    const optIdToRemove = questions[qIndex].options[optIndex].id;
    setQuestions(prev => {
      const next = [...prev];
      next[qIndex].options = next[qIndex].options.filter((_, i) => i !== optIndex);
      return next;
    });
    setCorrectAnswers(prev => {
      const currentList = prev[questions[qIndex].id] || [];
      return {
        ...prev,
        [questions[qIndex].id]: currentList.filter(id => id !== optIdToRemove),
      };
    });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions(prev => {
      const next = [...prev];
      next[qIndex].options[optIndex].text = text;
      return next;
    });
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setCorrectAnswers(prev => ({
      ...prev,
      [qId]: [optId], // single correct option
    }));
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!title.trim()) {
      setErrorMessage('Ingresa un título para la evaluación.');
      return;
    }

    if (questions.length === 0) {
      setErrorMessage('Debes incluir al menos una pregunta.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setErrorMessage(`La pregunta #${i + 1} no tiene enunciado.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          setErrorMessage(`La opción #${j + 1} de la pregunta #${i + 1} está vacía.`);
          return;
        }
      }
      const correctList = correctAnswers[q.id];
      if (!correctList || correctList.length === 0) {
        setErrorMessage(`Debes marcar la respuesta correcta en la pregunta #${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditing && examId) {
        await examService.updateExam(
          examId,
          {
            title: title.trim(),
            description: description.trim(),
            durationMinutes: Number(durationMinutes),
            maxViolations: Number(maxViolations),
            isPublished,
          },
          questions,
          correctAnswers
        );
      } else {
        await examService.createExam(
          {
            title: title.trim(),
            description: description.trim(),
            durationMinutes: Number(durationMinutes),
            maxViolations: Number(maxViolations),
            isPublished,
            createdBy: user?.uid || 'teacher_demo_uid',
            createdByName: user?.displayName || 'Docente',
            questions,
          },
          questions,
          correctAnswers
        );
      }
      navigate('/teacher');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la evaluación';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mis Evaluaciones</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Puntaje Total:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
            {totalPoints} Puntos
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isEditing ? 'Editar Evaluación' : 'Crear Nueva Evaluación'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configura los parámetros de tiempo, tolerancia de infracciones anti-trampa y banco de preguntas.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveExam} className="space-y-8">
        {/* Card: General Settings */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Configuración General</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título de la Evaluación *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Examen Parcial: Arquitectura de Software y Sistemas Distribuidos"
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Instrucciones para el Estudiante (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Lee cuidadosamente cada pregunta. Recuerda no cambiar de pestaña durante el examen."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Duración (Minutos)</span>
              </label>
              <input
                type="number"
                min={1}
                max={300}
                required
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 outline-none transition font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Sincronizado vía Firebase Server Time</span>
            </div>

            {/* Max Violations */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Límite de Infracciones</span>
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={maxViolations}
                onChange={e => setMaxViolations(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 outline-none transition font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Auto-descalificación al alcanzar el límite</span>
            </div>

            {/* Published Switch */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado de Disponibilidad
              </label>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                  isPublished
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>{isPublished ? 'Publicado (Activo)' : 'Borrador (Oculto)'}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
              </button>
              <span className="text-[10px] text-slate-500 mt-1 block">Los alumnos solo pueden entrar si está publicado</span>
            </div>
          </div>
        </div>

        {/* Section: Question Builder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Preguntas ({questions.length})</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsWordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Importar desde Word</span>
              </button>

              <button
                type="button"
                onClick={() => addQuestion('single_choice')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Opción Múltiple</span>
              </button>

              <button
                type="button"
                onClick={() => addQuestion('true_false')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Verdadero / Falso</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          {questions.map((question, qIdx) => (
            <div
              key={question.id}
              className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition relative space-y-4 shadow-lg"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {question.type === 'true_false' ? 'Verdadero o Falso' : 'Opción Múltiple'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">Puntos:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={question.points}
                      onChange={e => updateQuestionPoints(qIdx, Number(e.target.value))}
                      className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-center text-indigo-300 font-mono font-bold outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeQuestion(qIdx)}
                    title="Eliminar Pregunta"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enunciado de la Pregunta
                </label>
                <textarea
                  rows={2}
                  required
                  value={question.prompt}
                  onChange={e => updateQuestionPrompt(qIdx, e.target.value)}
                  placeholder="Ej: ¿Cuál es la principal ventaja de utilizar un token JWT frente a sesiones tradicionales con estado?"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Options Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Opciones (marca con el círculo la alternativa correcta que se guardará en la clave secreta):
                  </span>
                  {question.type === 'single_choice' && (
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition"
                    >
                      + Añadir opción
                    </button>
                  )}
                </div>

                {question.options.map((opt, optIdx) => {
                  const isCorrect = (correctAnswers[question.id] || []).includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition ${
                        isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Mark Correct Radio */}
                      <button
                        type="button"
                        onClick={() => setCorrectOption(question.id, opt.id)}
                        title={isCorrect ? 'Opción Correcta Marcada' : 'Marcar como Respuesta Correcta'}
                        className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center border transition ${
                          isCorrect
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'border-slate-600 hover:border-indigo-400'
                        }`}
                      >
                        {isCorrect && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      {/* Option text */}
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={e => updateOptionText(qIdx, optIdx, e.target.value)}
                        placeholder={`Opción ${optIdx + 1}`}
                        className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 outline-none"
                      />

                      {/* Remove Option Button */}
                      {question.type === 'single_choice' && question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Save Bar */}
        <div className="sticky bottom-4 z-30 p-4 rounded-2xl glass-panel border border-slate-700 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">
              {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} • {totalPoints} pts
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando evaluación...' : 'Guardar Evaluación'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Word Import Modal */}
      <WordImportModal
        isOpen={isWordModalOpen}
        onClose={() => setIsWordModalOpen(false)}
        onImport={handleWordImport}
      />
    </div>
  );
};
