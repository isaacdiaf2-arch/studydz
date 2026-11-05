import type { DbClient } from "@/server/db/adapter";

/** Raw data access for quiz assessments. No authorization decisions here. */
export function quizRepository(db: DbClient) {
  return {
    async studentScope(studentId: string) {
      const { data: profile } = await db.from("profiles").select("institution_id").eq("id", studentId).maybeSingle();
      const { data: roles } = await db.from("user_roles").select("role, institution_id").eq("user_id", studentId);
      const { data: gm } = await db
        .from("group_memberships")
        .select("group_id, groups!inner(level_id, institution_id)")
        .eq("student_id", studentId);
      return {
        institutionId: (profile?.institution_id ?? null) as string | null,
        isStudent: (roles ?? []).some((r: any) => r.role === "student" && r.institution_id === profile?.institution_id),
        memberships: (gm ?? []) as { group_id: string; groups: { level_id: string | null; institution_id: string } }[],
      };
    },
    async moduleIdsForLevels(institutionId: string, levelIds: string[]) {
      if (!levelIds.length) return [] as string[];
      const { data } = await db.from("modules").select("id").eq("institution_id", institutionId).in("level_id", levelIds);
      return (data ?? []).map((r: any) => r.id as string);
    },
    async listPublishedQuizzes(institutionId: string, groupIds: string[]) {
      if (!groupIds.length) return [];
      const { data, error } = await db
        .from("assessments")
        .select("id, title, max_score, group_id, module_id, exam_id, due_at, modules(name), exams(duration_minutes)")
        .eq("institution_id", institutionId)
        .eq("kind", "quiz")
        .eq("published", true)
        .not("exam_id", "is", null)
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error("تعذر تحميل الاختبارات.");
      return data ?? [];
    },
    async getAssessment(id: string) {
      const { data } = await db
        .from("assessments")
        .select("id, title, kind, published, institution_id, group_id, module_id, exam_id, max_score")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    async getExamWithQuestions(examId: string, withKey: boolean) {
      const opt = withKey ? "id, text, order_index, is_correct" : "id, text, order_index";
      const { data } = await db
        .from("exams")
        .select(`id, title, duration_minutes, institution_id, questions(id, text, points, order_index, options(${opt}))`)
        .eq("id", examId)
        .maybeSingle();
      return data;
    },
    async attemptsFor(studentId: string, examIds: string[]) {
      if (!examIds.length) return [];
      const { data } = await db.from("attempts").select("exam_id, score, max_score, submitted_at")
        .eq("student_id", studentId).in("exam_id", examIds);
      return data ?? [];
    },
    async findAttempt(studentId: string, examId: string) {
      const { data } = await db.from("attempts").select("id").eq("exam_id", examId).eq("student_id", studentId).maybeSingle();
      return data;
    },
    async createAttempt(row: { institution_id: string; exam_id: string; student_id: string }) {
      const { data, error } = await db.from("attempts").insert(row).select("id").single();
      if (error || !data) throw new Error("تعذر إنشاء المحاولة.");
      return data.id as string;
    },
    async saveAnswers(rows: unknown[]) {
      if (rows.length) await db.from("attempt_answers").insert(rows);
    },
    async finishAttempt(id: string, score: number, maxScore: number) {
      await db.from("attempts").update({ score, max_score: maxScore, submitted_at: new Date().toISOString() }).eq("id", id);
    },
    async recordResult(row: { institution_id: string; assessment_id: string; student_id: string; score: number }) {
      const { data: existing } = await db.from("results").select("id")
        .eq("assessment_id", row.assessment_id).eq("student_id", row.student_id).maybeSingle();
      if (existing) return;
      await db.from("results").insert({ ...row, note: "تصحيح آلي للاختبار الإلكتروني" });
    },
  };
}
