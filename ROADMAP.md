# Personal Japanese Exam Prep App — Roadmap

- **User:** Ashish only (personal study tool, free, no other users)
- **Exams:** JFT-Basic, JLPT N2, JLPT N1
- **Core rule:** One app, many exams. Every question has an `exam` tag (`JFT` / `N2` / `N1` / `N3` / `N4`). More exams = more data, same code.

## Suggested Study Order
1. **JFT-Basic** — A2 level. Take one official sample test first; if you pass easily, you may need almost no prep.
2. **JLPT N2** — Main target.
3. **JLPT N1** — After N2 is passed.
*(If any exam has a real deadline such as a job or visa, prioritize that one first.)*

---

## Workspace Layout

- [ARCHITECTURE.md](ARCHITECTURE.md) — System structure, data flow, and frontend module architecture
- [00-targets/targets.md](00-targets/targets.md) — Phase 0 exam dates, baseline scores, and weakest sections
- [01-mistake-bank/mistakes.csv](01-mistake-bank/mistakes.csv) — Phase 1 mistake spreadsheet (still no app)
- [02-web-app/CLAUDE.md](02-web-app/CLAUDE.md) — Phase 2 blueprint (~40 lines, start only after Gate 1)
- [weekly-checks/](weekly-checks/) — Sunday check-ins and study-vs-coding hours tracker
- [resources/](resources/) — Sample tests, textbook notes, and study materials

---

## Phase Gates Checklist

### Phase 0 — Set the Target (`00-targets/targets.md`)
- [ ] Pick exam dates / sessions and write them down
- [ ] Take 1 official sample test for JFT-Basic, JLPT N2, and JLPT N1
- [ ] Write down your 3 weakest sections for N2 and N1 (`vocabulary`, `grammar`, `reading`, `listening`)
- **GATE 0:** Exam dates written down + 3 baseline scores recorded

### Phase 1 — Mistake Bank (`01-mistake-bank/mistakes.csv`) *(still no app)*
- [ ] Log every missed question from textbooks or mock tests (use real material, do not invent N1 questions)
- [ ] Write explanations in Japanese, English, or Nepali — whichever helps most
- [ ] Reach 50 entries
- **GATE 1:** 50 entries total, at least 20 of them `N2`

### Phase 2 — Simple Web App (`02-web-app/`) *(only after Gate 1)*
- [ ] Choose exam + section -> answer -> see right/wrong + explanation
- [ ] Save results in `localStorage` (JSON exported from `mistakes.csv`, no backend/login)
- [ ] Mobile-friendly UI for train / spare-time study
- [ ] Deploy on Vercel (free)
- **GATE 2:** Used 5 days/week for 2 weeks *(if not, diagnose why before adding features)*

### Phase 3 — Smart Review *(only after Gate 2)*
- [ ] Simple SM-2 spaced repetition (`wrong -> tomorrow`, `right -> 3d -> 7d -> 14d`)
- [ ] Stats page (accuracy per exam and per section)
- [ ] Timed mock mode
- [ ] JSON progress backup (export/import)
- **GATE 3:** Accuracy improves on your weakest section

### Phase 4 — Extras *(pick ONE at a time, only if it helps study)*
- [ ] Listening questions with audio files
- [ ] Kanji / vocabulary flashcard mode
- [ ] AI explanation button (Claude API)
- [ ] Pronunciation practice (link to pronunciation research)

---

## Do Not Build
- Login / accounts
- Backend server, database, or cloud storage
- Payments / paid version
- Multi-user features
- Native Flutter app
- Admin dashboard
- Writing questions from scratch when real material exists

## Stop / Pause Rules
- **Coding hours > Study hours two weeks in a row** -> Stop coding and use the spreadsheet or Anki instead.
- **Not using your own app for 2 weeks** -> It isn't helping; go back to books/Anki without guilt.
- **Passing the exam is the goal. Finishing the app is not.**
