"use client";

import { useMemo, useState } from "react";
import { Play, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ProgressMap, Question } from "@/types/question";

interface QuestionBankViewProps {
  questions: Question[];
  progress: ProgressMap;
  selectedExam: string;
  onPracticeQuestion: (question: Question) => void;
  onPracticeList: (filtered: Question[]) => void;
}

type StatusFilter = "all" | "unseen" | "missed" | "mastered";

export function QuestionBankView({
  questions,
  progress,
  selectedExam,
  onPracticeQuestion,
  onPracticeList,
}: QuestionBankViewProps) {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const qLower = query.trim().toLowerCase();

    return questions.filter((item) => {
      if (
        selectedExam !== "ALL" &&
        item.exam.toUpperCase() !== selectedExam.toUpperCase()
      ) {
        return false;
      }

      if (
        sectionFilter !== "all" &&
        item.section.toLowerCase() !== sectionFilter.toLowerCase()
      ) {
        return false;
      }

      const p = progress[item.id];
      if (statusFilter === "unseen" && p && p.times_seen > 0) return false;
      if (statusFilter === "missed" && (!p || p.times_seen === 0 || p.last_correct)) {
        return false;
      }
      if (statusFilter === "mastered" && (!p || !p.last_correct)) return false;

      if (qLower) {
        const hay = `${item.id} ${item.question} ${item.explanation} ${(item.choice_explanations ?? []).join(" ")} ${item.source ?? ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }

      return true;
    });
  }, [questions, progress, selectedExam, sectionFilter, statusFilter, query]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3.5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${selectedExam === "ALL" ? "all" : selectedExam} questions by kanji, meaning, or ID...`}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-8 pl-9 text-base text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none sm:h-10 sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() => onPracticeList(filtered)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Play className="h-3.5 w-3.5" />
            Practice Matching ({filtered.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Section:</span>
          {["all", "vocabulary", "grammar", "reading", "listening"].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSectionFilter(sec)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                sectionFilter === sec
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sec}
            </button>
          ))}

          <span className="ml-auto text-xs font-medium text-slate-400 tabular-nums">
            {filtered.length} question{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Status:</span>
          {(["all", "unseen", "missed", "mastered"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          No questions match the current filters.
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const r = progress[item.id];
            const status = !r || r.times_seen === 0
              ? { label: "Unseen", variant: "slate" as const }
              : r.last_correct
                ? { label: `Right (${r.times_correct}/${r.times_seen})`, variant: "emerald" as const }
                : { label: `Missed (${r.times_correct}/${r.times_seen})`, variant: "rose" as const };

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="indigo">{item.exam}</Badge>
                    <Badge variant="slate" className="capitalize">
                      {item.section}
                    </Badge>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs text-slate-400">{item.id}</span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">
                    {item.question}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onPracticeQuestion(item)}
                  className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 sm:w-auto"
                >
                  Practice
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
