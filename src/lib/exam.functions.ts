import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const examIdSchema = z.object({ examId: z.string().uuid() });

const submitSchema = z.object({
  examId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.string().uuid().nullable()),
});

async function loadStudentContext(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("institution_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.institution_id) throw new Error("غير مسموح.");
  const { data: gm } = await supabaseAdmin
    .from("group_memberships")
    .select("group_id")
    .eq("student_id", userId);
  const groupIds = new Set((gm ?? []).map((r) => r.group_id as string));
  return { supabaseAdmin, institutionId: profile.institution_id, groupIds };
}

function denyOutOfScope(exam: { group_id: string | null }, groupIds: Set<string>) {
  if (exam.group_id && !groupIds.has(exam.group_id)) {
    try { setResponseStatus(403); } catch { /* no request context */ }
    throw new Error("403 غير مسموح: هذا الاختبار ليس لفوجك.");
  }
}

/** Published interactive quizzes visible to the student (own institution, own groups). */
export const listStudentExams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, institutionId, groupIds } = await loadStudentContext(context.userId);
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select("id, title, duration_minutes, group_id, modules(name), subjects(name)")
      .eq("institution_id", institutionId)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("تعذر تحميل الاختبارات.");
    return (data ?? []).filter((e) => !e.group_id || groupIds.has(e.group_id));
  });

/** Returns exam questions/options WITHOUT the answer key. */
export const getExamForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => examIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, institutionId, groupIds } = await loadStudentContext(context.userId);

    const { data: exam, error } = await supabaseAdmin
      .from("exams")
      .select(
        "id, title, duration_minutes, institution_id, published, group_id, questions(id, text, points, order_index, options(id, text, order_index))",
      )
      .eq("id", data.examId)
      .maybeSingle();
    if (error) throw new Error("تعذر تحميل الاختبار.");
    if (!exam || exam.institution_id !== institutionId || !exam.published) {
      throw new Error("الاختبار غير متاح.");
    }
    denyOutOfScope(exam, groupIds);

    return {
      id: exam.id,
      title: exam.title,
      duration_minutes: exam.duration_minutes,
      questions: (exam.questions ?? [])
        .map((q) => ({
          id: q.id,
          text: q.text,
          points: Number(q.points),
          order_index: q.order_index,
          options: (q.options ?? [])
            .map((o) => ({ id: o.id, text: o.text, order_index: o.order_index }))
            .sort((a, b) => a.order_index - b.order_index),
        }))
        .sort((a, b) => a.order_index - b.order_index),
    };
  });

/** Grades the exam server-side; students never see or set the answer key. */
export const submitExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, institutionId, groupIds } = await loadStudentContext(context.userId);
    const studentId = context.userId;

    const { data: exam } = await supabaseAdmin
      .from("exams")
      .select("id, institution_id, published, group_id, questions(id, points, options(id, is_correct))")
      .eq("id", data.examId)
      .maybeSingle();
    if (!exam || exam.institution_id !== institutionId || !exam.published) {
      throw new Error("الاختبار غير متاح.");
    }
    denyOutOfScope(exam, groupIds);

    const { data: existing } = await supabaseAdmin
      .from("attempts")
      .select("id")
      .eq("exam_id", exam.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) throw new Error("لقد سلّمت هذا الاختبار مسبقًا.");

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert({ institution_id: institutionId, exam_id: exam.id, student_id: studentId })
      .select("id")
      .single();
    if (attemptError || !attempt) throw new Error("تعذر إنشاء المحاولة.");

    let score = 0;
    let maxScore = 0;
    const rows = (exam.questions ?? []).map((q) => {
      const points = Number(q.points);
      maxScore += points;
      const chosen = data.answers[q.id] ?? null;
      const correctId = (q.options ?? []).find((o) => o.is_correct)?.id ?? null;
      const isCorrect = !!chosen && chosen === correctId;
      if (isCorrect) score += points;
      return {
        institution_id: institutionId,
        attempt_id: attempt.id,
        question_id: q.id,
        option_id: chosen,
        is_correct: isCorrect,
        awarded: isCorrect ? points : 0,
      };
    });

    if (rows.length > 0) {
      await supabaseAdmin.from("attempt_answers").insert(rows);
    }
    await supabaseAdmin
      .from("attempts")
      .update({ submitted_at: new Date().toISOString(), score, max_score: maxScore })
      .eq("id", attempt.id);

    return { score, maxScore };
  });
