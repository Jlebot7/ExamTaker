// AI Exam Question Generator Service using Groq API (OpenAI-compatible) with intelligent fallback and Zod schema validation
import { z } from 'zod';
import type { QuestionType } from '../types';

export interface AiExamRequestParams {
  topic: string;
  count: number;
  questionType: 'single_choice' | 'true_false' | 'open_ended' | 'mixed';
  complexity: 'basico' | 'intermedio' | 'avanzado' | 'experto';
  pointsPerQuestion: number;
  customInstructions?: string;
  apiKey?: string;
  model?: string;
}

export interface GeneratedQuestionItem {
  id: string;
  prompt: string;
  type: QuestionType;
  points: number;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation?: string;
  rubric?: string;
  idealAnswer?: string;
}

const GROQ_STORAGE_KEY = 'examtaker_groq_api_key';
const GROQ_MODEL_KEY = 'examtaker_groq_model';

export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export const getStoredGroqKey = (): string => {
  return localStorage.getItem(GROQ_STORAGE_KEY) || (import.meta.env.VITE_GROQ_API_KEY as string) || '';
};

export const setStoredGroqKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem(GROQ_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(GROQ_STORAGE_KEY);
  }
};

export const getStoredGroqModel = (): string => {
  return localStorage.getItem(GROQ_MODEL_KEY) || DEFAULT_MODEL;
};

export const setStoredGroqModel = (model: string): void => {
  if (model.trim()) {
    localStorage.setItem(GROQ_MODEL_KEY, model.trim());
  } else {
    localStorage.removeItem(GROQ_MODEL_KEY);
  }
};

/**
 * Zod Schemas for runtime validation of Groq LLM responses
 */
const RawOptionSchema = z.union([
  z.object({
    id: z.string().optional(),
    text: z.union([z.string(), z.number()]).transform(String),
  }),
  z.union([z.string(), z.number()]).transform((val) => ({
    id: undefined,
    text: String(val),
  })),
]);

const RawQuestionSchema = z.object({
  prompt: z.string().min(1, 'El enunciado de la pregunta no puede estar vacío'),
  type: z.enum(['single_choice', 'true_false', 'multiple_choice', 'open_ended']).catch('single_choice'),
  points: z.number().positive().catch(5),
  options: z.array(RawOptionSchema).default([]),
  correctOptionIds: z.array(z.string()).optional(),
  correctOptionId: z.union([z.string(), z.number()]).transform(String).optional(),
  explanation: z.string().optional(),
  rubric: z.string().optional(),
  idealAnswer: z.string().optional(),
});

export const OpenAnswerEvaluationSchema = z.object({
  suggestedPoints: z.number().min(0),
  rationale: z.string(),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

const GroqResponseSchema = z.union([
  z.array(RawQuestionSchema),
  z.object({
    questions: z.array(RawQuestionSchema).optional(),
    items: z.array(RawQuestionSchema).optional(),
  }).transform(obj => obj.questions || obj.items || []),
]);

/**
 * Fetches the list of active models accessible by this Groq API key
 */
export async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];

    return data.data
      .map((m: { id: string }) => m.id)
      .filter((id: string) => 
        !id.includes('whisper') && 
        !id.includes('orpheus') && 
        !id.includes('safeguard') && 
        !id.includes('guard') &&
        !id.includes('tts')
      );
  } catch {
    return [];
  }
}

/**
 * Generates exam questions using Groq API or smart offline heuristic generator
 */
export async function generateExamQuestions(params: AiExamRequestParams): Promise<GeneratedQuestionItem[]> {
  const effectiveKey = (params.apiKey || getStoredGroqKey()).trim();

  if (effectiveKey) {
    try {
      return await generateWithGroq(params, effectiveKey);
    } catch (err: unknown) {
      console.warn('Groq API failed, checking error:', err);
      throw err;
    }
  }

  // Fallback to intelligent local generator if no API key is set
  return generateLocally(params);
}

/**
 * Call Groq OpenAI-compatible Chat Completions API with dynamic model discovery and smart cascade
 */
