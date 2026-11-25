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

export type AppView = "hub" | "mock" | "quiz" | "bank" | "stats";

export interface MockSectionQuota {
  section: string;
  label: string;
  target_count: number;
  available_count: number;
  duration_sec: number;
  min_scaled_score?: number | null;
  max_scaled_score?: number | null;
}

export interface ExamCatalogItem {
  code: string;
  name: string;
  scoring_model: string;
  pass_total: number;
  max_score: number;
  duration_sec: number;
  total_available: number;
  pass_rule_summary: string;
  sections: MockSectionQuota[];
}

export interface MockPublicOption {
  id: string;
  text: string;
}

export interface MockAttemptQuestion {
  index: number;
  question_id: string;
  exam_code: string;
  section: string;
  topic_tag: string;
  prompt: string;
  options: MockPublicOption[];
  selected_option_id: string | null;
  marked_for_review: boolean;
  time_spent_sec: number;
}

export interface MockAttemptState {
  id: string;
  exam_code: string;
  exam_name: string;
  mode: "full" | "section";
  section_filter?: string | null;
  status: string;
  duration_sec: number;
  remaining_sec: number;
  started_at: string;
  expires_at: string;
  submitted_at?: string | null;
  questions: MockAttemptQuestion[];
}

export interface MockSectionScoreResult {
  section: string;
  label: string;
  correct: number;
  total: number;
  accuracy_pct: number;
  scaled_score: number;
  max_scaled_score: number;
  min_scaled_score?: number | null;
  section_passed: boolean;
  time_spent_sec: number;
}

export interface MockGradedOptionReview {
  id: string;
  text: string;
  is_correct: boolean;
  explanation?: string | null;
}

export interface MockGradedQuestionReview {
  index: number;
  question_id: string;
  exam_code: string;
  section: string;
  topic_tag: string;
  prompt: string;
  explanation: string;
  selected_option_id: string | null;
  correct_option_id: string;
  is_correct: boolean;
  marked_for_review: boolean;
  time_spent_sec: number;
  options: MockGradedOptionReview[];
}

export interface MockAttemptResult {
  attempt_id: string;
  exam_code: string;
  exam_name: string;
  mode: "full" | "section";
  scoring_model: string;
  raw_correct: number;
  raw_total: number;
  accuracy_pct: number;
  scaled_score: number;
  max_score: number;
  pass_total: number;
  passed: boolean;
  pass_rule_summary: string;
  total_time_sec: number;
  weak_sections: string[];
  weak_topics: string[];
  section_scores: MockSectionScoreResult[];
  questions: MockGradedQuestionReview[];
  submitted_at: string;
}

export interface MockAttemptHistoryItem {
  attempt_id: string;
  exam_code: string;
  exam_name: string;
  mode: "full" | "section";
  section_filter?: string | null;
  status: string;
  raw_correct?: number | null;
  raw_total?: number | null;
  scaled_score?: number | null;
  max_score?: number | null;
  passed?: boolean | null;
  started_at: string;
  submitted_at?: string | null;
}
