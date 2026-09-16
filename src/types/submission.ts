export type SubmissionStatus = 
  | 'in_progress' 
  | 'submitted' 
  | 'timed_out' 
  | 'disqualified';

export interface Submission {
  studentUid: string;
  studentName: string;
  studentCode: string;
  startedAt: number; // ServerValue.TIMESTAMP
  submittedAt: number | null;
  status: SubmissionStatus;
  answers: Record<string, string | string[]>; // questionId -> optionId or optionId[]
  violationCount: number;
  finalScore: number | null;
  maxScore: number | null;
}

export interface StudentSession {
  examId: string;
  studentUid: string;
  studentName: string;
  studentCode: string;
  startedAt: number;
}
