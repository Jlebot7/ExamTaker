import { describe, it, expect } from 'vitest';
import { gradeSubmission } from './grading';
import type { ExamKey } from '../types';

describe('gradeSubmission', () => {
  const sampleKey: ExamKey = {
    examId: 'EX-TEST1',
    createdBy: 'teacher_123',
    keys: {
      q1: { correctOptionIds: ['opt_a'], points: 10 },
      q2: { correctOptionIds: ['opt_b', 'opt_c'], points: 20 },
      q3: { correctOptionIds: ['tf_true'], points: 5 },
    },
  };

  it('calculates full score when all single and multiple-choice answers are correct', () => {
    const studentAnswers = {
      q1: 'opt_a',
      q2: ['opt_b', 'opt_c'],
      q3: 'tf_true',
    };

    const result = gradeSubmission(studentAnswers, sampleKey, 'submitted');
    expect(result.finalScore).toBe(35);
    expect(result.maxScore).toBe(35);
  });

  it('awards zero points for multiple-choice questions if only partially correct', () => {
    const studentAnswers = {
      q1: 'opt_a',
      q2: ['opt_b'], // Missing opt_c
      q3: 'tf_true',
    };

    const result = gradeSubmission(studentAnswers, sampleKey, 'submitted');
    expect(result.finalScore).toBe(15); // 10 from q1 + 5 from q3
    expect(result.maxScore).toBe(35);
  });

  it('awards 0 points unconditionally if the submission status is disqualified', () => {
    const studentAnswers = {
      q1: 'opt_a',
      q2: ['opt_b', 'opt_c'],
      q3: 'tf_true',
    };

    const result = gradeSubmission(studentAnswers, sampleKey, 'disqualified');
    expect(result.finalScore).toBe(0);
    expect(result.maxScore).toBe(35);
  });

  it('handles empty or undefined student answers safely', () => {
    const result = gradeSubmission(undefined, sampleKey, 'submitted');
    expect(result.finalScore).toBe(0);
    expect(result.maxScore).toBe(35);
  });

  it('handles wrong answers correctly', () => {
    const studentAnswers = {
      q1: 'opt_wrong',
      q2: ['opt_wrong_1', 'opt_wrong_2'],
      q3: 'tf_false',
    };

    const result = gradeSubmission(studentAnswers, sampleKey, 'submitted');
    expect(result.finalScore).toBe(0);
    expect(result.maxScore).toBe(35);
  });

  describe('Open-Ended Questions Support', () => {
    const mixedKey: ExamKey = {
      examId: 'EX-MIXED',
      createdBy: 'teacher_123',
      keys: {
        q1: { correctOptionIds: ['opt_a'], points: 10 },
        q_open1: { correctOptionIds: [], points: 15, rubric: 'Explicación de patrones', idealAnswer: 'Factory y Singleton' },
        q_open2: { correctOptionIds: [], points: 5, rubric: 'Definición de ACID' },
      },
    };

    it('calculates score correctly with awarded open question points', () => {
      const studentAnswers = {
        q1: 'opt_a',
        q_open1: 'El patrón Factory desacopla la creación del objeto...',
        q_open2: 'Atomicidad, Consistencia, Aislamiento y Durabilidad.',
      };

      const openScores = {
        q_open1: { points: 12, feedback: 'Buena explicación general, faltó mencionar Singleton' },
        q_open2: { points: 5, feedback: 'Definición perfecta' },
      };

      const result = gradeSubmission(studentAnswers, mixedKey, 'submitted', openScores);
      expect(result.finalScore).toBe(27); // 10 (q1) + 12 (q_open1) + 5 (q_open2)
      expect(result.maxScore).toBe(30);
    });

    it('scores only closed questions if open questions are pending review', () => {
      const studentAnswers = {
        q1: 'opt_a',
        q_open1: 'Respuesta sin calificar aún...',
      };

      const result = gradeSubmission(studentAnswers, mixedKey, 'submitted', undefined);
      expect(result.finalScore).toBe(10); // only q1
      expect(result.maxScore).toBe(30);
    });

    it('clamps open points between 0 and max question points', () => {
      const studentAnswers = {
        q1: 'opt_a',
        q_open1: 'Respuesta...',
      };

      const openScores = {
        q_open1: { points: 999 }, // Exceeds 15 max points
      };

      const result = gradeSubmission(studentAnswers, mixedKey, 'submitted', openScores);
      expect(result.finalScore).toBe(25); // 10 + 15 (clamped)
    });

    it('forces total to 0 if disqualified even with awarded open points', () => {
      const studentAnswers = {
        q1: 'opt_a',
        q_open1: 'Excelente respuesta...',
      };

      const openScores = {
        q_open1: { points: 15 },
      };

      const result = gradeSubmission(studentAnswers, mixedKey, 'disqualified', openScores);
      expect(result.finalScore).toBe(0);
      expect(result.maxScore).toBe(30);
    });
  });
});

