import { isChoiceCorrect, stripChoiceLabel } from "@/lib/quiz";
import { loadLocalJson, saveLocalJson } from "@/lib/storage";
import type {
  ExamCatalogItem,
  MockAttemptHistoryItem,
  MockAttemptQuestion,
  MockAttemptResult,
  MockAttemptState,
  MockGradedQuestionReview,
  MockSectionScoreResult,
  Question,
} from "@/types/question";

export type MockBackendMode = "fastapi" | "local";

const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

interface LocalAttemptBundle {
  state: MockAttemptState;
  answerKey: Record<
    string,
    {
      correctOptionId: string;
      explanation: string;
      options: { id: string; text: string; is_correct: boolean; explanation?: string | null }[];
    }
  >;
}

const BLUEPRINTS: Omit<ExamCatalogItem, "total_available">[] = [
  {
    code: "JFT",
    name: "JFT-Basic",
    scoring_model: "jft_250",
    pass_total: 200,
    max_score: 250,
    duration_sec: 3600,
    pass_rule_summary:
      "200 / 250 overall pass threshold across all 4 sections (no individual section cutoff)",
    sections: [
      { section: "vocabulary", label: "Script & Vocabulary", target_count: 15, available_count: 0, duration_sec: 900 },
      { section: "grammar", label: "Conversation & Grammar", target_count: 15, available_count: 0, duration_sec: 900 },
      { section: "reading", label: "Reading Comprehension", target_count: 10, available_count: 0, duration_sec: 900 },
      { section: "listening", label: "Listening Comprehension", target_count: 10, available_count: 0, duration_sec: 900 },
    ],
  },
  {
    code: "N5",
    name: "JLPT N5",
    scoring_model: "jlpt_180",
    pass_total: 80,
    max_score: 180,
    duration_sec: 5400,
    pass_rule_summary:
      "80 / 180 overall pass AND sectional minimums (Language Knowledge+Reading >= 38/120, Listening >= 19/60)",
    sections: [
      { section: "vocabulary", label: "Vocabulary & Kanji", target_count: 15, available_count: 0, duration_sec: 1500, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "grammar", label: "Grammar", target_count: 15, available_count: 0, duration_sec: 1800, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "reading", label: "Reading", target_count: 10, available_count: 0, duration_sec: 1200, max_scaled_score: 30, min_scaled_score: 10 },
      { section: "listening", label: "Listening", target_count: 10, available_count: 0, duration_sec: 1800, max_scaled_score: 60, min_scaled_score: 19 },
    ],
  },
  {
    code: "N4",
    name: "JLPT N4",
    scoring_model: "jlpt_180",
    pass_total: 90,
    max_score: 180,
    duration_sec: 6900,
    pass_rule_summary:
      "90 / 180 overall pass AND sectional minimums (Knowledge+Reading >= 38/120, Listening >= 19/60)",
    sections: [
      { section: "vocabulary", label: "Vocabulary & Kanji", target_count: 20, available_count: 0, duration_sec: 1800, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "grammar", label: "Grammar", target_count: 15, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "reading", label: "Reading", target_count: 10, available_count: 0, duration_sec: 1500, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "listening", label: "Listening", target_count: 10, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
    ],
  },
  {
    code: "N3",
    name: "JLPT N3",
    scoring_model: "jlpt_180",
    pass_total: 95,
    max_score: 180,
    duration_sec: 8400,
    pass_rule_summary: "95 / 180 overall pass AND >= 19/60 minimum in each JLPT section",
    sections: [
      { section: "vocabulary", label: "Vocabulary & Kanji", target_count: 20, available_count: 0, duration_sec: 1800, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "grammar", label: "Grammar", target_count: 15, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "reading", label: "Reading", target_count: 10, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "listening", label: "Listening", target_count: 10, available_count: 0, duration_sec: 2400, max_scaled_score: 60, min_scaled_score: 19 },
    ],
  },
  {
    code: "N2",
    name: "JLPT N2",
    scoring_model: "jlpt_180",
    pass_total: 90,
    max_score: 180,
    duration_sec: 9300,
    pass_rule_summary:
      "90 / 180 overall pass AND >= 19/60 minimum in Language Knowledge, Reading, and Listening",
    sections: [
      { section: "vocabulary", label: "Vocabulary & Kanji", target_count: 20, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "grammar", label: "Grammar", target_count: 20, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "reading", label: "Reading", target_count: 15, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "listening", label: "Listening", target_count: 10, available_count: 0, duration_sec: 3000, max_scaled_score: 60, min_scaled_score: 19 },
    ],
  },
  {
    code: "N1",
    name: "JLPT N1",
    scoring_model: "jlpt_180",
    pass_total: 100,
    max_score: 180,
    duration_sec: 10200,
    pass_rule_summary:
      "100 / 180 overall pass AND >= 19/60 minimum in Language Knowledge, Reading, and Listening",
    sections: [
      { section: "vocabulary", label: "Vocabulary & Kanji", target_count: 20, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "grammar", label: "Grammar", target_count: 20, available_count: 0, duration_sec: 2400, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "reading", label: "Reading", target_count: 15, available_count: 0, duration_sec: 2100, max_scaled_score: 60, min_scaled_score: 19 },
      { section: "listening", label: "Listening", target_count: 10, available_count: 0, duration_sec: 3600, max_scaled_score: 60, min_scaled_score: 19 },
    ],
  },
];

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1600);
  try {
    const res = await fetch(`${DEFAULT_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `API error ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildLocalCatalog(questions: Question[]): ExamCatalogItem[] {
  return BLUEPRINTS.map((bp) => {
    const sections = bp.sections.map((s) => ({
      ...s,
      available_count: questions.filter(
        (q) => q.exam.toUpperCase() === bp.code && q.section.toLowerCase() === s.section
      ).length,
    }));
    const total_available = sections.reduce((sum, s) => sum + s.available_count, 0);
    return { ...bp, total_available, sections };
  });
}

export async function fetchExamCatalog(questions: Question[]): Promise<{
  mode: MockBackendMode;
  exams: ExamCatalogItem[];
}> {
  try {
    const exams = await apiFetch<ExamCatalogItem[]>("/api/v1/exams");
    return { mode: "fastapi", exams };
  } catch {
    return { mode: "local", exams: buildLocalCatalog(questions) };
  }
}

export async function fetchMockHistory(): Promise<{
  mode: MockBackendMode;
  history: MockAttemptHistoryItem[];
}> {
  try {
    const history = await apiFetch<MockAttemptHistoryItem[]>("/api/v1/attempts");
    return { mode: "fastapi", history };
  } catch {
    const saved = loadLocalJson<MockAttemptResult[]>("mock_history", []);
    const history: MockAttemptHistoryItem[] = saved.map((r) => ({
      attempt_id: r.attempt_id,
      exam_code: r.exam_code,
      exam_name: r.exam_name,
      mode: r.mode,
      status: "submitted",
      raw_correct: r.raw_correct,
      raw_total: r.raw_total,
      scaled_score: r.scaled_score,
      max_score: r.max_score,
      passed: r.passed,
      started_at: r.submitted_at,
      submitted_at: r.submitted_at,
    }));
    return { mode: "local", history };
  }
}

export async function startMockAttempt(
  params: {
    exam_code: string;
    mode: "full" | "section";
    section?: string;
    question_limit?: number;
  },
  allQuestions: Question[]
): Promise<{ backend: MockBackendMode; attempt: MockAttemptState }> {
  try {
    const attempt = await apiFetch<MockAttemptState>("/api/v1/attempts", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { backend: "fastapi", attempt };
  } catch {
    const catalog = buildLocalCatalog(allQuestions);
    const bp = catalog.find((e) => e.code === params.exam_code.toUpperCase());
    if (!bp) throw new Error(`Unknown exam ${params.exam_code}`);

    const scoped = allQuestions.filter((q) => q.exam.toUpperCase() === bp.code);
    let selected: Question[] = [];
    let duration_sec = bp.duration_sec;

    if (params.mode === "section") {
      const sec = (params.section ?? "").toLowerCase();
      const secBp = bp.sections.find((s) => s.section === sec);
      const secPool = shuffleArray(scoped.filter((q) => q.section.toLowerCase() === sec));
      const limit = params.question_limit ?? secBp?.target_count ?? 20;
      selected = secPool.slice(0, Math.min(limit, secPool.length));
      const baseDur = secBp?.duration_sec ?? 1200;
      duration_sec =
        secBp && secBp.target_count > 0 && selected.length < secBp.target_count
          ? Math.max(180, Math.round(baseDur * (selected.length / secBp.target_count)))
          : baseDur;
    } else {
      for (const secBp of bp.sections) {
        const pool = shuffleArray(
          scoped.filter((q) => q.section.toLowerCase() === secBp.section)
        );
        selected.push(...pool.slice(0, Math.min(secBp.target_count, pool.length)));
      }
      if (params.question_limit) {
        selected = selected.slice(0, params.question_limit);
      }
      const targetTotal = bp.sections.reduce((s, x) => s + x.target_count, 0);
      if (targetTotal > 0 && selected.length < targetTotal) {
        duration_sec = Math.max(300, Math.round(bp.duration_sec * (selected.length / targetTotal)));
      }
    }

    if (selected.length === 0) {
      throw new Error(`No questions available for ${bp.name}`);
    }

    const now = new Date();
    const attemptId = `local-${now.getTime()}`;
    const answerKey: LocalAttemptBundle["answerKey"] = {};
    const attemptQuestions: MockAttemptQuestion[] = selected.map((q, index) => {
      const opts = shuffleArray(
        q.choices.map((raw, origIdx) => ({
          id: `${q.id}::opt-${origIdx}`,
          text: stripChoiceLabel(raw),
          is_correct: isChoiceCorrect(q, raw, origIdx),
          explanation: q.choice_explanations?.[origIdx] ?? null,
        }))
      );
      const correct = opts.find((o) => o.is_correct) ?? opts[0];
      answerKey[q.id] = {
        correctOptionId: correct.id,
        explanation: q.explanation,
        options: opts,
      };
      return {
        index,
        question_id: q.id,
        exam_code: q.exam,
        section: q.section,
        topic_tag: q.section,
        prompt: q.question,
        options: opts.map((o) => ({ id: o.id, text: o.text })),
        selected_option_id: null,
        marked_for_review: false,
        time_spent_sec: 0,
      };
    });

    const state: MockAttemptState = {
      id: attemptId,
      exam_code: bp.code,
      exam_name: bp.name,
      mode: params.mode,
      section_filter: params.mode === "section" ? params.section ?? null : null,
      status: "in_progress",
      duration_sec,
      remaining_sec: duration_sec,
      started_at: now.toISOString(),
      expires_at: new Date(now.getTime() + duration_sec * 1000).toISOString(),
      submitted_at: null,
      questions: attemptQuestions,
    };

    saveLocalJson<LocalAttemptBundle>("mock_active", { state, answerKey });
    return { backend: "local", attempt: state };
  }
}

export async function saveMockAnswer(
  backend: MockBackendMode,
  attemptId: string,
  questionId: string,
  payload: {
    selected_option_id: string | null;
    marked_for_review: boolean;
    time_spent_sec: number;
  }
): Promise<void> {
  if (backend === "fastapi") {
    try {
      await apiFetch(`/api/v1/attempts/${attemptId}/answers/${questionId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return;
    } catch {
      // Fallback to updating local bundle if server drops mid-attempt
    }
  }

  const bundle = loadLocalJson<LocalAttemptBundle | null>("mock_active", null);
  if (!bundle || bundle.state.id !== attemptId) return;
  bundle.state.questions = bundle.state.questions.map((q) =>
    q.question_id === questionId
      ? {
          ...q,
          selected_option_id: payload.selected_option_id,
          marked_for_review: payload.marked_for_review,
          time_spent_sec: Math.max(q.time_spent_sec, payload.time_spent_sec),
        }
      : q
  );
  saveLocalJson("mock_active", bundle);
}

export async function submitMockAttempt(
  backend: MockBackendMode,
  attemptState: MockAttemptState,
  totalTimeSec: number
): Promise<MockAttemptResult> {
  if (backend === "fastapi") {
    return apiFetch<MockAttemptResult>(
      `/api/v1/attempts/${attemptState.id}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ total_time_sec: totalTimeSec }),
      }
    );
  }

  const bundle = loadLocalJson<LocalAttemptBundle | null>("mock_active", null);
  const bp = BLUEPRINTS.find((b) => b.code === attemptState.exam_code) ?? BLUEPRINTS[0];
  const answerKey = bundle?.answerKey ?? {};

  const buckets: Record<string, { correct: number; total: number; time_spent_sec: number }> = {};
  let rawCorrect = 0;

  const reviewQuestions: MockGradedQuestionReview[] = attemptState.questions.map((q) => {
    const key = answerKey[q.question_id];
    const isCorrect = Boolean(q.selected_option_id && key && q.selected_option_id === key.correctOptionId);
    if (isCorrect) rawCorrect++;

    const b = (buckets[q.section] ??= { correct: 0, total: 0, time_spent_sec: 0 });
    b.total += 1;
    b.time_spent_sec += q.time_spent_sec;
    if (isCorrect) b.correct += 1;

    return {
      index: q.index,
      question_id: q.question_id,
      exam_code: q.exam_code,
      section: q.section,
      topic_tag: q.topic_tag,
      prompt: q.prompt,
      explanation: key?.explanation ?? "",
      selected_option_id: q.selected_option_id,
      correct_option_id: key?.correctOptionId ?? "",
      is_correct: isCorrect,
      marked_for_review: q.marked_for_review,
      time_spent_sec: q.time_spent_sec,
      options: key?.options ?? [],
    };
  });

  let allSectionsPassed = true;
  const sectionScores: MockSectionScoreResult[] = Object.entries(buckets).map(([sec, b]) => {
    const secBp = bp.sections.find((s) => s.section === sec);
    const acc = b.total > 0 ? Math.round((b.correct / b.total) * 1000) / 10 : 0;
    const maxScaled = secBp?.max_scaled_score ?? 60;
    const scaled = b.total > 0 ? Math.round((b.correct / b.total) * maxScaled) : 0;
    const minReq = bp.scoring_model === "jlpt_180" ? (secBp?.min_scaled_score ?? null) : null;
    const secPassed = minReq == null ? true : scaled >= minReq;
    if (bp.scoring_model === "jlpt_180" && attemptState.mode === "full" && !secPassed) {
      allSectionsPassed = false;
    }
    return {
      section: sec,
      label: secBp?.label ?? sec,
      correct: b.correct,
      total: b.total,
      accuracy_pct: acc,
      scaled_score: scaled,
      max_scaled_score: maxScaled,
      min_scaled_score: minReq,
      section_passed: secPassed,
      time_spent_sec: b.time_spent_sec,
    };
  });

  const rawTotal = reviewQuestions.length;
  const accuracyPct = rawTotal > 0 ? Math.round((rawCorrect / rawTotal) * 1000) / 10 : 0;
  const maxScore =
    attemptState.mode === "section"
      ? (sectionScores[0]?.max_scaled_score ?? 100)
      : bp.max_score;
  const scaledScore = rawTotal > 0 ? Math.round((rawCorrect / rawTotal) * maxScore) : 0;
  const passTotal =
    attemptState.mode === "section"
      ? Math.round(maxScore * (bp.pass_total / bp.max_score))
      : bp.pass_total;
  const passed = scaledScore >= passTotal && allSectionsPassed;

  const weakSections = sectionScores
    .filter((s) => s.accuracy_pct < 70)
    .sort((a, b) => a.accuracy_pct - b.accuracy_pct)
    .map((s) => s.section);

  const result: MockAttemptResult = {
    attempt_id: attemptState.id,
    exam_code: bp.code,
    exam_name: bp.name,
    mode: attemptState.mode,
    scoring_model: bp.scoring_model,
    raw_correct: rawCorrect,
    raw_total: rawTotal,
    accuracy_pct: accuracyPct,
    scaled_score: scaledScore,
    max_score: maxScore,
    pass_total: passTotal,
    passed,
    pass_rule_summary: bp.pass_rule_summary,
    total_time_sec: totalTimeSec,
    weak_sections: weakSections,
    weak_topics: weakSections,
    section_scores: sectionScores,
    questions: reviewQuestions,
    submitted_at: new Date().toISOString(),
  };

  const prevHistory = loadLocalJson<MockAttemptResult[]>("mock_history", []);
  saveLocalJson("mock_history", [result, ...prevHistory].slice(0, 20));
  saveLocalJson("mock_active", null);
  return result;
}

export async function fetchAttemptResults(
  backend: MockBackendMode,
  attemptId: string
): Promise<MockAttemptResult | null> {
  if (backend === "fastapi") {
    try {
      return await apiFetch<MockAttemptResult>(`/api/v1/attempts/${attemptId}/results`);
    } catch {
      return null;
    }
  }
  const saved = loadLocalJson<MockAttemptResult[]>("mock_history", []);
  return saved.find((r) => r.attempt_id === attemptId) ?? null;
}
