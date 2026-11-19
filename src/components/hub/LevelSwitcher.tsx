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
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1.5 px-3 py-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:px-6">
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
              onClick={() => onSelectExam(lvl.id)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-center transition sm:min-h-10 sm:flex-row sm:gap-2 sm:rounded-full sm:px-3.5 ${
                active
                  ? lvl.activeClass
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-1 text-xs font-bold sm:text-sm">
                {!active && (
                  <span className={`hidden h-2 w-2 rounded-full sm:inline-block ${lvl.dotClass}`} />
                )}
                <span className="sm:hidden">{lvl.shortLabel}</span>
                <span className="hidden sm:inline">{lvl.label}</span>
              </span>
              <span
                className={`text-[10px] font-medium sm:text-xs ${
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