async function generateWithGroq(params: AiExamRequestParams, apiKey: string): Promise<GeneratedQuestionItem[]> {
  const systemPrompt = `Eres un docente universitario experto en diseño psicométrico y evaluación académica rigurosa.
Tu tarea es generar preguntas de evaluación de alta calidad pedagógica sobre el tema solicitado.
REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE con un JSON válido (array de objetos o { "questions": [...] }).
2. CADA pregunta DEBE tener:
   - "prompt": texto del enunciado claro y sin ambigüedades.
   - "type": "single_choice" (opción múltiple con 4 opciones), "true_false" (2 opciones), o "open_ended" (pregunta abierta / de desarrollo).
   - "points": puntaje asignado (entero positivo).
   - "options": lista de opciones [{"id": "opt_1", "text": "Opción A"}, ...] para cerradas, o [] para "open_ended".
   - "correctOptionIds": array con los IDs de las opciones correctas (ej: ["opt_1"]) para cerradas, o [] para "open_ended".
   - "explanation": justificación pedagógica de la respuesta correcta o conceptos clave.
   - Si el tipo es "open_ended", DEBES incluir:
     * "rubric": criterios de evaluación esperados y conceptos clave que el estudiante debe abordar.
     * "idealAnswer": respuesta modelo detallada que sirva de guía para la calificación.
3. No incluyas explicaciones fuera del JSON, ni markdown con formato extra que impida el parseo estricto.`;

  const userPrompt = `Genera ${params.count} preguntas sobre el tema: "${params.topic}".
Nivel de complejidad: ${params.complexity}.
Modalidad de preguntas solicitada: ${params.questionType}.
Puntos por pregunta sugeridos: ${params.pointsPerQuestion} pts.
${params.customInstructions ? `Instrucciones adicionales del docente: ${params.customInstructions}` : ''}

Recuerda: Si es opción múltiple, provee 4 opciones con distractores plausibles. Si es verdadero/falso, provee exactamente las 2 opciones correspondientes. Si es pregunta abierta (open_ended), provee el enunciado, la rúbrica detallada y la respuesta modelo.`;

  // 1. Fetch available models for this API key to know exactly what is active
  const activeModels = await getAvailableGroqModels(apiKey);

  // 2. Prepare priority cascade of models
  const candidateModels: string[] = [];

  // A. User selected / preferred model
  if (params.model) candidateModels.push(params.model);

  // B. Standard primary Groq models
  candidateModels.push(
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it'
  );

  // C. Add any models active on the user's account that we haven't tested
  for (const m of activeModels) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  // Filter out models known to NOT exist on this key if activeModels was successfully fetched
  const orderedModels = activeModels.length > 0
    ? candidateModels.filter(m => activeModels.includes(m))
    : candidateModels;

  const modelsToTry = orderedModels.length > 0 ? orderedModels : candidateModels;

  let response: Response | null = null;
  let lastError = '';
  let usedModel = '';

  const requestBody = (modelName: string) => JSON.stringify({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  for (const modelId of modelsToTry) {
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody(modelId),
      });

      if (response.ok) {
        usedModel = modelId;
        setStoredGroqModel(usedModel);
        break;
      }

      const errorJson = await response.json().catch(() => null);
      lastError = errorJson?.error?.message || response.statusText;

      // 401 Unauthorized or 429 Rate Limit shouldn't keep cycling models
      if (response.status === 401 || response.status === 429) {
        break;
      }
    } catch (fetchErr: unknown) {
      lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    }
  }

  if (!response || !response.ok) {
    if (response?.status === 401) {
      throw new Error('API Key de Groq inválida o expirada. Por favor revisa tu clave en console.groq.com/keys.');
    }
    if (response?.status === 429) {
      throw new Error('Límite de tasa (Rate limit) de Groq alcanzado. Espera unos segundos e intenta nuevamente.');
    }
    const modelInfo = activeModels.length > 0 
      ? ` Modelos disponibles en tu cuenta: ${activeModels.join(', ')}` 
      : '';
    throw new Error(`Error en la API de Groq: ${lastError || 'No se pudo conectar.'}.${modelInfo}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('La respuesta de Groq llegó vacía');
  }

  const parsed = JSON.parse(content);
  const validated = GroqResponseSchema.safeParse(parsed);

  if (!validated.success) {
    throw new Error(`La estructura devuelta por Groq no cumplió el esquema esperado: ${validated.error.issues.map(i => i.message).join(', ')}`);
  }

  const rawQuestions = validated.data;

  if (rawQuestions.length === 0) {
    throw new Error('No se detectaron preguntas en el formato esperado desde la respuesta de Groq');
  }

  return rawQuestions.map((q, idx: number) => {
    const qId = `q_ai_${Date.now()}_${idx + 1}`;
    const rawType = q.type;
    const type: QuestionType = 
      rawType === 'open_ended' ? 'open_ended' :
      rawType === 'true_false' ? 'true_false' : 
      rawType === 'multiple_choice' ? 'multiple_choice' : 'single_choice';

    let options = type === 'open_ended'
      ? []
      : Array.isArray(q.options)
      ? q.options.map((opt, optIdx: number) => ({
          id: opt.id || (type === 'true_false' ? (optIdx === 0 ? 'tf_true' : 'tf_false') : `opt_${optIdx + 1}`),
          text: String(opt.text || opt),
        }))
      : [];

    if (type === 'true_false' && options.length === 0) {
      options = [
        { id: 'tf_true', text: 'Verdadero' },
        { id: 'tf_false', text: 'Falso' },
      ];
    }

    let correctOptionIds: string[] = [];
    if (type === 'open_ended') {
      correctOptionIds = [];
    } else if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
      correctOptionIds = q.correctOptionIds;
    } else if (q.correctOptionId) {
      correctOptionIds = [String(q.correctOptionId)];
    } else if (type === 'true_false') {
      correctOptionIds = ['tf_true'];
    } else {
      correctOptionIds = [options[0]?.id || 'opt_1'];
    }

    return {
      id: qId,
      prompt: String(q.prompt || `Pregunta ${idx + 1} sobre ${params.topic}`),
      type,
      points: Number(q.points) || params.pointsPerQuestion || 5,
      options,
      correctOptionIds,
      explanation: q.explanation ? String(q.explanation) : undefined,
      rubric: q.rubric ? String(q.rubric) : undefined,
      idealAnswer: q.idealAnswer ? String(q.idealAnswer) : undefined,
    };
  });
}

/**
 * Intelligent local generator for immediate testing without internet/API keys
 */
function generateLocally(params: AiExamRequestParams): GeneratedQuestionItem[] {
  const result: GeneratedQuestionItem[] = [];
  const cleanTopic = params.topic.trim();

  for (let i = 0; i < params.count; i++) {
    const qIdx = i + 1;
    const isOpenEnded =
      params.questionType === 'open_ended' ||
      (params.questionType === 'mixed' && i % 3 === 2);

    const isTf =
      !isOpenEnded &&
      (params.questionType === 'true_false' ||
      (params.questionType === 'mixed' && i % 3 === 1));

    const qId = `q_local_${Date.now()}_${qIdx}`;

    if (isOpenEnded) {
      result.push({
        id: qId,
        prompt: `[${params.complexity.toUpperCase()}] Explica detalladamente cómo los principios fundamentales de "${cleanTopic}" influyen en la resolución del problema práctico #${qIdx}. Fundamenta tu respuesta con conceptos teóricos.`,
        type: 'open_ended',
        points: params.pointsPerQuestion || 5,
        options: [],
        correctOptionIds: [],
        rubric: `Criterios de evaluación: El alumno debe mencionar al menos dos conceptos centrales de ${cleanTopic}, explicar su relación causa-efecto y aplicar una terminología técnica coherente.`,
        idealAnswer: `Una respuesta completa analiza los fundamentos de ${cleanTopic}, articulando cómo estos determinan el diseño, rendimiento y estabilidad del sistema bajo estudio.`,
        explanation: `Pregunta abierta para evaluar capacidad analítica y síntesis conceptual sobre ${cleanTopic}.`,
      });
    } else if (isTf) {
      const isTrue = i % 2 === 0;
      result.push({
        id: qId,
        prompt: `[${params.complexity.toUpperCase()}] Respecto a "${cleanTopic}", ¿la siguiente afirmación es correcta? Enfoque de estudio #${qIdx}: Los principios fundamentales determinan el comportamiento operativo del sistema.`,
        type: 'true_false',
        points: params.pointsPerQuestion || 5,
        options: [
          { id: 'tf_true', text: 'Verdadero' },
          { id: 'tf_false', text: 'Falso' },
        ],
        correctOptionIds: [isTrue ? 'tf_true' : 'tf_false'],
        explanation: `Justificación pedagógica: En ${cleanTopic}, este enunciado refleja los conceptos teóricos estándar evaluados en este nivel de complejidad (${params.complexity}).`,
      });
    } else {
      result.push({
        id: qId,
        prompt: `[${params.complexity.toUpperCase()}] En el contexto de "${cleanTopic}", ¿cuál de las siguientes opciones describe con mayor precisión el concepto principal #${qIdx}?`,
        type: 'single_choice',
        points: params.pointsPerQuestion || 5,
        options: [
          { id: 'opt_1', text: `Aplica la definición teórica fundamental y los estándares clave de ${cleanTopic}.` },
          { id: 'opt_2', text: `Modifica arbitrariamente las variables sin considerar los principios de ${cleanTopic}.` },
          { id: 'opt_3', text: `Se limita exclusivamente a escenarios obsoletos o no validados experimentalmente.` },
          { id: 'opt_4', text: `Invalida los modelos matemáticos y analíticos aplicados en este dominio.` },
        ],
        correctOptionIds: ['opt_1'],
        explanation: `Justificación pedagógica: La opción A sintetiza los principios técnicos esenciales de ${cleanTopic}. Las demás opciones contienen distorsiones conceptuales.`,
      });
    }
  }

  return result;
}

