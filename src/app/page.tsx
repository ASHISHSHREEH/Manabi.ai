import QuizApp from "@/components/QuizApp";
import questionsData from "../../data/questions.json";
import type { Question } from "@/types/question";

export default function HomePage() {
  const questions = questionsData as Question[];
  return <QuizApp questions={questions} />;
}
