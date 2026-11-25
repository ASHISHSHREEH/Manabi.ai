export const EXAM_OPTIONS = ["JFT", "N3", "N2", "N1", "N4"] as const;
export const SECTION_OPTIONS = ["vocabulary", "grammar", "reading", "listening"] as const;

export type ExamTag = (typeof EXAM_OPTIONS)[number];
export type SectionTag = (typeof SECTION_OPTIONS)[number];

export interface Question {
  id: string;
  exam: string;
  section: string;
  question: string;
  choices: string[];
  answer: string;
  my_wrong_answer?: string;
  explanation: string;
  choice_explanations?: string[];
  source?: string;
}

export interface QuestionResult {
  times_seen: number;
  times_correct: number;
  last_seen: string;
  last_correct: boolean;
}

export type ProgressMap = Record<string, QuestionResult>;

export interface DailyActivity {
  answered: number;
  correct: number;
}

export type DailyActivityMap = Record<string, DailyActivity>;

export interface StudyTask {
  id: string;
  title: string;
  due: string;
  done: boolean;
}

export interface LastPracticeSession {
  exam: string;
  section: string;
  updatedAt: string;
}

export interface UserStudyState {
  dailyActivity: DailyActivityMap;
  dailyTarget: number;
  tasks: StudyTask[];
  profileName?: string;
  examDates?: Record<string, string>;
  lastBackupAt?: string;
  lastSession?: LastPracticeSession;
}

export type AppView = "hub" | "quiz" | "bank" | "stats";