export interface OpenAnswerEvaluationRequest {
  questionPrompt: string;
  maxPoints: number;
  rubric?: string;
  idealAnswer?: string;
  studentAnswer: string;
  apiKey?: string;
}

export interface OpenAnswerEvaluationResult {
  suggestedPoints: number;
  rationale: string;
  strengths: string[];
  improvements: string[];
  evaluatedModel: string;
}

/**
 * AI Pedagogical Evaluation for Open-Ended Student Answers.
 * Uses Groq LLM (always targeted to 'openai/gpt-oss-120b') to analyze semantic understanding,
 * recognizing paraphrasing, synonyms, and partial answers without requiring exact string matching.
 */
export async function evaluateOpenAnswerWithAi(
  params: OpenAnswerEvaluationRequest
): Promise<OpenAnswerEvaluationResult> {
  const effectiveKey = (params.apiKey || getStoredGroqKey()).trim();
  const evaluationModel = 'openai/gpt-oss-120b';

  const cleanAnswer = (params.studentAnswer || '').trim();

  // If answer is empty or whitespace
  if (!cleanAnswer) {
    return {
      suggestedPoints: 0,
      rationale: 'El estudiante no proporcionó ninguna respuesta a esta pregunta.',
      strengths: [],
      improvements: ['Redactar una explicación que responda a la consigna planteada.'],
      evaluatedModel: 'system-empty-check',
    };
  }

  // If no Groq API Key is present, provide intelligent local heuristic grading
  if (!effectiveKey) {
    const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
    const ratio = Math.min(1, Math.max(0.2, wordCount / 25));
    const localPoints = Math.round(params.maxPoints * ratio * 10) / 10;
    return {
      suggestedPoints: localPoints,
      rationale: `[Evaluación heurística local] Respuesta de ${wordCount} palabras recibida. Para evaluación semántica neuronal con GPT-OSS 120B, configura tu Groq API Key.`,
      strengths: ['El estudiante redactó una respuesta argumentada.'],
      improvements: ['Configurar API Key de Groq para análisis semántico profundo con openai/gpt-oss-120b.'],
      evaluatedModel: 'local-heuristic',
    };
  }

  const systemPrompt = `Eres un docente universitario y evaluador pedagógico experto.
Tu labor es calificar la respuesta abierta de un estudiante según el enunciado, el puntaje máximo y los criterios/rúbrica esperados.

REGLAS DE EVALUACIÓN SEMÁNTICA RIGUROSA:
1. NO exijas una coincidencia exacta de palabras o strings literales. Reconoce sinónimos, paráfrasis, explicaciones con vocabulario propio del estudiante y razonamientos conceptualmente válidos.
2. Si la respuesta es completamente acertada y cumple la rúbrica, otorga el puntaje máximo (${params.maxPoints}).
3. Si la respuesta es parcialmente correcta, incompleta o superficial, otorga un puntaje proporcional equitativo (ej. 2.5, 3.5, etc. entre 0 y ${params.maxPoints}).
4. Si la respuesta es totalmente errónea, inventada o no responde al enunciado, otorga 0 puntos.
5. Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "suggestedPoints": <número entre 0 y ${params.maxPoints}>,
  "rationale": "<explicación pedagógica clara y constructiva de por qué se otorgó ese puntaje>",
  "strengths": ["<punto fuerte 1>", "<punto fuerte 2>"],
  "improvements": ["<aspecto a mejorar o concepto omitido 1>"]
}`;

  const userPrompt = `Consigna de la Pregunta:
"${params.questionPrompt}"

Puntaje Máximo Posible: ${params.maxPoints} pts.

${params.rubric ? `Rúbrica y Criterios Esperados del Docente:\n"${params.rubric}"\n` : ''}
${params.idealAnswer ? `Respuesta Modelo / Conceptos Indispensables:\n"${params.idealAnswer}"\n` : ''}

Respuesta Redactada por el Estudiante:
"""
${cleanAnswer}
"""

Evalúa la respuesta del estudiante con criterio académico, equitativo y constructivo.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey}`,
      },
      body: JSON.stringify({
        model: evaluationModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // Low temperature for consistent grading
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    const parsedJson = JSON.parse(rawContent);
    const validated = OpenAnswerEvaluationSchema.parse(parsedJson);

    // Clamp score between 0 and maxPoints
    const clampedPoints = Math.min(params.maxPoints, Math.max(0, Math.round(validated.suggestedPoints * 10) / 10));

    return {
      suggestedPoints: clampedPoints,
      rationale: validated.rationale,
      strengths: validated.strengths || [],
      improvements: validated.improvements || [],
      evaluatedModel: evaluationModel,
    };
  } catch (err: unknown) {
    console.error('Error al evaluar respuesta abierta con Groq:', err);
    throw err;
  }
}
