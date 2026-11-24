# Phase 1 — Mistake Bank (Still No App)

**Goal:** Collect the questions YOU get wrong from real textbooks and mock tests. That is your content.
Do **not** write N1 questions from scratch—use real material.

**Gate 1:** `50` entries total, with at least `20` of them tagged `N2`.

## Spreadsheet Columns (`mistakes.csv`)
Open `mistakes.csv` in Excel, Google Sheets, or VS Code (Edit CSV):

1. `id` — Unique ID (e.g., `001`, `002`, ...)
2. `exam` — `JFT`, `N2`, `N1` (or `N3` / `N4`)
3. `section` — `vocabulary`, `grammar`, `reading`, or `listening`
4. `question` — Exact question text (or prompt)
5. `choices` — Pipe-separated options so CSV stays clean (e.g., `1. A | 2. B | 3. C | 4. D`)
6. `answer` — Correct choice
7. `my_wrong_answer` — What you picked
8. `explanation` — Why the answer is right / why you missed it (Japanese, English, or Nepali)
9. `choice_explanations` — Optional pipe-separated per-option English breakdowns matching `choices` order
10. `source` — Book name, page number, or mock test name
11. `times_seen` — Number of times reviewed (start at `1`)
12. `times_correct` — Number of times answered correctly (start at `0`)
13. `last_seen` — `YYYY-MM-DD`
