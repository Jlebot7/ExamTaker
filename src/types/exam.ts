export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

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
}

// Clave secreta almacenada de forma aislada en /exam_keys/{examId}
// NUNCA se expone al estudiante durante la prueba
export interface QuestionKeyAnswer {
  correctOptionIds: string[]; // IDs de opciones correctas
  points: number;
}

export interface ExamKey {
  examId: string;
  createdBy: string;
  keys: Record<string, QuestionKeyAnswer>; // questionId -> QuestionKeyAnswer
}
