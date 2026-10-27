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
import { AiExamGeneratorModal } from '../components/exam/AiExamGeneratorModal';
import type { ParsedImportItem } from '../utils/wordExamParser';
import type { GeneratedQuestionItem } from '../services/aiExamService';

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
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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
        console.error('Error al cargar examen:', err);
        setErrorMessage('Error al cargar la evaluación para edición');
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, isEditing]);

  // Question manipulation
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
        if (prev.length === 1 && !prev[0].prompt && prev[0].options.every(o => !o.text)) {
          return newQuestions;
        }
        return [...prev, ...newQuestions];
      });
      setCorrectAnswers(prev => ({ ...prev, ...newCorrectMap }));
    }
  };

  const handleAiImport = (generated: GeneratedQuestionItem[], replaceExisting: boolean) => {
    const newQuestions: Question[] = generated.map(item => ({
      id: item.id,
      prompt: item.prompt,
      type: item.type,
      points: item.points,
      options: item.options,
    }));

    const newCorrectMap: Record<string, string[]> = {};
    generated.forEach(item => {
      newCorrectMap[item.id] = item.correctOptionIds;
    });

    if (replaceExisting) {
      setQuestions(newQuestions);
      setCorrectAnswers(newCorrectMap);
    } else {
      setQuestions(prev => {
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
      [qId]: [optId],
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
        <div className="w-8 h-8 border-2 border-[#00827c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-[#bbc7c6]">
      {/* Top navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[#bbc7c6] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mis Evaluaciones</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.08em] text-[#bbc7c6]">Puntaje Total:</span>
          <span className="px-3 py-1 rounded-md bg-[#011d1c] border border-white/10 text-[#fde9ff] font-mono font-medium text-xs">
            {totalPoints} Pts
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <span className="eyebrow-label text-xs text-[#edfffe] block mb-1">Auros • Editor de Evaluaciones</span>
        <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
          {isEditing ? 'Editar Evaluación' : 'Crear Nueva Evaluación'}
        </h1>
        <p className="text-xs text-[#bbc7c6] mt-1">
          Configura parámetros de sincronización, límite de infracciones y banco estructurado de preguntas.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#011d1c] border border-rose-500/40 text-[#edfffe] text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveExam} className="space-y-8">
        {/* Card: General Settings */}
        <div className="surface-card p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <h2 className="text-base font-medium text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-4 h-4 text-[#cbfffc]" />
            <span>Configuración General</span>
          </h2>

          <div>
            <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5">
              Título de la Evaluación *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Examen Parcial: Arquitectura de Software y Sistemas Distribuidos"
              className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-4 py-2.5 text-sm text-white placeholder-[#707777] outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5">
              Instrucciones para el Estudiante (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Lee cuidadosamente cada pregunta. Recuerda no cambiar de pestaña durante el examen."
              className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-4 py-2 text-xs text-white placeholder-[#707777] outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Duration */}
            <div>
              <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Duración (Minutos)</span>
              </label>
              <input
                type="number"
                min={1}
                max={300}
                required
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-3.5 py-2 text-sm text-[#fde9ff] outline-none transition font-mono"
              />
              <span className="text-[10px] text-[#707777] mt-1 block">Sincronizado vía Cloud Server Time</span>
            </div>

            {/* Max Violations */}
            <div>
              <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5 flex items-center gap-1.5">
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
                className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-3.5 py-2 text-sm text-[#fde9ff] outline-none transition font-mono"
              />
              <span className="text-[10px] text-[#707777] mt-1 block">Auto-descalificación al alcanzar el límite</span>
            </div>

            {/* Published Switch */}
            <div>
              <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5">
                Estado de Disponibilidad
              </label>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`w-full py-2 px-3 rounded-md border text-xs font-medium uppercase tracking-[0.08em] flex items-center justify-between transition ${
                  isPublished
                    ? 'bg-[#011d1c] border-[#00827c] text-[#edfffe]'
                    : 'bg-[#011d1c] border-white/10 text-[#707777]'
                }`}
              >
                <span>{isPublished ? 'Publicado (Activo)' : 'Borrador (Oculto)'}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-[#cbfffc]' : 'bg-slate-600'}`}></span>
              </button>
              <span className="text-[10px] text-[#707777] mt-1 block">Acceso disponible con PIN</span>
            </div>
          </div>
        </div>

        {/* Section: Question Builder */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#cbfffc]" />
              <span>Preguntas ({questions.length})</span>
            </h2>

            {/* Action Buttons: Import from Word, Generate with AI, Add Manual */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Button: Import from Word */}
              <button
                type="button"
                onClick={() => setIsWordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#011d1c] hover:bg-[#003734] border border-white/15 text-[#edfffe] text-xs font-medium uppercase tracking-[0.08em] transition"
              >
                <FileText className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Importar Word</span>
              </button>

              {/* Button: Generate Test with AI (User Request) */}
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="btn-bioluminescent inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium tracking-[0.08em]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar con IA</span>
              </button>

              <button
                type="button"
                onClick={() => addQuestion('single_choice')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#003734] hover:bg-white/10 border border-white/15 text-white text-xs font-medium uppercase tracking-[0.08em] transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>+ Opción Múlt.</span>
              </button>

              <button
                type="button"
                onClick={() => addQuestion('true_false')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#003734] hover:bg-white/10 border border-white/15 text-white text-xs font-medium uppercase tracking-[0.08em] transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#fde9ff]" />
                <span>+ V / F</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          {questions.map((question, qIdx) => (
            <div
              key={question.id}
              className="surface-card p-6 rounded-2xl border border-white/10 space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#011d1c] text-[#cbfffc] font-mono font-medium text-xs flex items-center justify-center border border-white/10">
                    {qIdx + 1}
                  </span>
                  <span className="text-xs font-medium text-[#edfffe] uppercase tracking-[0.08em]">
                    {question.type === 'true_false' ? 'Verdadero o Falso' : 'Opción Múltiple'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#bbc7c6]">Puntos:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={question.points}
                      onChange={e => updateQuestionPoints(qIdx, Number(e.target.value))}
                      className="w-14 bg-[#011d1c] border border-white/15 rounded-md px-2 py-0.5 text-xs text-center text-[#fde9ff] font-mono font-medium outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeQuestion(qIdx)}
                    title="Eliminar Pregunta"
                    className="p-1.5 rounded-md text-[#707777] hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe] mb-1.5">
                  Enunciado de la Pregunta
                </label>
                <textarea
                  rows={2}
                  required
                  value={question.prompt}
                  onChange={e => updateQuestionPrompt(qIdx, e.target.value)}
                  placeholder="Ej: ¿Cuál es la principal ventaja de utilizar un token JWT frente a sesiones tradicionales con estado?"
                  className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-4 py-2 text-xs text-white placeholder-[#707777] outline-none transition"
                />
              </div>

              {/* Options Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-[#bbc7c6]">
                    Opciones (marca la alternativa correcta que se resguardará en la clave secreta):
                  </span>
                  {question.type === 'single_choice' && (
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      className="text-[11px] uppercase tracking-[0.08em] text-[#cbfffc] hover:underline font-medium transition"
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
                      className={`flex items-center gap-3 p-2.5 rounded-md border transition ${
                        isCorrect
                          ? 'bg-[#011d1c] border-[#00827c]'
                          : 'bg-[#011d1c]/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Mark Correct Radio */}
                      <button
                        type="button"
                        onClick={() => setCorrectOption(question.id, opt.id)}
                        title={isCorrect ? 'Opción Correcta Marcada' : 'Marcar como Respuesta Correcta'}
                        className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center border transition ${
                          isCorrect
                            ? 'bg-[#00827c] border-[#cbfffc] text-[#012624]'
                            : 'border-white/20 hover:border-[#cbfffc]'
                        }`}
                      >
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Option text */}
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={e => updateOptionText(qIdx, optIdx, e.target.value)}
                        placeholder={`Opción ${optIdx + 1}`}
                        className="flex-1 bg-transparent text-xs text-white placeholder-[#707777] outline-none"
                      />

                      {/* Remove Option Button */}
                      {question.type === 'single_choice' && question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="p-1 text-[#707777] hover:text-rose-400 transition"
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
        <div className="sticky bottom-4 z-30 p-4 rounded-xl surface-deep border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-xs uppercase tracking-[0.08em] text-[#edfffe] font-mono">
              {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} • {totalPoints} Puntos Totales
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] rounded-md text-[#bbc7c6] hover:text-white hover:bg-white/5 border border-white/10 transition text-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-aurora flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#012624]" />
              <span>{saving ? 'Guardando...' : 'Guardar Evaluación'}</span>
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

      {/* AI Exam Generator Modal (Groq) */}
      <AiExamGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImport={handleAiImport}
      />
    </div>
  );
};
