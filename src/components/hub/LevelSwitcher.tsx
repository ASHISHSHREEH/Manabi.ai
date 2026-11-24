"use client";

import type { Question } from "@/types/question";

interface LevelSwitcherProps {
  questions: Question[];
  selectedExam: string;
  onSelectExam: (exam: string) => void;
}

const LEVELS = [
  {
    id: "ALL",
    shortLabel: "All",
    label: "All Exams",
    activeClass: "bg-slate-900 text-white border-slate-900 shadow-xs",
    dotClass: "bg-slate-400",
  },
  {
    id: "JFT",
    shortLabel: "JFT",
    label: "JFT-Basic",
    activeClass: "bg-sky-600 text-white border-sky-600 shadow-xs",
    dotClass: "bg-sky-500",
  },
  {
    id: "N4",
    shortLabel: "N4",
    label: "JLPT N4",
    activeClass: "bg-amber-600 text-white border-amber-600 shadow-xs",
    dotClass: "bg-amber-500",
  },
  {
    id: "N3",
    shortLabel: "N3",
    label: "JLPT N3",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    dotClass: "bg-emerald-500",
  },
  {
    id: "N2",
    shortLabel: "N2",
    label: "JLPT N2",
    activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-xs",
    dotClass: "bg-indigo-500",
  },
  {
    id: "N1",
    shortLabel: "N1",
    label: "JLPT N1",
    activeClass: "bg-rose-600 text-white border-rose-600 shadow-xs",
    dotClass: "bg-rose-500",
  },
] as const;

export function LevelSwitcher({
  questions,
  selectedExam,
  onSelectExam,
}: LevelSwitcherProps) {
  const extraExams = Array.from(
    new Set(
      questions
        .map((q) => q.exam.toUpperCase())
        .filter((e) => !LEVELS.some((l) => l.id === e))
    )
  ).map((id) => ({
    id,
    shortLabel: id,
    label: id,
    activeClass: "bg-slate-800 text-white border-slate-800 shadow-xs",
    dotClass: "bg-slate-500",
  }));

  const allLevels = [...LEVELS, ...extraExams];

  return (
    <div className="border-b border-slate-200/90 bg-slate-50/80">
      <div
        role="tablist"
        aria-label="Exam level filter"
        className="no-scrollbar mx-auto flex max-w-5xl items-center gap-1.5 overflow-x-auto px-3 py-2 sm:flex-wrap sm:gap-2 sm:px-6 sm:py-2.5"
      >
        {allLevels.map((lvl) => {
          const count =
            lvl.id === "ALL"
              ? questions.length
              : questions.filter((q) => q.exam.toUpperCase() === lvl.id).length;
          const active = selectedExam.toUpperCase() === lvl.id;

          return (
            <button
              key={lvl.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectExam(lvl.id)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:min-h-10 sm:gap-2 sm:px-3.5 ${
                active
                  ? lvl.activeClass
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 font-bold sm:text-sm">
                {!active && (
                  <span className={`h-2 w-2 rounded-full ${lvl.dotClass}`} />
                )}
                <span className="sm:hidden">{lvl.shortLabel}</span>
                <span className="hidden sm:inline">{lvl.label}</span>
              </span>
              <span
                className={`text-[11px] font-medium tabular-nums sm:text-xs ${
                  active ? "text-white/85" : "text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
