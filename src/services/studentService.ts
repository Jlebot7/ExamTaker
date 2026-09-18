import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  updateDoc, 
  onSnapshot 
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
import { examService } from './examService';

let serverTimeOffset = 0;

/**
 * Returns current estimated server timestamp in milliseconds.
 */
export const getEstimatedServerTime = (): number => {
  return Date.now() + serverTimeOffset;
};

export const studentService = {
  /**
   * Initializes or returns existing student submission session in Cloud Firestore.
   */
  async startOrGetSubmission(
    examId: string,
    studentUid: string,
    studentName: string,
    studentCode: string
  ): Promise<Submission> {
    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      const snap = await getDoc(subRef);

      if (snap.exists()) {
        const data = snap.data() as Submission;
        if (data.startedAt) {
          // Adjust client-server skew if available
          serverTimeOffset = 0;
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
      };

      await setDoc(subRef, initialSubmission);
      return initialSubmission;
    } else {
      const subs = getMockSubmissions(examId);
      if (subs[studentUid]) {
        return subs[studentUid];
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

      await Promise.all([
        setDoc(logDoc, logData),
        updateDoc(subRef, {
          violationCount: nextCount,
        }),
      ]);
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
   */
  async submitExam(
    examId: string,
    studentUid: string,
    status: SubmissionStatus = 'submitted',
    examKey?: ExamKey | null
  ): Promise<Submission> {
    const timestamp = getEstimatedServerTime();

    let finalScore: number | null = null;
    let maxScore: number | null = null;
    let currentSubmission: Submission;

    if (isFirebaseConfigured) {
      const subRef = doc(db, 'exams', examId, 'submissions', studentUid);
      const snap = await getDoc(subRef);
      if (!snap.exists()) throw new Error('Envío no encontrado');
      currentSubmission = snap.data() as Submission;

      // 1. Lock submission state in Firestore
      await updateDoc(subRef, {
        submittedAt: timestamp,
        status,
      });

      // 2. Fetch answer key for auto-grading (allowed because status is locked)
      let activeKey = examKey;
      if (!activeKey) {
        try {
          activeKey = await examService.getExamKey(examId);
        } catch (keyErr) {
          console.warn('Could not retrieve examKey automatically:', keyErr);
        }
      }

      if (activeKey) {
        let total = 0;
        let earned = 0;
        Object.entries(activeKey.keys).forEach(([qId, keyData]) => {
          total += keyData.points;
          const studentAns = currentSubmission.answers?.[qId];
          if (Array.isArray(studentAns)) {
            const matches = studentAns.length === keyData.correctOptionIds.length &&
              studentAns.every(id => keyData.correctOptionIds.includes(id));
            if (matches) earned += keyData.points;
          } else if (typeof studentAns === 'string') {
            if (keyData.correctOptionIds.includes(studentAns)) {
              earned += keyData.points;
            }
          }
        });

        maxScore = total;
        finalScore = status === 'disqualified' ? 0 : earned;

        await updateDoc(subRef, {
          finalScore,
          maxScore,
        });
      } else if (status === 'disqualified') {
        finalScore = 0;
        await updateDoc(subRef, { finalScore });
      }

      return {
        ...currentSubmission,
        submittedAt: timestamp,
        status,
        finalScore,
        maxScore,
      };
    } else {
      const subs = getMockSubmissions(examId);
      currentSubmission = subs[studentUid];
      if (!currentSubmission) throw new Error('Envío no encontrado');

      const activeKey = examKey || getMockExamKey(examId);
      if (activeKey) {
        let total = 0;
        let earned = 0;
        Object.entries(activeKey.keys).forEach(([qId, keyData]) => {
          total += keyData.points;
          const studentAns = currentSubmission.answers?.[qId];
          if (Array.isArray(studentAns)) {
            const matches = studentAns.length === keyData.correctOptionIds.length &&
              studentAns.every(id => keyData.correctOptionIds.includes(id));
            if (matches) earned += keyData.points;
          } else if (typeof studentAns === 'string') {
            if (keyData.correctOptionIds.includes(studentAns)) {
              earned += keyData.points;
            }
          }
        });

        maxScore = total;
        finalScore = status === 'disqualified' ? 0 : earned;
      } else if (status === 'disqualified') {
        finalScore = 0;
      }

      currentSubmission.submittedAt = timestamp;
      currentSubmission.status = status;
      currentSubmission.finalScore = finalScore;
      currentSubmission.maxScore = maxScore;
      saveMockSubmission(examId, currentSubmission);
      return currentSubmission;
    }
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
          subsMap[docSnap.id] = docSnap.data() as Submission;
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
      return snap.exists() ? (snap.data() as Submission) : null;
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

