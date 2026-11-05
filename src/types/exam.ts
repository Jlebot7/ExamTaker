export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open_ended';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
  points: number;
  type: QuestionType;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  maxViolations: number;
  isPublished: boolean;
  createdAt: number;
  createdBy: string; // UID del docente
  createdByName?: string;
  questions: Question[];
  totalPoints: number;
  randomizeQuestions?: boolean; // Si es true (por defecto), cada estudiante recibe las preguntas en orden aleatorio único
  requireCamera?: boolean; // Si es true, exige al estudiante activar la cámara web/celular para supervisión anti-plagio
}

// Clave secreta almacenada de forma aislada en /exam_keys/{examId}
// NUNCA se expone al estudiante durante la prueba
export interface QuestionKeyAnswer {
  correctOptionIds: string[]; // IDs de opciones correctas (para preguntas cerradas)
  points: number;
  rubric?: string; // Criterios esperados de evaluación y conceptos clave para preguntas abiertas
  idealAnswer?: string; // Respuesta modelo de referencia
}

export interface ExamKey {
  examId: string;
  createdBy: string;
  keys: Record<string, QuestionKeyAnswer>; // questionId -> QuestionKeyAnswer
}
