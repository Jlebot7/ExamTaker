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

// Seed initial sample exam for instantaneous testing
const SEED_EXAMS: Exam[] = [
  {
    id: 'DEMO-101',
    title: 'Evaluación Diagnóstica: Fundamentos de Arquitectura Web y JavaScript',
    description: 'Examen de prueba para validar el funcionamiento del sistema en tiempo real y el módulo anti-trampa.',
    durationMinutes: 10,
    maxViolations: 3,
    isPublished: true,
    createdAt: Date.now() - 3600000,
    createdBy: 'teacher_demo_uid',
    createdByName: 'Prof. Arquitecto Demo',
    totalPoints: 20,
    questions: [
      {
        id: 'q1',
        prompt: '¿Cuál de las siguientes afirmaciones describe mejor el modelo Serverless en Firebase?',
        type: 'single_choice',
        points: 5,
        options: [
          { id: 'opt1_a', text: 'Requiere administrar y escalar manualmente instancias EC2 o contenedores Docker.' },
          { id: 'opt1_b', text: 'Permite persistencia y cómputo bajo demanda sin provisionar servidores físicos, escalando automáticamente.' },
          { id: 'opt1_c', text: 'Solo funciona si todos los clientes están conectados a la misma red local (LAN).' },
          { id: 'opt1_d', text: 'Es un protocolo de red punto a punto (P2P) entre navegadores sin base de datos central.' }
        ]
      },
      {
        id: 'q2',
        prompt: '¿Por qué la hora del cliente (Date.now()) no debe usarse para calcular el tiempo restante en un examen en línea?',
        type: 'single_choice',
        points: 5,
        options: [
          { id: 'opt2_a', text: 'Porque el navegador no tiene soporte para fechas en milisegundos.' },
          { id: 'opt2_b', text: 'Porque el estudiante puede alterar la hora de su sistema operativo para tener tiempo ilimitado.' },
          { id: 'opt2_c', text: 'Porque Date.now() consume demasiada memoria RAM en dispositivos móviles.' },
          { id: 'opt2_d', text: 'Porque Firebase Realtime Database no permite almacenar números mayores a 1000.' }
        ]
      },
      {
        id: 'q3',
        prompt: '¿Qué evento del DOM se dispara inmediatamente cuando el alumno cambia de pestaña o minimiza la ventana del navegador?',
        type: 'single_choice',
        points: 5,
        options: [
          { id: 'opt3_a', text: 'document.onkeypress' },
          { id: 'opt3_b', text: 'window.onresize' },
          { id: 'opt3_c', text: 'document.visibilitychange y window.onblur' },
          { id: 'opt3_d', text: 'navigator.sendBeacon' }
        ]
      },
      {
        id: 'q4',
        prompt: 'Verdadero o Falso: En una arquitectura Serverless segura, las respuestas correctas deben enviarse en el payload inicial del examen al estudiante.',
        type: 'true_false',
        points: 5,
        options: [
          { id: 'opt4_true', text: 'Verdadero (el cliente debe calificar localmente por rendimiento).' },
          { id: 'opt4_false', text: 'Falso (permitiría a cualquier alumno inspeccionar las respuestas en memoria o pestaña Red).' }
        ]
      }
    ]
  }
];

const SEED_KEYS: Record<string, ExamKey> = {
  'DEMO-101': {
    examId: 'DEMO-101',
    createdBy: 'teacher_demo_uid',
    keys: {
      'q1': { correctOptionIds: ['opt1_b'], points: 5 },
      'q2': { correctOptionIds: ['opt2_b'], points: 5 },
      'q3': { correctOptionIds: ['opt3_c'], points: 5 },
      'q4': { correctOptionIds: ['opt4_false'], points: 5 }
    }
  }
};

export const initMockStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.EXAMS)) {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(SEED_EXAMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.KEYS)) {
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

