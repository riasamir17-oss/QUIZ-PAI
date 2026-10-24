export type QuestionType = 'pg' | 'essay';

export interface MultipleChoiceQuestion {
  id: string;
  number: number;
  type: 'pg';
  subCPMK: string;
  weight: number; // in percent (e.g., 2)
  question: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
}

export interface EssaySubQuestion {
  part: 'a' | 'b';
  prompt: string;
  weight: number; // in percent
  keyRubricPoints: string[];
  keywords: string[];
}

export interface EssayQuestion {
  id: string;
  number: number;
  type: 'essay';
  subCPMK: string;
  title: string;
  weight: number; // in percent (e.g. 10 or 15)
  parts: EssaySubQuestion[];
}

export type QuizQuestion = MultipleChoiceQuestion | EssayQuestion;

export interface StudentInfo {
  id: string;
  fullName: string;
  studentClass: string;
  nik: string; // NIK or NIM
  registeredAt: string;
  photoSnapshot?: string; // Data URL preview from webcam
}

export type ExamStatus = 'taking' | 'submitted' | 'blocked' | 'disqualified';

export interface ViolationRecord {
  id: string;
  timestamp: string;
  type: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'camera_lost';
  description: string;
  snapshotUrl?: string; // Captured camera image evidence
}

export interface StudentSubmission {
  id: string;
  student: StudentInfo;
  startedAt: string;
  submittedAt?: string;
  status: ExamStatus;
  answers: {
    // Key is question id (e.g. "pg-1" -> "C", "essay-1-a" -> "text answer")
    [questionKey: string]: string;
  };
  scores: {
    pgTotal: number; // max 30
    essayTotal: number; // max 70
    grandTotal: number; // max 100
    essayScores: {
      [partKey: string]: number; // score awarded per part
    };
    essayFeedbacks: {
      [partKey: string]: string;
    };
  };
  violations: ViolationRecord[];
  strikeCount: number;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
  };
}

export interface QuizScheduleConfig {
  title: string;
  courseCode: string;
  prodi: string;
  faculty: string;
  academicYear: string;
  startTime: string; // ISO string or datetime
  endTime: string; // ISO string or datetime
  durationMinutes: number;
  isOpen: boolean; // Manual kill-switch
  maxStrikesBeforeBlock: number;
}
