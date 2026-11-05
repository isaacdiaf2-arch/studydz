import type { DbClient } from "@/server/db/adapter";
import { quizRepository } from "./quiz.repository";

export class ForbiddenError extends Error {
  constructor(msg = "غير مسموح: هذا الاختبار خارج نطاقك.") {
    super(`403 ${msg}`);
  }
}

type Scope = { studentId: string; institutionId: string; groupIds: Set<string>; moduleIds: Set<string> };

/** Pure scope rule: published quiz of the student's own group and module. */
export function canTakeQuiz(scope: Scope, a: any): boolean {
  return (
    !!a &&
    a.kind === "quiz" &&
    a.published === true &&
    !!a.exam_id &&
    a.institution_id === scope.institutionId &&
    !!a.group_id &&
    scope.groupIds.has(a.group_id) &&
    (!a.module_id || scope.moduleIds.has(a.module_id))
  );
}

/** Pure grading: answer key never leaves the server. */
export function gradeQuiz(questions: any[], answers: Record<string, string | null>) {
  let score = 0;
  let maxScore = 0;
  const rows = questions.map((q) => {
    const points = Number(q.points);
    maxScore += points;
    const chosen = answers[q.id] ?? null;
    const correctId = (q.options ?? []).find((o: any) => o.is_correct)?.id ?? null;
    const valid = !!chosen && (q.options ?? []).some((o: any) => o.id === chosen);
    const isCorrect = valid && chosen === correctId;
    if (isCorrect) score += points;
    return { question_id: q.id, option_id: valid ? chosen : null, is_correct: isCorrect, awarded: isCorrect ? points : 0 };
  });
  return { score, maxScore, rows };
}

export function quizService(db: DbClient) {
  const repo = quizRepository(db);

  async function scope(studentId: string): Promise<Scope> {
    const s = await repo.studentScope(studentId);
    if (!s.institutionId || !s.isStudent) throw new ForbiddenError("غير مسموح.");
    const own = s.memberships.filter((m) => m.groups?.institution_id === s.institutionId);
    const levels = [...new Set(own.map((m) => m.groups?.level_id).filter(Boolean) as string[])];
    const mods = await repo.moduleIdsForLevels(s.institutionId, levels);
    return { studentId, institutionId: s.institutionId, groupIds: new Set(own.map((m) => m.group_id)), moduleIds: new Set(mods) };
  }

  async function authorized(studentId: string, assessmentId: string) {
    const sc = await scope(studentId);
    const a = await repo.getAssessment(assessmentId);
    if (!canTakeQuiz(sc, a)) throw new ForbiddenError();
    return { sc, a: a as any };
  }

  return {
    async list(studentId: string) {
      const sc = await scope(studentId);
      const rows = (await repo.listPublishedQuizzes(sc.institutionId, [...sc.groupIds])).filter((a: any) =>
        canTakeQuiz(sc, { ...a, kind: "quiz", published: true, institution_id: sc.institutionId }),
      );
      const attempts = await repo.attemptsFor(studentId, rows.map((r: any) => r.exam_id));
      const byExam = new Map(attempts.map((t: any) => [t.exam_id, t]));
      return rows.map((r: any) => {
        const t: any = byExam.get(r.exam_id);
        return {
          id: r.id as string,
          title: r.title as string,
          module: (r.modules?.name ?? null) as string | null,
          durationMinutes: (r.exams?.duration_minutes ?? null) as number | null,
          dueAt: r.due_at as string | null,
          attempt: t ? { score: Number(t.score ?? 0), maxScore: Number(t.max_score ?? 0) } : null,
        };
      });
    },

    async load(studentId: string, assessmentId: string) {
      const { sc, a } = await authorized(studentId, assessmentId);
      const exam: any = await repo.getExamWithQuestions(a.exam_id, false);
      if (!exam || exam.institution_id !== sc.institutionId) throw new ForbiddenError();
      return {
        id: a.id as string,
        title: a.title as string,
        duration_minutes: exam.duration_minutes as number,
        questions: (exam.questions ?? [])
          .map((q: any) => ({
            id: q.id as string,
            text: q.text as string,
            order_index: q.order_index as number,
            options: (q.options ?? []).map((o: any) => ({ id: o.id as string, text: o.text as string, order_index: o.order_index as number })),
          }))
          .sort((x: any, y: any) => x.order_index - y.order_index),
      };
    },

    async submit(studentId: string, assessmentId: string, answers: Record<string, string | null>) {
      const { sc, a } = await authorized(studentId, assessmentId);
      const exam: any = await repo.getExamWithQuestions(a.exam_id, true);
      if (!exam || exam.institution_id !== sc.institutionId) throw new ForbiddenError();
      if (await repo.findAttempt(studentId, exam.id)) throw new Error("لقد سلّمت هذا الاختبار مسبقًا.");
      const attemptId = await repo.createAttempt({ institution_id: sc.institutionId, exam_id: exam.id, student_id: studentId });
      const g = gradeQuiz(exam.questions ?? [], answers);
      await repo.saveAnswers(g.rows.map((r) => ({ ...r, institution_id: sc.institutionId, attempt_id: attemptId })));
      await repo.finishAttempt(attemptId, g.score, g.maxScore);
      const scaled = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * Number(a.max_score) * 100) / 100 : 0;
      await repo.recordResult({ institution_id: sc.institutionId, assessment_id: a.id, student_id: studentId, score: scaled });
      return { score: g.score, maxScore: g.maxScore };
    },
  };
}
