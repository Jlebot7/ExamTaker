// In-memory / localStorage mock store to guarantee 100% testability even before
// real Firebase environment variables are populated by the user.

import type { Exam, ExamKey, Submission, IntegrityLog } from '../types';

const STORAGE_KEYS = {
  EXAMS: 'examtaker_mock_exams',
  KEYS: 'examtaker_mock_keys',
  SUBMISSIONS: 'examtaker_mock_submissions',
  LOGS: 'examtaker_mock_logs',
  USERS: 'examtaker_mock_users',
  CURRENT_USER: 'examtaker_mock_current_user'
};

// No pre-seeded demo exams: teacher begins with a clean dashboard
const SEED_EXAMS: Exam[] = [];

const SEED_KEYS: Record<string, ExamKey> = {};

export const initMockStorage = () => {
  // Purge any legacy DEMO-101 exam from existing localStorage
  try {
    const rawExams = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (rawExams) {
      const parsed: Exam[] = JSON.parse(rawExams);
      const filtered = parsed.filter(e => e.id !== 'DEMO-101');
      if (filtered.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(filtered));
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(SEED_EXAMS));
    }

    const rawKeys = localStorage.getItem(STORAGE_KEYS.KEYS);
    if (rawKeys) {
      const parsedKeys = JSON.parse(rawKeys);
      if (parsedKeys['DEMO-101']) {
        delete parsedKeys['DEMO-101'];
        localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(parsedKeys));
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(SEED_KEYS));
    }
  } catch {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(SEED_EXAMS));
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(SEED_KEYS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify({}));
  }
};

export const getMockExams = (): Exam[] => {
  initMockStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAMS) || '[]');
  } catch {
    return [];
  }
};

export const saveMockExam = (exam: Exam, key?: ExamKey) => {
  const exams = getMockExams();
  const index = exams.findIndex(e => e.id === exam.id);
  if (index >= 0) {
    exams[index] = exam;
  } else {
    exams.unshift(exam);
  }
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));

  if (key) {
    const keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYS) || '{}');
    keys[exam.id] = key;
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(keys));
  }
};

export const deleteMockExam = (examId: string) => {
  const exams = getMockExams().filter(e => e.id !== examId);
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));

  const keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYS) || '{}');
  delete keys[examId];
  localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(keys));
};

export const getMockExamKey = (examId: string): ExamKey | null => {
  initMockStorage();
  const keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYS) || '{}');
  return keys[examId] || null;
};

export const getMockSubmissions = (examId: string): Record<string, Submission> => {
  initMockStorage();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '{}');
  return all[examId] || {};
};

export const saveMockSubmission = (examId: string, submission: Submission) => {
  initMockStorage();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '{}');
  if (!all[examId]) all[examId] = {};
  all[examId][submission.studentUid] = submission;
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(all));
};

export const getMockLogs = (examId: string, studentUid: string): IntegrityLog[] => {
  initMockStorage();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '{}');
  return all[`${examId}_${studentUid}`] || [];
};

export const addMockLog = (examId: string, studentUid: string, log: IntegrityLog) => {
  initMockStorage();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '{}');
  const key = `${examId}_${studentUid}`;
  if (!all[key]) all[key] = [];
  all[key].push(log);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(all));
};

export const deleteMockSubmission = (examId: string, studentUid: string) => {
  initMockStorage();
  const allSubs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '{}');
  if (allSubs[examId] && allSubs[examId][studentUid]) {
    delete allSubs[examId][studentUid];
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(allSubs));
  }

  const allLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '{}');
  const logKey = `${examId}_${studentUid}`;
  if (allLogs[logKey]) {
    delete allLogs[logKey];
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(allLogs));
  }
};

export const resetAllMockSubmissions = (examId: string) => {
  initMockStorage();
  const allSubs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '{}');
  if (allSubs[examId]) {
    delete allSubs[examId];
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(allSubs));
  }

  const allLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '{}');
  const prefix = `${examId}_`;
  let changed = false;
  Object.keys(allLogs).forEach(k => {
    if (k.startsWith(prefix)) {
      delete allLogs[k];
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(allLogs));
  }
};
