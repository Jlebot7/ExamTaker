import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  HelpCircle,
  Sparkles,
  Check
} from 'lucide-react';
import { extractTextFromDocx, parseQuestionsFromText, type ParsedImportItem } from '../../utils/wordExamParser';

interface WordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: ParsedImportItem[], replaceExisting: boolean) => void;
}

const SAMPLE_FORMAT = `1. ¿Cuál es la capital de Francia?
A) Madrid
B) Berlín
*C) París
D) Roma

2. ¿Cuáles son lenguajes de programación?
A) HTML
*B) Python
*C) TypeScript
D) CSS
Respuesta: B, C

3. La Tierra es el tercer planeta desde el Sol.
*A) Verdadero
B) Falso`;

export const WordImportModal: React.FC<WordImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      setErrorMessage('Por favor selecciona un archivo de Word válido (.docx) o un archivo de texto (.txt).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSelectedFileName(file.name);

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      } else {
        text = await file.text();
      }

      setInputText(text);
      const parsed = parseQuestionsFromText(text);
      setParsedItems(parsed);

      if (parsed.length === 0) {
        setErrorMessage('No se pudieron detectar preguntas en el formato esperado. Revisa que las preguntas tengan opciones (A, B, C, D) y respuestas.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo Word.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    setErrorMessage(null);
    const parsed = parseQuestionsFromText(text);
    setParsedItems(parsed);
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_FORMAT);
    const parsed = parseQuestionsFromText(SAMPLE_FORMAT);
    setParsedItems(parsed);
    setActiveTab('text');
  };

  const toggleOptionCorrect = (qIndex: number, optionId: string) => {
    setParsedItems(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };

      if (q.type === 'multiple_choice') {
        if (q.correctOptionIds.includes(optionId)) {
          q.correctOptionIds = q.correctOptionIds.filter(id => id !== optionId);
        } else {
          q.correctOptionIds = [...q.correctOptionIds, optionId];
        }
      } else {
        q.correctOptionIds = [optionId];
      }

      updated[qIndex] = q;
      return updated;
    });
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;
    onImport(parsedItems, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#011d1c]/80 backdrop-blur-md animate-fadeIn">
      <div className="surface-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 bg-[#003734] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#011d1c] border border-white/10 flex items-center justify-center text-[#cbfffc]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="eyebrow-label text-[10px] text-[#edfffe] block">Auros • Importador DOCX</span>
              <h2 className="text-base sm:text-lg font-medium text-white tracking-tight">
                Importar Preguntas desde Word
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#012624]/60">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`px-4 py-2 rounded-md text-xs font-medium uppercase tracking-[0.08em] flex items-center gap-2 transition border ${
                  activeTab === 'file'
                    ? 'bg-[#003734] border-[#cbfffc] text-white'
                    : 'bg-[#011d1c] border-white/10 text-[#bbc7c6] hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Archivo .docx</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-4 py-2 rounded-md text-xs font-medium uppercase tracking-[0.08em] flex items-center gap-2 transition border ${
                  activeTab === 'text'
                    ? 'bg-[#003734] border-[#cbfffc] text-white'
                    : 'bg-[#011d1c] border-white/10 text-[#bbc7c6] hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Pegar Texto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-[#cbfffc] hover:underline flex items-center gap-1.5 transition uppercase tracking-[0.08em]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ver ejemplo de formato</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'file' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border border-dashed border-white/20 hover:border-[#cbfffc] rounded-xl p-8 text-center cursor-pointer transition surface-deep group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-md bg-[#003734] text-[#cbfffc] border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white">
                {selectedFileName ? selectedFileName : 'Arrastra tu archivo .docx aquí o haz clic para explorar'}
              </p>
              <p className="text-xs text-[#707777] mt-1">
                Formatos soportados: Microsoft Word (.docx) o Archivo de texto (.txt)
              </p>
              {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[#cbfffc] text-xs font-mono">
                  <div className="w-4 h-4 border-2 border-[#cbfffc] border-t-transparent rounded-full animate-spin"></div>
                  Procesando documento...
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.08em] font-medium text-[#edfffe]">
                Contenido copiado de Word:
              </label>
              <textarea
                rows={8}
                value={inputText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`1. ¿Cuál es la capital de Italia?\nA) Madrid\nB) Berlín\n*C) Roma\nD) Lisboa\n\nRespuesta: C`}
                className="w-full rounded-md bg-[#011d1c] border border-white/15 p-4 text-xs font-mono text-white placeholder-[#707777] focus:outline-none focus:border-[#cbfffc] transition resize-none"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-md bg-[#011d1c] border border-rose-500/40 text-[#edfffe] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Questions Preview Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#cbfffc]"></span>
                  <h3 className="text-sm font-medium text-white">
                    Preguntas Detectadas ({parsedItems.length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#bbc7c6]">
                  Haz clic en las opciones para alternar la respuesta correcta
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {parsedItems.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl surface-deep border border-white/10 text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-white">
                        <span className="text-[#cbfffc] font-mono mr-1.5">{qIdx + 1}.</span>
                        {q.prompt}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#003734] text-[#edfffe] uppercase font-mono">
                        {q.type === 'multiple_choice' ? 'Múltiple' : q.type === 'true_false' ? 'V/F' : 'Única'}
                      </span>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map(opt => {
                        const isCorrect = q.correctOptionIds.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleOptionCorrect(qIdx, opt.id)}
                            className={`p-2 rounded-md text-left flex items-center justify-between gap-2 border transition ${
                              isCorrect
                                ? 'bg-[#003734] border-[#00827c] text-white font-medium'
                                : 'bg-[#011d1c] border-white/10 text-[#bbc7c6] hover:border-white/20'
                            }`}
                          >
                            <span className="truncate">{opt.text}</span>
                            {isCorrect ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#cbfffc] shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formatting Help Guide */}
          {parsedItems.length === 0 && !errorMessage && (
            <div className="p-4 rounded-xl surface-deep border border-white/10 text-xs space-y-2 text-[#bbc7c6]">
              <div className="flex items-center gap-1.5 text-[#edfffe] font-medium uppercase tracking-[0.08em]">
                <HelpCircle className="w-3.5 h-3.5 text-[#cbfffc]" />
                <span>Guía de formato compatible:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-[#bbc7c6]">
                <li>Numera cada pregunta (ej: <code className="text-white">1. ¿Pregunta?</code>).</li>
                <li>Escribe cada opción con letra (ej: <code className="text-white">A) Opción</code>, <code className="text-white">B) Opción</code>).</li>
                <li>Indica la correcta con asterisco (ej: <code className="text-[#cbfffc]">*C) Opción</code>) o al final <code className="text-[#cbfffc]">Respuesta: C</code>.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#003734]">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#edfffe]">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={e => setReplaceExisting(e.target.checked)}
              className="rounded accent-[#00827c]"
            />
            <span>Reemplazar las preguntas actuales</span>
          </label>

          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] rounded-md text-[#bbc7c6] hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedItems.length === 0}
              onClick={handleConfirmImport}
              className="btn-aurora px-4 py-2 flex items-center gap-2 disabled:opacity-40"
            >
              <Check className="w-4 h-4 text-[#012624]" />
              <span>Importar {parsedItems.length > 0 ? `(${parsedItems.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
