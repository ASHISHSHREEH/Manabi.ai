import test from "node:test";
import assert from "node:assert/strict";
import {
  filterQuestions,
  isChoiceCorrect,
  prepareSessionQuestions,
  stripChoiceLabel,
} from "./quiz.ts";
import type { Question } from "../types/question.ts";

const sampleQuestion: Question = {
  id: "001",
  exam: "N2",
  section: "grammar",
  question: "Sample",
  choices: ["1. のに", "2. から", "3. ので", "4. ても"],
  answer: "2",
  explanation: "Explanation",
};

test("isChoiceCorrect supports exact text, numeric index, and letter index", () => {
  assert.equal(isChoiceCorrect(sampleQuestion, "2. から", 1), true);
  assert.equal(isChoiceCorrect(sampleQuestion, "1. のに", 0), false);

  const exactQuestion: Question = {
    ...sampleQuestion,
    choices: ["のに", "から", "ので", "ても"],
    answer: "から",
  };
  assert.equal(isChoiceCorrect(exactQuestion, "から", 1), true);
  assert.equal(isChoiceCorrect(exactQuestion, "のに", 0), false);

  const letterQuestion: Question = {
    ...sampleQuestion,
    choices: ["Apple", "Banana", "Cherry", "Date"],
    answer: "C",
  };
  assert.equal(isChoiceCorrect(letterQuestion, "Cherry", 2), true);
  assert.equal(isChoiceCorrect(letterQuestion, "Apple", 0), false);
});

test("filterQuestions filters by exam and section", () => {
  const list: Question[] = [
    sampleQuestion,
    { ...sampleQuestion, id: "002", exam: "JFT", section: "vocabulary" },
  ];
  assert.equal(filterQuestions(list, "ALL", "ALL").length, 2);
  assert.equal(filterQuestions(list, "N2", "ALL").length, 1);
  assert.equal(filterQuestions(list, "ALL", "vocabulary").length, 1);
  assert.equal(filterQuestions(list, "N2", "vocabulary").length, 0);
});

test("stripChoiceLabel removes leading choice numbers/letters without dropping numbers in text", () => {
  assert.equal(stripChoiceLabel("2. しょるい"), "しょるい");
  assert.equal(stripChoiceLabel("1. 10月13日以降"), "10月13日以降");
  assert.equal(stripChoiceLabel("B) Banana"), "Banana");
  assert.equal(stripChoiceLabel("plain"), "plain");
});

test("prepareSessionQuestions shuffles choice order while preserving exact correctness and explanations", () => {
  const withChoiceExplanations: Question = {
    ...sampleQuestion,
    choice_explanations: [
      "Wrong: のに means even though.",
      "Correct: から means because.",
      "Wrong: ので is softer reason.",
      "Wrong: ても means even if.",
    ],
  };

  let seed = 0.2;
  const deterministicRandom = () => {
    seed = (seed + 0.37) % 1;
    return seed;
  };

  const [prepared] = prepareSessionQuestions([withChoiceExplanations], deterministicRandom);
  assert.equal(prepared.choices.length, 4);

  const correctChoices = prepared.choices.filter((c) => c.isCorrect);
  assert.equal(correctChoices.length, 1);
  assert.equal(correctChoices[0].displayText, "から");
  assert.equal(correctChoices[0].originalIndex, 1);
  assert.equal(correctChoices[0].explanation, "Correct: から means because.");

  for (const choice of prepared.choices) {
    assert.equal(
      choice.explanation,
      withChoiceExplanations.choice_explanations?.[choice.originalIndex]
    );
  }
});
