import type { ExamKey, Submission, SubmissionStatus } from '../types';

export interface GradeResult {
  finalScore: number;
  maxScore: number;
}

/**
 * Pure grading function shared by the teacher dashboard and the local demo mode.
 * A multiple-choice answer counts only when it matches the full set of correct options.
 * A disqualified submission always scores 0.
 */
export function gradeSubmission(
  answers: Submission['answers'] | undefined,
  key: ExamKey,
  status: SubmissionStatus,
  openQuestionScores?: Submission['openQuestionScores']
): GradeResult {
  let maxScore = 0;
  let earned = 0;

  Object.entries(key.keys).forEach(([questionId, keyData]) => {
    maxScore += keyData.points;
    const studentAnswer = answers?.[questionId];

    // If it's an open-ended question (empty correctOptionIds), score comes from manual/AI awarded points
    const isOpenEnded = keyData.correctOptionIds.length === 0;

    if (isOpenEnded) {
      if (openQuestionScores && openQuestionScores[questionId]) {
        earned += Math.max(0, Math.min(keyData.points, openQuestionScores[questionId].points));
      }
    } else if (Array.isArray(studentAnswer)) {
      const matches =
        studentAnswer.length === keyData.correctOptionIds.length &&
        studentAnswer.every(id => keyData.correctOptionIds.includes(id));
      if (matches) earned += keyData.points;
    } else if (typeof studentAnswer === 'string') {
      if (keyData.correctOptionIds.includes(studentAnswer)) earned += keyData.points;
    }
  });

  return {
    finalScore: status === 'disqualified' ? 0 : earned,
    maxScore,
  };
}

