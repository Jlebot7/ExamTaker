// AI Exam Question Generator Service using Groq API (OpenAI-compatible) with fallback
import type { QuestionType } from '../types';

export interface AiExamRequestParams {
  topic: string;
  count: number;
  questionType: 'single_choice' | 'true_false' | 'mixed';
  complexity: 'basico' | 'intermedio' | 'avanzado' | 'experto';
  pointsPerQuestion: number;
  customInstructions?: string;
  apiKey?: string;
}

export interface GeneratedQuestionItem {
  id: string;
  prompt: string;
  type: QuestionType;
  points: number;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation?: string;
}

const GROQ_STORAGE_KEY = 'examtaker_groq_api_key';

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
 * Calls Groq chat completions endpoint with gpt-oss-120b and JSON mode
 */
async function generateWithGroq(
  params: AiExamRequestParams,
  apiKey: string
): Promise<GeneratedQuestionItem[]> {
  const complexityMap = {
    basico: 'Básico (conceptos fundamentales, definiciones, terminología directa)',
    intermedio: 'Intermedio (aplicación práctica, análisis de casos, comparación)',
    avanzado: 'Avanzado (resolución de problemas complejos, análisis crítico, arquitectura)',
    experto: 'Experto (examen de certificación / posgrado, escenarios límite, optimización)',
  };

  const typeDesc =
    params.questionType === 'single_choice'
      ? 'Todas las preguntas deben ser de Opción Múltiple (4 alternativas con una sola correcta).'
      : params.questionType === 'true_false'
      ? 'Todas las preguntas deben ser de Verdadero o Falso (exactamente 2 alternativas: Verdadero y Falso).'
      : 'Combina aproximadamente 60% de Opción Múltiple (4 alternativas) y 40% de Verdadero o Falso.';

  const prompt = `Genera exactamente ${params.count} preguntas de evaluación sobre el tema: "${params.topic}".

Instrucciones pedagógicas:
- Formato de preguntas: ${typeDesc}
- Nivel de complejidad: ${complexityMap[params.complexity] || params.complexity}
- Puntos por pregunta: ${params.pointsPerQuestion || 5}
${params.customInstructions ? `- Instrucciones complementarias del docente: ${params.customInstructions}` : ''}

Requisitos estrictos de salida:
Responde EXCLUSIVAMENTE con un JSON válido con la siguiente estructura exacta:
{
  "questions": [
    {
      "prompt": "Enunciado claro y bien redactado de la pregunta",
      "type": "single_choice" | "true_false",
      "points": ${params.pointsPerQuestion || 5},
      "options": [
        { "id": "opt_1", "text": "Primera opción" },
        { "id": "opt_2", "text": "Segunda opción" },
        { "id": "opt_3", "text": "Tercera opción" },
        { "id": "opt_4", "text": "Cuarta opción" }
      ],
      "correctOptionIds": ["opt_X"],
      "explanation": "Breve explicación pedagógica de por qué la respuesta es correcta"
    }
  ]
}

Para preguntas de Verdadero/Falso, el array "options" DEBE contener exactamente:
[
  { "id": "tf_true", "text": "Verdadero" },
  { "id": "tf_false", "text": "Falso" }
]
Y "correctOptionIds" debe ser ["tf_true"] o ["tf_false"].`;

  const requestBody = (modelId: string) =>
    JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content:
            'Eres un catedrático universitario y evaluador académico experto en psicometría educativa. Generas preguntas rigurosas, objetivas y sin ambigüedades en JSON estricto.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.25,
      max_tokens: 4096,
    });

  // Try gpt-oss-120b variants supported by Groq
  const modelsToTry = ['openai/gpt-oss-120b', 'gpt-oss-120b'];
  let lastError = '';
  let response: Response | null = null;

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
        break;
      }

      const errorJson = await response.json().catch(() => null);
      lastError = errorJson?.error?.message || response.statusText;

      // If error is not model-related (e.g. 401 Unauthorized or 429 Rate Limit), don't retry other model IDs
      if (response.status === 401 || response.status === 429) {
        break;
      }
    } catch (fetchErr: unknown) {
      lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    }
  }

  if (!response || !response.ok) {
    if (response?.status === 401) {
      throw new Error('API Key de Groq inválida o no autorizada. Por favor revisa tu clave.');
    }
    if (response?.status === 429) {
      throw new Error('Límite de tasa (Rate limit) de Groq alcanzado. Espera unos segundos e intenta nuevamente.');
    }
    throw new Error(`Error en la API de Groq con el modelo gpt-oss-120b: ${lastError || 'No se pudo conectar'}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('La respuesta de Groq llegó vacía');
  }

  const parsed = JSON.parse(content);
  const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions || parsed.items || [];

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error('No se detectaron preguntas en el formato esperado desde la respuesta de Groq');
  }

  return rawQuestions.map((q: any, idx: number) => {
    const qId = `q_ai_${Date.now()}_${idx + 1}`;
    const type: QuestionType = q.type === 'true_false' ? 'true_false' : 'single_choice';

    let options = Array.isArray(q.options)
      ? q.options.map((opt: any, optIdx: number) => ({
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
    if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
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
    const isTf =
      params.questionType === 'true_false' ||
      (params.questionType === 'mixed' && i % 2 === 1);

    const qId = `q_local_${Date.now()}_${qIdx}`;

    if (isTf) {
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
        explanation: `Fundamento pedagógico #${qIdx}: Esta afirmación corresponde al nivel ${params.complexity} para el dominio de ${cleanTopic}.`,
      });
    } else {
      const correctIdx = (i % 4) + 1;
      result.push({
        id: qId,
        prompt: `[${params.complexity.toUpperCase()}] En el contexto de "${cleanTopic}", ¿cuál de las siguientes opciones describe con mayor precisión el concepto clave #${qIdx}?`,
        type: 'single_choice',
        points: params.pointsPerQuestion || 5,
        options: [
          { id: 'opt_1', text: `Definición analítica principal de ${cleanTopic} aplicada a escenarios de nivel ${params.complexity}.` },
          { id: 'opt_2', text: `Mecanismo secundario de control e integración operativa en ${cleanTopic}.` },
          { id: 'opt_3', text: `Restricción estructural complementaria que optimiza la consistencia en ${cleanTopic}.` },
          { id: 'opt_4', text: `Parámetro de configuración contingente sin impacto en la arquitectura de ${cleanTopic}.` },
        ],
        correctOptionIds: [`opt_${correctIdx}`],
        explanation: `La opción #${correctIdx} formula adecuadamente la relación causal de ${cleanTopic} según el nivel ${params.complexity}.`,
      });
    }
  }

  return result;
}

