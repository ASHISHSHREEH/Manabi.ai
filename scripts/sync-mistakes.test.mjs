import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, validateAndConvertRows } from "./sync-mistakes.mjs";

test("parseCsv handles UTF-8 BOM, Japanese/Nepali text, quoted commas, and escaped quotes", () => {
  const input = [
    "\uFEFFid,exam,section,question,choices,answer,my_wrong_answer,explanation,source,times_seen,times_correct,last_seen",
    '001,n2,grammar,"雨（あめ）が降っている___、出かけます。","1. のに | 2. から | 3. ので | 4. ても","1. のに","2. から","""のに"" means even though (यद्यपि).",新完全マスター N2 p.12,1,0,2026-11-17',
  ].join("\r\n");

  const rows = parseCsv(input);
  assert.equal(rows.length, 2);

  const { questions, errors } = validateAndConvertRows(rows);
  assert.deepEqual(errors, []);
  assert.equal(questions.length, 1);
  assert.deepEqual(questions[0], {
    id: "001",
    exam: "N2",
    section: "grammar",
    question: "雨（あめ）が降っている___、出かけます。",
    choices: ["1. のに", "2. から", "3. ので", "4. ても"],
    answer: "1. のに",
    my_wrong_answer: "2. から",
    explanation: '"のに" means even though (यद्यपि).',
    source: "新完全マスター N2 p.12",
  });
});

test("validateAndConvertRows flags invalid exam, section, duplicate id, and bad answer", () => {
  const input = [
    "id,exam,section,question,choices,answer,my_wrong_answer,explanation,source",
    "001,JFT,vocabulary,テスト,A | B,A,,ok,book",
    "001,N9,spelling,Bad row,A | B,Z,,bad,book",
  ].join("\n");

  const { questions, errors } = validateAndConvertRows(parseCsv(input));
  assert.equal(questions.length, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /duplicate id "001"/);
  assert.match(errors[0], /invalid exam "N9"/);
  assert.match(errors[0], /invalid section "spelling"/);
  assert.match(errors[0], /does not match any choice/);
});
