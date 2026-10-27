import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  AlertCircle, 
  Key,
  FileCheck2,
  CheckCircle2,
  Layers,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  generateExamQuestions, 
  getStoredGroqKey, 
  setStoredGroqKey,
  type GeneratedQuestionItem 
} from '../../services/aiExamService';

interface AiExamGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: GeneratedQuestionItem[], replaceExisting: boolean) => void;
}

export const AiExamGeneratorModal: React.FC<AiExamGeneratorModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  // Form State
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [questionType, setQuestionType] = useState<'single_choice' | 'true_false' | 'mixed'>('mixed');
  const [complexity, setComplexity] = useState<'basico' | 'intermedio' | 'avanzado' | 'experto'>('intermedio');
  const [pointsPerQuestion, setPointsPerQuestion] = useState(5);
  const [customInstructions, setCustomInstructions] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [saveKey, setSaveKey] = useState(true);
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  // Process and Preview State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroqKey();
      setApiKey(stored);
      if (!stored) {
        setShowKeyConfig(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage('Por favor ingresa un tema o contenido de estudio para la evaluación.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      if (saveKey && apiKey.trim()) {
        setStoredGroqKey(apiKey.trim());
      }

      const questions = await generateExamQuestions({
        topic: topic.trim(),
        count: Number(count),
        questionType,
        complexity,
        pointsPerQuestion: Number(pointsPerQuestion) || 5,
        customInstructions: customInstructions.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });

      setGeneratedQuestions(questions);
      setSelectedIds(new Set(questions.map(q => q.id)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al conectar con el servicio de IA.';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(generatedQuestions.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleConfirmImport = () => {
    const toImport = generatedQuestions.filter(q => selectedIds.has(q.id));
    if (toImport.length === 0) {
      alert('Selecciona al menos una pregunta para insertar en la evaluación.');
      return;
    }
    onImport(toImport, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#011d1c]/80 backdrop-blur-md animate-fadeIn">
      <div className="surface-card w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/10">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#003734] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[linear-gradient(90deg,rgb(0,130,124)_0%,rgb(203,255,252)_100%)] flex items-center justify-center text-[#012624]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="eyebrow-label block text-[10px] text-[#edfffe]">Auros • Motor Generativo Groq</span>
              <h2 className="text-base sm:text-lg font-medium text-white tracking-tight">
                Generador de Evaluaciones con IA
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#011d1c] border border-white/10 text-[#bbc7c6] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#012624]/60">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-md bg-[#011d1c] border border-rose-500/40 text-[#edfffe] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {generatedQuestions.length === 0 ? (
            /* Parameters Form */
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Topic Field */}
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] font-medium text-[#edfffe] mb-1.5">
                  Tema o Contenido de la Evaluación *
                </label>
                <textarea
                  required
                  rows={2}
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ej: Patrones de diseño de software (Singleton, Factory, Observer), complejidad Big-O y principios SOLID."
                  className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] focus:ring-1 focus:ring-[#cbfffc] rounded-md px-3.5 py-2.5 text-xs text-white placeholder-[#707777] outline-none transition"
                />
              </div>

              {/* Grid: Question Count, Types & Complexity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Count & Points */}
                <div className="surface-deep p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-[0.1em] text-[#edfffe] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#cbfffc]" />
                      <span>Cantidad de Preguntas:</span>
                    </label>
                    <span className="text-sm font-mono font-medium text-[#fde9ff]">{count}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    className="w-full accent-[#00827c] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#707777] font-mono">
                    <span>1 mín</span>
                    <span>10 medio</span>
                    <span>20 máx</span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-[#bbc7c6]">Puntos por pregunta:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pointsPerQuestion}
                      onChange={e => setPointsPerQuestion(Number(e.target.value))}
                      className="w-16 bg-[#003734] border border-white/15 rounded-md px-2 py-1 text-xs text-white font-mono text-center outline-none"
                    />
                  </div>
                </div>

                {/* Question Types */}
                <div className="surface-deep p-4 rounded-xl border border-white/10 space-y-2.5">
                  <label className="block text-xs uppercase tracking-[0.1em] text-[#edfffe] flex items-center gap-1.5 mb-2">
                    <Layers className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>Tipo de Preguntas</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mixed', label: 'Mixto' },
                      { id: 'single_choice', label: 'Opción Múlt.' },
                      { id: 'true_false', label: 'V / F' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setQuestionType(t.id as any)}
                        className={`py-2 px-1 text-[11px] rounded-md font-medium uppercase tracking-[0.05em] transition border ${
                          questionType === t.id
                            ? 'bg-[#003734] border-[#cbfffc] text-white'
                            : 'bg-[#011d1c] border-white/10 text-[#bbc7c6] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Complexity Selector */}
                  <div className="pt-2">
                    <span className="text-[11px] text-[#bbc7c6] block mb-1.5 uppercase tracking-[0.08em]">Complejidad:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'basico', label: 'Básico' },
                        { id: 'intermedio', label: 'Medio' },
                        { id: 'avanzado', label: 'Avanzado' },
                        { id: 'experto', label: 'Experto' },
                      ].map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setComplexity(c.id as any)}
                          className={`py-1.5 px-1 text-[10px] rounded-md font-medium uppercase tracking-[0.05em] transition border ${
                            complexity === c.id
                              ? 'bg-[#003734] border-[#00827c] text-[#edfffe]'
                              : 'bg-[#011d1c] border-white/10 text-[#707777] hover:text-[#bbc7c6]'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Custom Instructions */}
              <div>
                <label className="block text-xs uppercase tracking-[0.1em] text-[#bbc7c6] mb-1">
                  Instrucciones o Enfoque Complementario (Opcional)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  placeholder="Ej: Plantear preguntas en base a casos de estudio del mundo real."
                  className="w-full bg-[#011d1c] border border-white/15 focus:border-[#cbfffc] rounded-md px-3.5 py-2 text-xs text-white placeholder-[#707777] outline-none"
                />
              </div>

              {/* Groq API Key Configuration Accordion */}
              <div className="surface-deep rounded-xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs text-[#edfffe] hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span className="uppercase tracking-[0.08em] font-medium">Configuración de API Key (Groq)</span>
                    {apiKey ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#003734] text-[#cbfffc] font-mono">
                        Conectada ✓
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                        Modo Local Activo
                      </span>
                    )}
                  </div>
                  {showKeyConfig ? <ChevronUp className="w-4 h-4 text-[#707777]" /> : <ChevronDown className="w-4 h-4 text-[#707777]" />}
                </button>

                {showKeyConfig && (
                  <div className="p-4 pt-1 space-y-3 border-t border-white/5 text-xs">
                    <p className="text-[11px] text-[#bbc7c6]">
                      Groq permite inferencia ultra-rápida con <strong className="text-white">llama-3.3-70b-versatile</strong>. Puedes obtener una clave gratuita en{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#cbfffc] underline underline-offset-2 hover:opacity-80"
                      >
                        console.groq.com/keys ↗
                      </a>. Si no ingresas una clave, se utilizará el motor generativo local inteligente.
                    </p>
                    <div className="relative">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="gsk_..."
                        className="w-full bg-[#003734] border border-white/15 focus:border-[#cbfffc] rounded-md px-3.5 py-2 text-xs font-mono text-white placeholder-[#707777] outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-[#bbc7c6] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveKey}
                        onChange={e => setSaveKey(e.target.checked)}
                        className="rounded accent-[#00827c]"
                      />
                      <span>Recordar clave de Groq en este navegador</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Submit */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-md text-xs font-medium uppercase tracking-[0.08em] text-[#bbc7c6] hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="btn-bioluminescent px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar {count} Preguntas con IA</span>
                </button>
              </div>
            </form>
          ) : (
            /* Review & Selection View */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#cbfffc]" />
                    <span>Preguntas Generadas ({generatedQuestions.length})</span>
                  </h3>
                  <p className="text-[11px] text-[#bbc7c6] mt-0.5">
                    Revisa las preguntas y deselecciona cualquiera que no desees incluir.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-[11px] text-[#cbfffc] hover:underline"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-[#707777]">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-[11px] text-[#bbc7c6] hover:underline"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              {/* Question list */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {generatedQuestions.map((q, idx) => {
                  const isChecked = selectedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleSelect(q.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'surface-card border-[#cbfffc]/40'
                          : 'surface-deep border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-1 accent-[#00827c] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#011d1c] text-[#edfffe] uppercase">
                              #{idx + 1} • {q.type === 'true_false' ? 'Verdadero / Falso' : 'Opción Múltiple'}
                            </span>
                            <span className="text-[10px] text-[#fde9ff] font-mono">{q.points} pts</span>
                          </div>
                          <p className="text-xs font-medium text-white leading-relaxed">{q.prompt}</p>

                          {/* Options preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5">
                            {q.options.map(opt => {
                              const isCorrect = q.correctOptionIds.includes(opt.id);
                              return (
                                <div
                                  key={opt.id}
                                  className={`px-2.5 py-1.5 rounded-md text-[11px] flex items-center justify-between border ${
                                    isCorrect
                                      ? 'bg-[#011d1c] border-[#00827c] text-[#edfffe] font-medium'
                                      : 'bg-[#011d1c]/50 border-white/5 text-[#bbc7c6]'
                                  }`}
                                >
                                  <span className="truncate">{opt.text}</span>
                                  {isCorrect && <Check className="w-3 h-3 text-[#cbfffc] shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <p className="text-[10px] text-[#bbc7c6] mt-2 italic">
                              💡 Explicación: {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insertion Mode and Actions */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-[#edfffe] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={e => setReplaceExisting(e.target.checked)}
                    className="rounded accent-[#00827c]"
                  />
                  <span>Reemplazar preguntas existentes (en lugar de añadir)</span>
                </label>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setGeneratedQuestions([])}
                    className="px-3.5 py-2 rounded-md text-xs font-medium uppercase tracking-[0.08em] text-[#bbc7c6] hover:text-white transition"
                  >
                    Volver a Configurar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={selectedIds.size === 0}
                    className="btn-aurora px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Insertar {selectedIds.size} Preguntas</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

