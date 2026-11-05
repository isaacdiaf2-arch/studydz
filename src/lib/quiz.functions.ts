import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { quizService as QuizServiceFactory } from "@/server/quiz/quiz.service";

type QuizService = ReturnType<typeof QuizServiceFactory>;

async function run<T>(fn: (svc: QuizService) => Promise<T>): Promise<T> {
  const { getServiceDb } = await import("@/server/db/adapter");
  const { quizService, ForbiddenError } = await import("@/server/quiz/quiz.service");
  try {
    return await fn(quizService(await getServiceDb()));
  } catch (e) {
    if (e instanceof ForbiddenError) {
      try { setResponseStatus(403); } catch { /* no request context */ }
    }
    throw e;
  }
}

const idSchema = z.object({ assessmentId: z.string().uuid() });
const submitSchema = idSchema.extend({ answers: z.record(z.string().uuid(), z.string().uuid().nullable()) });

export const listStudentQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => run((s) => s.list(context.userId)));

export const getQuizForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(({ data, context }) => run((s) => s.load(context.userId, data.assessmentId)));

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(({ data, context }) => run((s) => s.submit(context.userId, data.assessmentId, data.answers)));
