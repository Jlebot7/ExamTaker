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
        // Single choice or true/false
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                Importar Preguntas desde Word
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  Formato Testportal
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
                Carga un archivo .docx o pega el contenido copiado de tu documento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition ${
                  activeTab === 'file'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Subir Archivo .docx
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition ${
                  activeTab === 'text'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Pegar Texto de Word
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ver formato de ejemplo
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
              className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-blue-950/10 group"
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
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                {selectedFileName ? selectedFileName : 'Arrastra tu archivo .docx aquí o haz clic para explorar'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos soportados: Microsoft Word (.docx) o Archivo de texto (.txt)
              </p>
              {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-400 text-xs font-medium">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Procesando documento Word...
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {activeTab === 'text' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  Pega aquí el contenido copiado de tu documento Word:
                </label>
                <span className="text-[11px] text-slate-500">
                  Usa asterisco (*) o &quot;Respuesta: Letra&quot; para indicar la opción correcta
                </span>
              </div>
              <textarea
                rows={8}
                value={inputText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`1. ¿Cuál es la capital de Italia?\nA) Madrid\nB) París\n*C) Roma\nD) Lisboa\n\n2. Pregunta de opción múltiple...\nRespuesta: A, B`}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Questions Preview Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <h3 className="text-sm font-bold text-white">
                    Preguntas Detectadas ({parsedItems.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Haz clic en las opciones marcadas en verde para cambiar la respuesta correcta
                </span>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                {parsedItems.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-white">
                        <span className="text-blue-400 font-bold mr-1.5">{qIdx + 1}.</span>
                        {q.prompt}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase font-mono">
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
                            className={`p-2 rounded-xl text-left flex items-center justify-between gap-2 border transition ${
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{opt.text}</span>
                            {isCorrect ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0"></span>
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
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2 text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                Guía de formato compatible (Word / Testportal):
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                <li>Numera cada pregunta (ej: <code className="text-slate-300">1. ¿Pregunta?</code> o <code className="text-slate-300">Pregunta 1:</code>).</li>
                <li>Escribe cada opción en una línea con prefijo de letra (ej: <code className="text-slate-300">A) Opción</code>, <code className="text-slate-300">B. Opción</code>).</li>
                <li>
                  Para indicar la respuesta correcta, coloca un asterisco al inicio (ej: <code className="text-emerald-400">*C) Opción</code>) o añade una línea al final como <code className="text-emerald-400">Respuesta: C</code>.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={e => setReplaceExisting(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Reemplazar las preguntas actuales</span>
          </label>

          <div className="flex items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedItems.length === 0}
              onClick={handleConfirmImport}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 sm:gap-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>Importar {parsedItems.length > 0 ? `(${parsedItems.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
