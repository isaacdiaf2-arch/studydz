import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getQuizForStudent, listStudentQuizzes, submitQuiz } from "@/lib/quiz.functions";

type QuizItem = {
  id: string;
  title: string;
  module: string | null;
  durationMinutes: number | null;
  dueAt: string | null;
  attempt: { score: number; maxScore: number } | null;
};
type QuizDetail = {
  id: string;
  title: string;
  duration_minutes: number;
  questions: { id: string; text: string; order_index: number; options: { id: string; text: string; order_index: number }[] }[];
};

export function useStudentQuizzes() {
  const fn = useServerFn(listStudentQuizzes);
  return useQuery({ queryKey: ["student", "quizzes"], queryFn: () => fn() as Promise<QuizItem[]> });
}

export function useStudentQuiz(assessmentId: string) {
  const fn = useServerFn(getQuizForStudent);
  return useQuery({
    queryKey: ["student", "quiz", assessmentId],
    queryFn: () => fn({ data: { assessmentId } }) as Promise<QuizDetail>,
  });
}

export function useSubmitQuiz() {
  const fn = useServerFn(submitQuiz);
  return (assessmentId: string, answers: Record<string, string | null>) =>
    fn({ data: { assessmentId, answers } }) as Promise<{ score: number; maxScore: number }>;
}
