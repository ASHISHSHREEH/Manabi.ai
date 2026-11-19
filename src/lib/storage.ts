import type {
  DailyActivityMap,
  ProgressMap,
  QuestionResult,
  StudyTask,
  UserStudyState,
} from "@/types/question";

const PROGRESS_KEY = "jft-exam-prep-progress-v1";
const STUDY_STATE_KEY = "jft-exam-prep-study-state-v1";

export const DEFAULT_TASKS: StudyTask[] = [
  {
    id: "task-jft-sample",
    title: "Take official JFT-Basic sample test & log baseline",
    due: "Phase 0",
    done: false,
  },
  {
    id: "task-n2-vocab",
    title: "Drill 20 JLPT N2 questions in Practice Mode",
    due: "Today",
    done: false,
  },
  {
    id: "task-n3-review",
    title: "Review missed N3 grammar & kanji readings",
    due: "This week",
    done: false,
  },
];

export const DEFAULT_STUDY_STATE: UserStudyState = {
  dailyActivity: {},
  dailyTarget: 20,
  tasks: DEFAULT_TASKS,
};

/** Return local calendar date in YYYY-MM-DD format. */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Load all saved per-question results from localStorage. */
export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

/** Load daily activity, target, and task checklist from localStorage. */
export function loadStudyState(): UserStudyState {
  if (typeof window === "undefined") return DEFAULT_STUDY_STATE;
  try {
    const raw = window.localStorage.getItem(STUDY_STATE_KEY);
    if (!raw) return DEFAULT_STUDY_STATE;
    const parsed = JSON.parse(raw) as Partial<UserStudyState>;
    return {
      dailyActivity:
        parsed.dailyActivity && typeof parsed.dailyActivity === "object"
          ? parsed.dailyActivity
          : {},
      dailyTarget:
        typeof parsed.dailyTarget === "number" && parsed.dailyTarget > 0
          ? parsed.dailyTarget
          : 20,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_TASKS,
    };
  } catch {
    return DEFAULT_STUDY_STATE;
  }
}

function saveStudyState(state: UserStudyState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STUDY_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode storage errors
  }
}

/** Save a single question attempt into both per-question progress and daily activity log. */
export function recordQuestionResult(
  questionId: string,
  isCorrect: boolean,
  dateStr: string = getLocalDateKey()
): { progress: ProgressMap; studyState: UserStudyState } {
  const current = loadProgress();
  const prev: QuestionResult | undefined = current[questionId];

  const updatedProgress: ProgressMap = {
    ...current,
    [questionId]: {
      times_seen: (prev?.times_seen ?? 0) + 1,
      times_correct: (prev?.times_correct ?? 0) + (isCorrect ? 1 : 0),
      last_seen: dateStr,
      last_correct: isCorrect,
    },
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(updatedProgress));
    } catch {
      // Ignore storage errors
    }
  }

  const state = loadStudyState();
  const prevDay = state.dailyActivity[dateStr] ?? { answered: 0, correct: 0 };
  const updatedActivity: DailyActivityMap = {
    ...state.dailyActivity,
    [dateStr]: {
      answered: prevDay.answered + 1,
      correct: prevDay.correct + (isCorrect ? 1 : 0),
    },
  };

  const updatedState: UserStudyState = {
    ...state,
    dailyActivity: updatedActivity,
  };
  saveStudyState(updatedState);

  return { progress: updatedProgress, studyState: updatedState };
}

export function saveTasks(tasks: StudyTask[]): UserStudyState {
  const next = { ...loadStudyState(), tasks };
  saveStudyState(next);
  return next;
}

export function saveDailyTarget(dailyTarget: number): UserStudyState {
  const safeTarget = Math.max(5, Math.min(200, Math.round(dailyTarget)));
  const next = { ...loadStudyState(), dailyTarget: safeTarget };
  saveStudyState(next);
  return next;
}

export function exportBackupJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      progress: loadProgress(),
      studyState: loadStudyState(),
    },
    null,
    2
  );
}

export function importBackupJson(rawJson: string): {
  progress: ProgressMap;
  studyState: UserStudyState;
} {
  const parsed = JSON.parse(rawJson) as {
    progress?: ProgressMap;
    studyState?: Partial<UserStudyState>;
  };
  if (!parsed || typeof parsed !== "object" || !parsed.progress) {
    throw new Error("Invalid backup file format");
  }
  const nextProgress = parsed.progress;
  const nextState: UserStudyState = {
    dailyActivity: parsed.studyState?.dailyActivity ?? {},
    dailyTarget: parsed.studyState?.dailyTarget ?? 20,
    tasks: Array.isArray(parsed.studyState?.tasks)
      ? parsed.studyState.tasks
      : DEFAULT_TASKS,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress));
    window.localStorage.setItem(STUDY_STATE_KEY, JSON.stringify(nextState));
  }
  return { progress: nextProgress, studyState: nextState };
}

/** Clear all saved study progress and activity history from localStorage. */
export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
    window.localStorage.removeItem(STUDY_STATE_KEY);
  } catch {
    // Ignore storage errors
  }
}
