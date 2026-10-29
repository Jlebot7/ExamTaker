import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './firebaseConfig';
import type { Exam, ExamKey, Question } from '../types';
import { 
  getMockExams, 
  saveMockExam, 
  deleteMockExam, 
  getMockExamKey 
} from './mockStorage';

const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

/** Cryptographically random exam PIN, e.g. EX-7KQ2M9 */
const generatePin = (length = 6): string => {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return 'EX-' + Array.from(bytes, b => PIN_ALPHABET[b % PIN_ALPHABET.length]).join('');
};

/**
 * Service for Exam CRUD operations and answer key protection using Cloud Firestore.
 * Follows the Zero Answer-Key Leak architecture:
 * - Public details in /exams/{examId}
 * - Answers key strictly isolated in /exam_keys/{examId}
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
    let pin = generatePin();

    if (isFirebaseConfigured) {
      // Avoid overwriting an existing exam on the (unlikely) event of a PIN collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await getDoc(doc(db, 'exams', pin)).catch(() => null);
        if (!existing || !existing.exists()) break;
        pin = generatePin();
      }
      const examId = pin;
      const examRef = doc(db, 'exams', examId);
      const keyRef = doc(db, 'exam_keys', examId);

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

      // Write public exam and isolated secret key atomically
      const batch = writeBatch(db);
      batch.set(examRef, fullExam);
      batch.set(keyRef, examKey);
      await batch.commit();

      return examId;
    } else {
      // Local fallback
      const examId = pin;
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
      const examRef = doc(db, 'exams', examId);
      const currentSnap = await getDoc(examRef);
      if (!currentSnap.exists()) throw new Error('El examen no existe');
      
      const updatedExam: Exam = {
        ...(currentSnap.data() as Exam),
        ...examData,
        ...(questions ? { questions, totalPoints: totalPoints! } : {}),
      };

      const batch = writeBatch(db);
      batch.set(examRef, updatedExam);

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

        // IMPORTANT: no merge here. A merge deep-merges the nested `keys` map, so deleted
        // questions would stay in the key and keep adding to maxScore.
        const keyRef = doc(db, 'exam_keys', examId);
        batch.set(keyRef, examKey);
      }

      await batch.commit();
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
      const batch = writeBatch(db);
      batch.delete(doc(db, 'exam_keys', examId));
      batch.delete(doc(db, 'exams', examId));
      await batch.commit();
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
      // Ensure the visitor has an anonymous session so Firestore security rules can authenticate the read
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn('Anonymous sign-in on getExam fallback:', authErr);
        }
      }

      try {
        let snap = await getDoc(doc(db, 'exams', examId));
        if (!snap.exists() && examId !== examId.toUpperCase()) {
          snap = await getDoc(doc(db, 'exams', examId.toUpperCase()));
        }
        return snap.exists() ? (snap.data() as Exam) : null;
      } catch (err: unknown) {
        const firebaseErr = err as { code?: string };
        // If a document does not exist or is not published, strict rules can trigger permission-denied
        if (firebaseErr?.code === 'permission-denied') {
          return null;
        }
        throw err;
      }
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
      const examRef = doc(db, 'exams', examId);
      const unsubscribe = onSnapshot(examRef, snapshot => {
        callback(snapshot.exists() ? (snapshot.data() as Exam) : null);
      });
      return unsubscribe;
    } else {
      const exam = getMockExams().find(e => e.id.toLowerCase() === examId.toLowerCase()) || null;
      callback(exam);
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
      const snap = await getDoc(doc(db, 'exam_keys', examId));
      return snap.exists() ? (snap.data() as ExamKey) : null;
    } else {
      return getMockExamKey(examId);
    }
  },

  /**
   * Teacher: Fetches list of exams created by the teacher.
   */
  async getExamsByTeacher(teacherUid: string): Promise<Exam[]> {
    if (isFirebaseConfigured) {
      const examsRef = collection(db, 'exams');
      const teacherQuery = query(examsRef, where('createdBy', '==', teacherUid));
      const snap = await getDocs(teacherQuery);
      if (snap.empty) return [];
      const list: Exam[] = [];
      snap.forEach(child => {
        list.push(child.data() as Exam);
      });
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      const all = getMockExams();
      return all.filter(e => e.createdBy === teacherUid || teacherUid === 'teacher_demo_uid');
    }
  },
};
