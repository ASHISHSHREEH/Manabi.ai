"use client";

import { BarChart3, BookOpenCheck, Flame, Layers, Search } from "lucide-react";
import type { AppView } from "@/types/question";

interface TopNavProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  streakDays: number;
  todayAnswered: number;
  dailyTarget: number;
}

const NAV_TABS: {
  id: AppView;
  label: string;
  icon: typeof Layers;
}[] = [
  { id: "hub", label: "Study Hub", icon: Layers },
  { id: "bank", label: "Questions", icon: Search },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export function TopNav({
  activeView,
  onSelectView,
  streakDays,
  todayAnswered,
  dailyTarget,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-13 max-w-5xl items-center justify-between gap-2 px-3 sm:h-14 sm:px-6">
        <button
          type="button"
          onClick={() => onSelectView("hub")}
          className="flex shrink-0 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <BookOpenCheck className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            Manabi Prep
          </span>
        </button>

        <nav
          className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex"
          aria-label="Primary navigation"
        >
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              activeView === tab.id || (activeView === "quiz" && tab.id === "hub");
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectView(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
          <span
            title="Consecutive active days"
            className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700"
          >
            <Flame className="h-3.5 w-3.5" />
            {streakDays}d
          </span>
          <button
            type="button"
            onClick={() => onSelectView("stats")}
            className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 hover:bg-indigo-100"
          >
            {todayAnswered}/{dailyTarget}
          </button>
        </div>
      </div>

      {/* Compact mobile tab strip inside header (never blocks bottom of screen) */}
      <nav
        aria-label="Mobile navigation"
        className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70 sm:hidden"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            activeView === tab.id || (activeView === "quiz" && tab.id === "hub");
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView(tab.id)}
              className={`flex min-h-10 items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${
                active
                  ? "border-indigo-600 bg-white text-indigo-700"
                  : "border-transparent text-slate-500 active:text-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
