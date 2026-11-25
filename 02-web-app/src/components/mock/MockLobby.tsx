"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  History,
  Layers,
  Play,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { MockBackendMode } from "@/lib/mockApi";
import type { ExamCatalogItem, MockAttemptHistoryItem } from "@/types/question";

interface MockLobbyProps {
  exams: ExamCatalogItem[];
  backendMode: MockBackendMode;
  history: MockAttemptHistoryItem[];
  initialExamCode?: string;
  loadingStart: boolean;
  errorMessage: string;
  onStartMock: (opts: {
    examCode: string;
    mode: "full" | "section";
    section?: string;
    questionLimit?: number;
  }) => void;
  onOpenHistoryResult: (attemptId: string) => void;
}

function formatMins(sec: number): string {
  const mins = Math.round(sec / 60);
  return `${mins} min`;
}

export function MockLobby({
  exams,
  backendMode,
  history,
  initialExamCode = "JFT",
  loadingStart,
  errorMessage,
  onStartMock,
  onOpenHistoryResult,
}: MockLobbyProps) {
  const [selectedCode, setSelectedCode] = useState<string>(initialExamCode);
  const [mode, setMode] = useState<"full" | "section">("full");
  const [selectedSection, setSelectedSection] = useState<string>("vocabulary");
  const [quickLength, setQuickLength] = useState<"blueprint" | "short20">("blueprint");

  const activeExam =
    exams.find((e) => e.code === selectedCode) ?? exams[0];

  const availableSections =
    activeExam?.sections.filter((s) => s.available_count > 0) ?? [];

  const effectiveSection = availableSections.some((s) => s.section === selectedSection)
    ? selectedSection
    : (availableSections[0]?.section ?? "vocabulary");

  const selectedSecMeta = activeExam?.sections.find(
    (s) => s.section === effectiveSection
  );

  const estimatedQuestions =
    mode === "full"
      ? activeExam?.sections.reduce(
          (sum, s) => sum + Math.min(s.target_count, s.available_count),
          0
        ) ?? 0
      : Math.min(
          quickLength === "short20"
            ? 20
            : (selectedSecMeta?.target_count ?? 20),
          selectedSecMeta?.available_count ?? 0
        );

  const fullCapped =
    quickLength === "short20" && mode === "full"
      ? Math.min(20, estimatedQuestions)
      : estimatedQuestions;

  const estimatedDurationSec =
    mode === "full"
      ? Math.max(
          300,
          Math.round(
            (activeExam?.duration_sec ?? 3600) *
              (fullCapped /
                Math.max(
                  1,
                  activeExam?.sections.reduce((s, x) => s + x.target_count, 0) ?? 1
                ))
          )
        )
      : Math.max(
          180,
          Math.round(
            (selectedSecMeta?.duration_sec ?? 1200) *
              (fullCapped / Math.max(1, selectedSecMeta?.target_count ?? 20))
          )
        );

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Engine Mode Badge */}
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-indigo-700">
            SYSTEM 1 · TIMED MOCK EXAMINATION
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-[28px]">
            Mock Examination Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Simulate real JFT-Basic &amp; JLPT exam conditions. Answers and explanations stay hidden until you submit.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            backendMode === "fastapi"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          title={
            backendMode === "fastapi"
              ? "Connected to FastAPI + SQLAlchemy backend"
              : "FastAPI offline — using deterministic local mock engine"
          }
        >
          {backendMode === "fastapi" ? (
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>
            {backendMode === "fastapi" ? "FastAPI Engine Connected" : "Local Engine Active"}
          </span>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left 2 cols: Exam Selector & Blueprint Configuration */}
        <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">1. Choose Examination</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {exams.map((ex) => {
                const active = ex.code === activeExam?.code;
                const empty = ex.total_available === 0;
                return (
                  <button
                    key={ex.code}
                    type="button"
                    disabled={empty}
                    onClick={() => setSelectedCode(ex.code)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                      empty
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                        : active
                          ? "cursor-pointer border-indigo-600 bg-indigo-50/70 text-slate-900 ring-1 ring-indigo-600"
                          : "cursor-pointer border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-bold">{ex.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          empty
                            ? "bg-slate-200 text-slate-500"
                            : active
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ex.total_available > 0 ? `${ex.total_available} Qs` : "0 Qs"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {ex.scoring_model === "jft_250" ? "250-pt scale" : "180-pt + cutoffs"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">2. Mock Format</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("full")}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    mode === "full"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Full Mock
                  <span
                    className={`block text-[11px] font-normal ${
                      mode === "full" ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    Multi-section exam
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("section")}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    mode === "section"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Section Mock
                  <span
                    className={`block text-[11px] font-normal ${
                      mode === "section" ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    Targeted timed drill
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">3. Length Preset</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickLength("blueprint")}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    quickLength === "blueprint"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Blueprint
                  <span
                    className={`block text-[11px] font-normal ${
                      quickLength === "blueprint" ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Standard exam size
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickLength("short20")}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    quickLength === "short20"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Sprint (20 Qs)
                  <span
                    className={`block text-[11px] font-normal ${
                      quickLength === "short20" ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Shorter timed check
                  </span>
                </button>
              </div>
            </div>
          </div>

          {mode === "section" && activeExam && (
            <div>
              <h2 className="text-sm font-bold text-slate-900">Select Section</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {activeExam.sections.map((sec) => {
                  const empty = sec.available_count === 0;
                  const active = sec.section === effectiveSection;
                  return (
                    <button
                      key={sec.section}
                      type="button"
                      disabled={empty}
                      onClick={() => setSelectedSection(sec.section)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        empty
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : active
                            ? "cursor-pointer border-indigo-600 bg-indigo-50 font-bold text-indigo-800"
                            : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold capitalize">{sec.section}</div>
                      <div className="mt-0.5 text-[11px]">
                        {empty ? "0 Qs (not yet added)" : `${sec.available_count} Qs available`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exam Blueprint Breakdown */}
          {activeExam && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                  <span>{activeExam.name} Scoring &amp; Blueprint</span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {fullCapped} questions · {formatMins(estimatedDurationSec)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                {activeExam.pass_rule_summary}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {activeExam.sections.map((sec) => (
                  <div
                    key={sec.section}
                    className={`rounded-lg border px-2.5 py-2 text-xs ${
                      sec.available_count === 0
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="font-semibold capitalize">{sec.section}</div>
                    <div className="mt-0.5 tabular-nums">
                      {Math.min(sec.target_count, sec.available_count)}/{sec.target_count} Qs
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Auto-submit at 00:00
              </span>
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                Mark for review + auto-save
              </span>
            </div>

            <button
              type="button"
              disabled={loadingStart || fullCapped === 0}
              onClick={() =>
                onStartMock({
                  examCode: activeExam.code,
                  mode,
                  section: mode === "section" ? effectiveSection : undefined,
                  questionLimit: quickLength === "short20" ? 20 : undefined,
                })
              }
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              {loadingStart
                ? "Preparing Exam..."
                : `Start Timed Mock (${fullCapped} Qs)`}
            </button>
          </div>
        </section>

        {/* Right Col: Recent Mock Attempts */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <History className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Recent Mock Results
            </h2>
            <span className="text-xs text-slate-500">{history.length} saved</span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No mock exams taken yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Complete a timed mock exam to generate section scores, weak topics, and mistake-bank entries.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {history.slice(0, 6).map((item) => (
                <button
                  key={item.attempt_id}
                  type="button"
                  disabled={item.status !== "submitted"}
                  onClick={() => onOpenHistoryResult(item.attempt_id)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-default"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <span>{item.exam_name}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {item.mode}
                        {item.section_filter ? ` · ${item.section_filter}` : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                      {item.raw_correct ?? 0}/{item.raw_total ?? 0} right ·{" "}
                      {item.scaled_score ?? 0}/{item.max_score ?? 0}
                    </div>
                  </div>
                  {item.passed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
