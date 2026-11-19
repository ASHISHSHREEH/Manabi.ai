import type { Question } from "@/types/question";

export interface ShuffledChoice {
  displayText: string;
  originalText: string;
  originalIndex: number;
  isCorrect: boolean;
}

export interface SessionQuestion {
  question: Question;
  choices: ShuffledChoice[];
}

/** Remove a leading option prefix like "1. ", "2) ", or "A. " when content follows. */
export function stripChoiceLabel(choice: string): string {
  const trimmed = choice.trim();
  const stripped = trimmed.replace(/^(?:\d+|[A-Za-z])[.)]\s+/, "");
  return stripped || trimmed;
}

/**
 * Determine whether a selected choice matches the question's answer.
 * Supports exact text, label prefixes ("B.", "2)"), 1-based numeric index, or A-D letter index.
 */
export function isChoiceCorrect(
  question: Question,
  selectedChoice: string,
  selectedIndex: number
): boolean {
  const expected = question.answer.trim();
  const chosen = selectedChoice.trim();
  if (!expected) return false;

  if (chosen.toLowerCase() === expected.toLowerCase()) {
    return true;
  }

  const normalizedPrefix = new RegExp(`^${escapeRegExp(expected)}(?:[.)\\]:\\s]|$)`, "i");
  const hasExactChoiceMatch = question.choices.some(
    (c) => c.trim().toLowerCase() === expected.toLowerCase()
  );

  if (!hasExactChoiceMatch && normalizedPrefix.test(chosen)) {
    return true;
  }

  if (!hasExactChoiceMatch && /^[1-9]$/.test(expected)) {
    return selectedIndex + 1 === Number(expected);
  }

  if (!hasExactChoiceMatch && /^[a-z]$/i.test(expected)) {
    const letterIndex = expected.toUpperCase().charCodeAt(0) - 65;
    return selectedIndex === letterIndex;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Filter questions by exam and section ("ALL" disables either filter). */
export function filterQuestions(
  questions: Question[],
  exam: string,
  section: string
): Question[] {
  return questions.filter((q) => {
    const examMatch = exam === "ALL" || q.exam.toUpperCase() === exam.toUpperCase();
    const sectionMatch =
      section === "ALL" || q.section.toLowerCase() === section.toLowerCase();
    return examMatch && sectionMatch;
  });
}

/** Shuffle a question's choices using Fisher-Yates so answer positions vary every session. */
export function shuffleQuestionChoices(
  question: Question,
  randomFn: () => number = Math.random
): SessionQuestion {
  const items: ShuffledChoice[] = question.choices.map((choice, idx) => ({
    displayText: stripChoiceLabel(choice),
    originalText: choice,
    originalIndex: idx,
    isCorrect: isChoiceCorrect(question, choice, idx),
  }));

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return { question, choices: items };
}

/** Prepare a quiz session with freshly shuffled choices for every question. */
export function prepareSessionQuestions(
  questions: Question[],
  randomFn: () => number = Math.random
): SessionQuestion[] {
  return questions.map((q) => shuffleQuestionChoices(q, randomFn));
}
