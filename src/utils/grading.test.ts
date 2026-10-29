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
});
