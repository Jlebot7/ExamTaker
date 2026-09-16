import { 
  ref, 
  set, 
  get, 
  push, 
  remove, 
  onValue, 
  off, 
  query, 
  orderByChild, 
  equalTo 
} from 'firebase/database';
import { database, isFirebaseConfigured } from './firebaseConfig';
import type { Exam, ExamKey, Question } from '../types';
import { 
  getMockExams, 
  saveMockExam, 
  deleteMockExam, 
  getMockExamKey 
} from './mockStorage';

/**
 * Service for Exam CRUD operations and answer key protection.
 * Follows the Zero Answer-Key Leak architecture:
 * - Public details in /exams/{examId}
 * - Answers key in /exam_keys/{examId}
 */
export const examService = {
  /**
   * Creates a new exam with isolated answer key.
   */
  async createExam(
    examData: Omit<Exam, 'id' | 'createdAt' | 'totalPoints'>,
    questions: Question[],
    correctOptionsMap: Record<string, string[]> // questionId -> [correctOptionId]
  ): Promise<string> {
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const createdAt = Date.now();

    if (isFirebaseConfigured) {
      const examsRef = ref(database, 'exams');
      const newExamRef = push(examsRef);
      const examId = newExamRef.key!;

      const fullExam: Exam = {
        ...examData,
        id: examId,
        createdAt,
        questions,
        totalPoints,
      };

      // Construct isolated answer key
      const keysMap: Record<string, { correctOptionIds: string[]; points: number }> = {};
      questions.forEach(q => {
        keysMap[q.id] = {
          correctOptionIds: correctOptionsMap[q.id] || [],
          points: q.points || 1,
        };
      });

      const examKey: ExamKey = {
        examId,
        createdBy: examData.createdBy,
        keys: keysMap,
      };

      // Write public exam payload
      await set(ref(database, `exams/${examId}`), fullExam);

      // Write isolated secret key payload
      await set(ref(database, `exam_keys/${examId}`), examKey);

      return examId;
    } else {
      // Local fallback
      const examId = 'EXAM-' + Math.floor(1000 + Math.random() * 9000);
      const fullExam: Exam = {
        ...examData,
        id: examId,
        createdAt,
        questions,
        totalPoints,
      };

      const keysMap: Record<string, { correctOptionIds: string[]; points: number }> = {};
      questions.forEach(q => {
        keysMap[q.id] = {
          correctOptionIds: correctOptionsMap[q.id] || [],
          points: q.points || 1,
        };
      });

      const examKey: ExamKey = {
        examId,
        createdBy: examData.createdBy,
        keys: keysMap,
      };

      saveMockExam(fullExam, examKey);
      return examId;
    }
  },

  /**
   * Updates an existing exam and its key.
   */
  async updateExam(
    examId: string,
    examData: Partial<Exam>,
    questions?: Question[],
    correctOptionsMap?: Record<string, string[]>
  ): Promise<void> {
    const totalPoints = questions ? questions.reduce((sum, q) => sum + (q.points || 1), 0) : examData.totalPoints;

    if (isFirebaseConfigured) {
      const currentSnap = await get(ref(database, `exams/${examId}`));
      if (!currentSnap.exists()) throw new Error('El examen no existe');
      
      const updatedExam: Exam = {
        ...currentSnap.val(),
        ...examData,
        ...(questions ? { questions, totalPoints } : {}),
      };

      await set(ref(database, `exams/${examId}`), updatedExam);

      if (questions && correctOptionsMap) {
        const keysMap: Record<string, { correctOptionIds: string[]; points: number }> = {};
        questions.forEach(q => {
          keysMap[q.id] = {
            correctOptionIds: correctOptionsMap[q.id] || [],
            points: q.points || 1,
          };
        });

        const examKey: ExamKey = {
          examId,
          createdBy: updatedExam.createdBy,
          keys: keysMap,
        };

        await set(ref(database, `exam_keys/${examId}`), examKey);
      }
    } else {
      const exams = getMockExams();
      const current = exams.find(e => e.id === examId);
      if (!current) throw new Error('El examen no existe');

      const updatedExam: Exam = {
        ...current,
        ...examData,
        ...(questions ? { questions, totalPoints: totalPoints! } : {}),
      };

      let examKey: ExamKey | undefined;
      if (questions && correctOptionsMap) {
        const keysMap: Record<string, { correctOptionIds: string[]; points: number }> = {};
        questions.forEach(q => {
          keysMap[q.id] = {
            correctOptionIds: correctOptionsMap[q.id] || [],
            points: q.points || 1,
          };
        });
        examKey = {
          examId,
          createdBy: updatedExam.createdBy,
          keys: keysMap,
        };
      }

      saveMockExam(updatedExam, examKey);
    }
  },

  /**
   * Deletes an exam and its associated data.
   */
  async deleteExam(examId: string): Promise<void> {
    if (isFirebaseConfigured) {
      await Promise.all([
        remove(ref(database, `exams/${examId}`)),
        remove(ref(database, `exam_keys/${examId}`)),
        remove(ref(database, `submissions/${examId}`)),
        remove(ref(database, `logs/${examId}`)),
      ]);
    } else {
      deleteMockExam(examId);
    }
  },

  /**
   * Fetches public exam data (for students or overview).
   * Notice: This does NOT return the secret answer key.
   */
  async getExam(examId: string): Promise<Exam | null> {
    if (isFirebaseConfigured) {
      const snap = await get(ref(database, `exams/${examId}`));
      return snap.exists() ? snap.val() : null;
    } else {
      const exams = getMockExams();
      return exams.find(e => e.id.toLowerCase() === examId.toLowerCase()) || null;
    }
  },

  /**
   * Realtime subscription to an exam (for students or live updates).
   */
  subscribeToExam(examId: string, callback: (exam: Exam | null) => void): () => void {
    if (isFirebaseConfigured) {
      const examRef = ref(database, `exams/${examId}`);
      onValue(examRef, snapshot => {
        callback(snapshot.exists() ? snapshot.val() : null);
      });
      return () => off(examRef);
    } else {
      const exam = getMockExams().find(e => e.id.toLowerCase() === examId.toLowerCase()) || null;
      callback(exam);
      // Polling or simple timer mock
      const interval = setInterval(() => {
        const fresh = getMockExams().find(e => e.id.toLowerCase() === examId.toLowerCase()) || null;
        callback(fresh);
      }, 3000);
      return () => clearInterval(interval);
    }
  },

  /**
   * Teacher-only: Fetches secret answer key for evaluation.
   */
  async getExamKey(examId: string): Promise<ExamKey | null> {
    if (isFirebaseConfigured) {
      const snap = await get(ref(database, `exam_keys/${examId}`));
      return snap.exists() ? snap.val() : null;
    } else {
      return getMockExamKey(examId);
    }
  },

  /**
   * Teacher: Fetches list of exams created by the teacher.
   */
  async getExamsByTeacher(teacherUid: string): Promise<Exam[]> {
    if (isFirebaseConfigured) {
      const examsRef = ref(database, 'exams');
      const teacherQuery = query(examsRef, orderByChild('createdBy'), equalTo(teacherUid));
      const snap = await get(teacherQuery);
      if (!snap.exists()) return [];
      const list: Exam[] = [];
      snap.forEach(child => {
        list.push(child.val());
      });
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      const all = getMockExams();
      return all.filter(e => e.createdBy === teacherUid || teacherUid === 'teacher_demo_uid');
    }
  },
};
