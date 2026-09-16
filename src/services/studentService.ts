import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  onValue, 
  off, 
  serverTimestamp 
} from 'firebase/database';
import { database, isFirebaseConfigured } from './firebaseConfig';
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
  getMockLogs, 
  addMockLog 
} from './mockStorage';

let serverTimeOffset = 0;

// Initialize server time offset listener
if (isFirebaseConfigured) {
  const offsetRef = ref(database, '.info/serverTimeOffset');
  onValue(offsetRef, snap => {
    serverTimeOffset = snap.val() || 0;
  });
}

/**
 * Returns current synchronized server timestamp in milliseconds.
 * Prevents clients from tampering with their local system clock.
 */
export const getEstimatedServerTime = (): number => {
  return Date.now() + serverTimeOffset;
};

export const studentService = {
  /**
   * Initializes or returns existing student submission session.
   */
  async startOrGetSubmission(
    examId: string,
    studentUid: string,
    studentName: string,
    studentCode: string
  ): Promise<Submission> {
    if (isFirebaseConfigured) {
      const subRef = ref(database, `submissions/${examId}/${studentUid}`);
      const snap = await get(subRef);

      if (snap.exists()) {
        return snap.val() as Submission;
      }

      const initialSubmission: Submission = {
        studentUid,
        studentName,
        studentCode,
        startedAt: getEstimatedServerTime(),
        submittedAt: null,
        status: 'in_progress',
        answers: {},
        violationCount: 0,
        finalScore: null,
        maxScore: null,
      };

      await set(subRef, {
        ...initialSubmission,
        startedAt: serverTimestamp(),
      });

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
   * Saves or updates a single question answer in real-time.
   */
  async saveAnswer(
    examId: string,
    studentUid: string,
    questionId: string,
    selectedOption: string | string[]
  ): Promise<void> {
    if (isFirebaseConfigured) {
      await set(
        ref(database, `submissions/${examId}/${studentUid}/answers/${questionId}`),
        selectedOption
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
      const logsRef = ref(database, `logs/${examId}/${studentUid}`);
      const newLogRef = push(logsRef);
      const logId = newLogRef.key!;

      const logData: IntegrityLog = {
        id: logId,
        timestamp,
        eventType,
        details,
        violationNumber: nextCount,
      };

      await Promise.all([
        set(newLogRef, {
          ...logData,
          timestamp: serverTimestamp(),
        }),
        update(ref(database, `submissions/${examId}/${studentUid}`), {
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

    // Calculate score if key is provided
    let finalScore: number | null = null;
    let maxScore: number | null = null;

    let currentSubmission: Submission;

    if (isFirebaseConfigured) {
      const subRef = ref(database, `submissions/${examId}/${studentUid}`);
      const snap = await get(subRef);
      if (!snap.exists()) throw new Error('Envío no encontrado');
      currentSubmission = snap.val() as Submission;

      if (examKey) {
        let earned = 0;
        let total = 0;
        Object.entries(examKey.keys).forEach(([qId, keyData]) => {
          total += keyData.points;
          const studentAns = currentSubmission.answers[qId];
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
        finalScore = earned;
        maxScore = total;
      }

      const updates: Partial<Submission> = {
        submittedAt: timestamp,
        status,
        finalScore,
        maxScore,
      };

      await update(subRef, updates);
      return { ...currentSubmission, ...updates };
    } else {
      const subs = getMockSubmissions(examId);
      currentSubmission = subs[studentUid];
      if (!currentSubmission) throw new Error('Envío no encontrado');

      if (examKey) {
        let earned = 0;
        let total = 0;
        Object.entries(examKey.keys).forEach(([qId, keyData]) => {
          total += keyData.points;
          const studentAns = currentSubmission.answers[qId];
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
        finalScore = earned;
        maxScore = total;
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
   * Realtime subscription to submissions of an exam (Teacher view).
   */
  subscribeToSubmissions(
    examId: string,
    callback: (submissions: Record<string, Submission>) => void
  ): () => void {
    if (isFirebaseConfigured) {
      const subsRef = ref(database, `submissions/${examId}`);
      onValue(subsRef, snap => {
        callback(snap.exists() ? snap.val() : {});
      });
      return () => off(subsRef);
    } else {
      callback(getMockSubmissions(examId));
      const interval = setInterval(() => {
        callback(getMockSubmissions(examId));
      }, 2000);
      return () => clearInterval(interval);
    }
  },

  /**
   * Realtime subscription to student audit logs (Teacher view).
   */
  subscribeToStudentLogs(
    examId: string,
    studentUid: string,
    callback: (logs: IntegrityLog[]) => void
  ): () => void {
    if (isFirebaseConfigured) {
      const logsRef = ref(database, `logs/${examId}/${studentUid}`);
      onValue(logsRef, snap => {
        if (!snap.exists()) {
          callback([]);
          return;
        }
        const list: IntegrityLog[] = [];
        snap.forEach(child => {
          list.push({ id: child.key!, ...child.val() });
        });
        callback(list.sort((a, b) => a.timestamp - b.timestamp));
      });
      return () => off(logsRef);
    } else {
      callback(getMockLogs(examId, studentUid));
      const interval = setInterval(() => {
        callback(getMockLogs(examId, studentUid));
      }, 2000);
      return () => clearInterval(interval);
    }
  },
};
