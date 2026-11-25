"use client";

import { BookOpenCheck, Download, Flame } from "lucide-react";
import type { AppView } from "@/types/question";

interface TopNavProps {
  activeView: AppView;
  streakDays: number;
  profileName: string;
  onSelectView: (view: AppView) => void;
  onStartPractice: () => void;
  onExportBackup: () => void;
  onOpenProfile: () => void;
}

type NavKey = "hub" | "mock" | "quiz" | "bank" | "stats";

const NAV_ITEMS: { key: NavKey; label: string; mobileLabel?: string }[] = [
  { key: "hub", label: "Home" },
  { key: "mock", label: "Mock Exam", mobileLabel: "Mock" },
  { key: "quiz", label: "Practice" },
  { key: "bank", label: "Questions" },
  { key: "stats", label: "Stats" },
];

export function TopNav({
  activeView,
  streakDays,
  profileName,
  onSelectView,
  onStartPractice,
  onExportBackup,
  onOpenProfile,
}: TopNavProps) {
  const initial = (profileName.trim()[0] || "A").toUpperCase();

  function handleNavClick(key: NavKey) {
    if (key === "quiz") {
      onStartPractice();
      return;
    }
    onSelectView(key);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between gap-4 px-4 md:gap-6 md:px-6">
        <button
          type="button"
          onClick={() => onSelectView("hub")}
          className="flex shrink-0 items-center gap-2.5 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">
            Manabi Prep
          </span>
        </button>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => handleNavClick(item.key)}
                className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1.5 text-[13px] font-bold text-orange-700"
            title={`${streakDays} day streak`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{streakDays}d</span>
          </span>

          <button
            type="button"
            onClick={onExportBackup}
            aria-label="Export backup"
            title="Export JSON backup"
            className="hidden h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 md:flex"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Profile"
            title={`${profileName} · Device profile & backup`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800 transition-colors hover:bg-indigo-200"
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  );
}

interface MobileBottomNavProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onStartPractice: () => void;
}

/** Sticky 4-tab bottom bar shown on phone viewports outside active quizzes. */
export function MobileBottomNav({
  activeView,
  onSelectView,
  onStartPractice,
}: MobileBottomNavProps) {
  function handleNavClick(key: NavKey) {
    if (key === "quiz") {
      onStartPractice();
      return;
    }
    onSelectView(key);
  }

  return (
    <nav
      aria-label="Mobile Main"
      className="sticky bottom-0 z-30 mt-auto grid h-16 grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = activeView === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => handleNavClick(item.key)}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${
              active ? "text-indigo-700" : "text-slate-500"
            }`}
          >
            <span
              className={`h-1 w-5 rounded-full ${
                active ? "bg-indigo-600" : "bg-transparent"
              }`}
            />
            <span>{item.mobileLabel ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
