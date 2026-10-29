import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import type {
  Submission,
  SubmissionStatus,
  IntegrityLog,
  ViolationEventType,
  ExamKey
} from '../types';
import {
  getMockSubmissions,
  saveMockSubmission,
  deleteMockSubmission,
  resetAllMockSubmissions,
  getMockLogs,
  addMockLog,
  getMockExamKey
} from './mockStorage';
import { shuffleArray } from '../utils/shuffle';
import { gradeSubmission } from '../utils/grading';

let serverTimeOffset = 0;

/**
 * Returns current estimated server timestamp in milliseconds.
 * The offset is calibrated from the server-written startedAt of a freshly created submission.
 */
export const getEstimatedServerTime = (): number => {
  return Date.now() + serverTimeOffset;
};

/** Firestore Timestamp | number | null -> epoch millis | null */
const toMillis = (value: unknown): number | null => {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return null;
};

/**
 * Normalizes a Firestore submission document. startedAt and submittedAt are written with
 * serverTimestamp() (validated by the security rules) and are converted back to millis here,
 * so the rest of the app keeps working with numbers.
 */
const toSubmission = (data: DocumentData): Submission => ({
  ...(data as Submission),
  startedAt: toMillis(data.startedAt) ?? Date.now(),
  submittedAt: toMillis(data.submittedAt),
});

