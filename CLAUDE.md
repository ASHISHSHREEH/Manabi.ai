# CLAUDE.md — Personal Japanese Exam Prep App

## Stack
- Next.js 15 (App Router, static prerendered) + TypeScript + Tailwind CSS v4
- `lucide-react` icons + `recharts` 7-day activity chart
- One-way data flow: `../01-mistake-bank/mistakes.csv` -> `npm run sync` (validates every row) -> `data/questions.json` (never edit by hand)
- Browser `localStorage` only via `src/lib/storage.ts`. Deploy free on Vercel.

## Folder Layout
```
02-web-app/
├── scripts/sync-mistakes.mjs       # CSV -> JSON + strict row validation
├── data/questions.json             # Generated — do not edit by hand
└── src/
    ├── types/question.ts           # Question, ProgressMap, AppView types
    ├── lib/                        # Pure tested logic: quiz.ts, analytics.ts, storage.ts (ONLY localStorage file)
    ├── hooks/useStudyState.ts      # State + derived analytics bridge
    ├── components/                 # UI grouped by feature: layout/, hub/, quiz/, stats/, ui/
    └── app/                        # layout.tsx, globals.css, page.tsx
```

## Commands
- `npm run sync` — Validate `mistakes.csv` & regenerate `data/questions.json`
- `npm run dev` / `npm run dev:mobile` — Local dev / LAN phone testing
- `npm test` && `npx tsc --noEmit` && `npm run build` — Verify before deploying

## DO NOT BUILD
- Login / accounts / multi-user features
- Backend server, database, or cloud storage
- Payments, admin dashboard, or native Flutter app
- Writing questions from scratch when real material exists
