import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VALID_EXAMS = new Set(["JFT", "N3", "N2", "N1", "N4"]);
export const VALID_SECTIONS = new Set(["vocabulary", "grammar", "reading", "listening"]);
const REQUIRED_HEADERS = ["id", "exam", "section", "question", "choices", "answer"];

/**
 * Parse RFC-4180 CSV text into a 2D array of strings.
 * Handles UTF-8 BOM, CRLF/LF newlines, quoted commas, newlines inside quotes, and escaped quotes ("").
 */
export function parseCsv(csvText) {
  const text = csvText.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else if (ch === "\n" || ch === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

function isValidAnswerForChoices(answer, choices) {
  const expected = answer.trim();
  if (!expected) return false;

  if (choices.some((c) => c.trim().toLowerCase() === expected.toLowerCase())) {
    return true;
  }

  if (/^[1-9]$/.test(expected)) {
    return Number(expected) >= 1 && Number(expected) <= choices.length;
  }

  if (/^[a-z]$/i.test(expected)) {
    const idx = expected.toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < choices.length;
  }

  const prefixRe = new RegExp(
    `^${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[.)\\]:\\s]|$)`,
    "i"
  );
  return choices.some((c) => prefixRe.test(c.trim()));
}

/**
 * Validate and convert parsed CSV rows into Question JSON objects.
 * Returns `{ questions, errors }` so bad spreadsheet rows are caught before overwriting JSON.
 */
export function validateAndConvertRows(rows) {
  if (rows.length === 0) {
    return { questions: [], errors: ["CSV file is empty (missing header row)."] };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      questions: [],
      errors: [`Missing required CSV column(s): ${missingHeaders.join(", ")}`],
    };
  }

  const indexOf = (name) => headers.indexOf(name);
  const seenIds = new Set();
  const questions = [];
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;
    const r = rows[i];
    const get = (name) => {
      const idx = indexOf(name);
      return idx >= 0 && idx < r.length ? r[idx].trim() : "";
    };

    const id = get("id");
    const exam = get("exam").toUpperCase();
    const section = get("section").toLowerCase();
    const questionText = get("question");
    const rawChoices = get("choices");
    const rawChoiceExplanations = get("choice_explanations");
    const answerText = get("answer");
    const choices = rawChoices
      ? rawChoices
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    const choiceExplanations = rawChoiceExplanations
      ? rawChoiceExplanations.split("|").map((c) => c.trim())
      : [];

    const rowErrors = [];
    if (!id) rowErrors.push("missing id");
    else if (seenIds.has(id)) rowErrors.push(`duplicate id "${id}"`);

    if (!VALID_EXAMS.has(exam)) {
      rowErrors.push(`invalid exam "${exam}" (expected JFT, N3, N2, N1, or N4)`);
    }
    if (!VALID_SECTIONS.has(section)) {
      rowErrors.push(
        `invalid section "${section}" (expected vocabulary, grammar, reading, or listening)`
      );
    }
    if (!questionText) rowErrors.push("missing question");
    if (choices.length < 2) rowErrors.push("choices must have at least 2 options separated by |");
    if (choiceExplanations.length > 0) {
      if (choiceExplanations.length !== choices.length) {
        rowErrors.push(
          `choice_explanations count (${choiceExplanations.length}) must match choices count (${choices.length})`
        );
      } else if (choiceExplanations.some((e) => !e)) {
        rowErrors.push("choice_explanations cannot contain empty entries");
      }
    }
    if (!answerText) rowErrors.push("missing answer");
    else if (choices.length >= 2 && !isValidAnswerForChoices(answerText, choices)) {
      rowErrors.push(`answer "${answerText}" does not match any choice`);
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum} (${id || "no-id"}): ${rowErrors.join("; ")}`);
      continue;
    }

    seenIds.add(id);
    questions.push({
      id,
      exam,
      section,
      question: questionText,
      choices,
      answer: answerText,
      ...(get("my_wrong_answer") ? { my_wrong_answer: get("my_wrong_answer") } : {}),
      explanation: get("explanation"),
      ...(choiceExplanations.length > 0 ? { choice_explanations: choiceExplanations } : {}),
      ...(get("source") ? { source: get("source") } : {}),
    });
  }

  return { questions, errors };
}

/** Convenience wrapper returning valid questions array. */
export function rowsToQuestions(rows) {
  return validateAndConvertRows(rows).questions;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.resolve(__dirname, "../../01-mistake-bank/mistakes.csv");
  const outPath = path.resolve(__dirname, "../data/questions.json");

  if (!fs.existsSync(csvPath)) {
    console.error(`Missing CSV file: ${csvPath}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvText);
  const { questions, errors } = validateAndConvertRows(rows);

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
  console.log(`Validated & synced ${questions.length} question(s) -> ${outPath}`);
}