export const studentService = {
  /**
   * Initializes or returns existing student submission session in Cloud Firestore.
   * If questionIds are provided, generates a randomized question order for this student.
   */
  async startOrGetSubmission(
    examId: string,
    studentUid: string,
    studentName: string,
    studentCode: string,
    questionIds?: string[],
    shouldRandomize: boolean = true
  ): Promise<Submission> {
    const generateOrder = () => {
      if (!questionIds || questionIds.length === 0) return [];
      return shouldRandomize ? shuffleArray(questionIds) : [...questionIds];
    };

    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      const snap = await getDoc(subRef);

      if (snap.exists()) {
        const data = toSubmission(snap.data());

        // Persist a question order only if none exists yet (the rules reject overwriting it)
        if ((!data.questionOrder || data.questionOrder.length === 0) && questionIds && questionIds.length > 0 && data.status === 'in_progress') {
          const newOrder = generateOrder();
          data.questionOrder = newOrder;
          await updateDoc(subRef, { questionOrder: newOrder });
        }

        return data;
      }

      const localBefore = Date.now();
      // startedAt MUST be the server time: the rules enforce startedAt == request.time
      await setDoc(subRef, {
        studentUid,
        studentName,
        studentCode,
        startedAt: serverTimestamp(),
        submittedAt: null,
        status: 'in_progress',
        answers: {},
        violationCount: 0,
        finalScore: null,
        maxScore: null,
        questionOrder: generateOrder(),
      });

      const created = await getDoc(subRef);
      const localAfter = Date.now();
      const submission = toSubmission(created.data() ?? {});
      // Calibrate the client clock against the server (midpoint of the round trip)
      serverTimeOffset = submission.startedAt - Math.round((localBefore + localAfter) / 2);
      return submission;
    } else {
      const subs = getMockSubmissions(examId);
      if (subs[studentUid]) {
        const data = subs[studentUid];
        if ((!data.questionOrder || data.questionOrder.length === 0) && questionIds && questionIds.length > 0) {
          data.questionOrder = generateOrder();
          saveMockSubmission(examId, data);
        }
        return data;
      }

      const initialSubmission: Submission = {
        studentUid,
        studentName,
        studentCode,
        startedAt: Date.now(),
        submittedAt: null,
        status: 'in_progress',
        answers: {},
        violationCount: 0,
        finalScore: null,
        maxScore: null,
        questionOrder: generateOrder(),
      };

      saveMockSubmission(examId, initialSubmission);
      return initialSubmission;
    }
  },

  /**
   * Saves or updates a single question answer in real-time in Cloud Firestore.
   */
  async saveAnswer(
    examId: string,
    studentUid: string,
    questionId: string,
    selectedOption: string | string[]
  ): Promise<void> {
    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      await setDoc(
        subRef,
        {
          answers: {
            [questionId]: selectedOption,
          },
        },
        { merge: true }
      );
    } else {
      const subs = getMockSubmissions(examId);
      const sub = subs[studentUid];
      if (sub) {
        sub.answers[questionId] = selectedOption;
        saveMockSubmission(examId, sub);
      }
    }
  },

  /**
   * Records an integrity violation log and increments violation counter.
   * Log and counter are written atomically; the rules only allow the counter to grow.
   */
  async logViolation(
    examId: string,
    studentUid: string,
    eventType: ViolationEventType,
    details: string,
    currentViolationCount: number
  ): Promise<number> {
    const nextCount = currentViolationCount + 1;
    const timestamp = getEstimatedServerTime();

    if (isFirebaseConfigured) {
      const logsCol = collection(db, 'exams', examId, 'submissions', studentUid, 'logs');
      const logDoc = doc(logsCol);
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);

      const logData: IntegrityLog = {
        id: logDoc.id,
        timestamp,
        eventType,
        details,
        violationNumber: nextCount,
      };

      const batch = writeBatch(db);
      batch.set(logDoc, logData);
      batch.update(subRef, { violationCount: nextCount });
      await batch.commit();
    } else {
      const logData: IntegrityLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        timestamp,
        eventType,
        details,
        violationNumber: nextCount,
      };
      addMockLog(examId, studentUid, logData);

      const subs = getMockSubmissions(examId);
      const sub = subs[studentUid];
      if (sub) {
        sub.violationCount = nextCount;
        saveMockSubmission(examId, sub);
      }
    }

    return nextCount;
  },

  /**
   * Submits the exam (manually by student, by timeout, or disqualified by anti-cheat).
   *
   * SECURITY: in Firebase mode the student only locks the submission. The student never
   * reads the answer key nor writes a score; grading is done by the teacher's client
   * (see gradePendingSubmissions) or, ideally, by a Cloud Function.
   */
  async submitExam(
    examId: string,
    studentUid: string,
    status: SubmissionStatus = 'submitted',
    examKey?: ExamKey | null
  ): Promise<Submission> {
    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      const snap = await getDoc(subRef);
      if (!snap.exists()) throw new Error('Envío no encontrado');
      const current = toSubmission(snap.data());

      if (current.status !== 'in_progress') {
        return current;
      }

      await updateDoc(subRef, {
        submittedAt: serverTimestamp(),
        status,
      });

      return {
        ...current,
        submittedAt: getEstimatedServerTime(),
        status,
        finalScore: null,
        maxScore: null,
      };
    } else {
      const subs = getMockSubmissions(examId);
      const currentSubmission = subs[studentUid];
      if (!currentSubmission) throw new Error('Envío no encontrado');

      const activeKey = examKey || getMockExamKey(examId);
      let finalScore: number | null = status === 'disqualified' ? 0 : null;
      let maxScore: number | null = null;
      if (activeKey) {
        const result = gradeSubmission(currentSubmission.answers, activeKey, status);
        finalScore = result.finalScore;
        maxScore = result.maxScore;
      }

      currentSubmission.submittedAt = Date.now();
      currentSubmission.status = status;
      currentSubmission.finalScore = finalScore;
      currentSubmission.maxScore = maxScore;
      saveMockSubmission(examId, currentSubmission);
      return currentSubmission;
    }
  },

  /**
   * Teacher-only: grades every finished submission that has no score yet and writes the result.
   * Returns how many submissions were graded.
   */
  async gradePendingSubmissions(
    examId: string,
    submissions: Record<string, Submission>,
    examKey: ExamKey
  ): Promise<number> {
    const pending = Object.entries(submissions).filter(
      ([, sub]) => sub.status !== 'in_progress' && sub.finalScore === null
    );
    if (pending.length === 0) return 0;

    if (isFirebaseConfigured) {
      const batch = writeBatch(db);
      pending.forEach(([uid, sub]) => {
        const { finalScore, maxScore } = gradeSubmission(sub.answers, examKey, sub.status);
        batch.update(doc(db, 'exams', examId, 'submissions', uid), { finalScore, maxScore });
      });
      await batch.commit();
    } else {
      pending.forEach(([, sub]) => {
        const { finalScore, maxScore } = gradeSubmission(sub.answers, examKey, sub.status);
        saveMockSubmission(examId, { ...sub, finalScore, maxScore });
      });
    }

    return pending.length;
  },

  /**
   * Realtime subscription to submissions of an exam (Teacher view) using Cloud Firestore.
   */
  subscribeToSubmissions(
    examId: string,
    callback: (submissions: Record<string, Submission>) => void
  ): () => void {
    if (isFirebaseConfigured) {
      const subsRef = collection(db, 'exams', examId, 'submissions');
      const unsubscribe = onSnapshot(subsRef, snap => {
        const subsMap: Record<string, Submission> = {};
        snap.forEach(docSnap => {
          subsMap[docSnap.id] = toSubmission(docSnap.data());
        });
        callback(subsMap);
      });
      return unsubscribe;
    } else {
      callback(getMockSubmissions(examId));
      const interval = setInterval(() => {
        callback(getMockSubmissions(examId));
      }, 2000);
      return () => clearInterval(interval);
    }
  },

  /**
   * Realtime subscription to a single student's own submission (used to show the score
   * once the teacher grades it).
   */
  subscribeToSubmission(
    examId: string,
    studentUid: string,
    callback: (submission: Submission | null) => void
  ): () => void {
    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      return onSnapshot(subRef, snap => {
        callback(snap.exists() ? toSubmission(snap.data()) : null);
      });
    } else {
      const read = () => callback(getMockSubmissions(examId)[studentUid] || null);
      read();
      const interval = setInterval(read, 3000);
      return () => clearInterval(interval);
    }
  },

  /**
   * Realtime subscription to student audit logs (Teacher view) using Cloud Firestore.
   */
  subscribeToStudentLogs(
    examId: string,
    studentUid: string,
    callback: (logs: IntegrityLog[]) => void
  ): () => void {
    if (isFirebaseConfigured) {
      const logsRef = collection(db, 'exams', examId, 'submissions', studentUid, 'logs');
      const unsubscribe = onSnapshot(logsRef, snap => {
        const list: IntegrityLog[] = [];
        snap.forEach(child => {
          list.push({ id: child.id, ...(child.data() as Omit<IntegrityLog, 'id'>) });
        });
        callback(list.sort((a, b) => a.timestamp - b.timestamp));
      });
      return unsubscribe;
    } else {
      callback(getMockLogs(examId, studentUid));
      const interval = setInterval(() => {
        callback(getMockLogs(examId, studentUid));
      }, 2000);
      return () => clearInterval(interval);
    }
  },

  /**
   * Gets student submission without automatically creating one if it doesn't exist.
   */
  async getSubmission(examId: string, studentUid: string): Promise<Submission | null> {
    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      const snap = await getDoc(subRef);
      return snap.exists() ? toSubmission(snap.data()) : null;
    } else {
      const subs = getMockSubmissions(examId);
      return subs[studentUid] || null;
    }
  },

  /**
   * Resets a single student submission and its integrity logs, allowing them to take the exam again.
   */
  async resetStudentSubmission(examId: string, studentUid: string): Promise<void> {
    if (isFirebaseConfigured) {
      // 1. Delete all audit logs
      const logsCol = collection(db, 'exams', examId, 'submissions', studentUid, 'logs');
      const logsSnap = await getDocs(logsCol);
      const logDeletePromises = logsSnap.docs.map(logDoc => deleteDoc(logDoc.ref));
      await Promise.all(logDeletePromises);

      // 2. Delete the submission document
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      await deleteDoc(subRef);
    } else {
      deleteMockSubmission(examId, studentUid);
    }
  },

  /**
   * Resets all student submissions and logs for an exam, allowing everyone to take it again.
   */
  async resetAllSubmissions(examId: string): Promise<void> {
    if (isFirebaseConfigured) {
      const subsCol = collection(db, 'exams', examId, 'submissions');
      const subsSnap = await getDocs(subsCol);

      const deletePromises = subsSnap.docs.map(async (subDoc) => {
        const logsCol = collection(db, 'exams', examId, 'submissions', subDoc.id, 'logs');
        const logsSnap = await getDocs(logsCol);
        await Promise.all(logsSnap.docs.map(logDoc => deleteDoc(logDoc.ref)));
        await deleteDoc(subDoc.ref);
      });

      await Promise.all(deletePromises);
    } else {
      resetAllMockSubmissions(examId);
    }
  },
};
