import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function requireStaff(context: Ctx): Promise<{ institutionId: string; role: string }> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("institution_id, role")
    .eq("user_id", context.userId)
    .in("role", ["institution_admin", "teacher"]);
  const row = (data ?? []).find((r: any) => r.institution_id);
  if (!row?.institution_id) throw new Error("غير مسموح: هذه العملية مخصصة للأستاذ أو مدير المؤسسة.");
  return { institutionId: row.institution_id as string, role: row.role as string };
}

async function assertOwned(context: Ctx, table: string, id: string | null | undefined, institutionId: string) {
  if (!id) return;
  const { data } = await context.supabase.from(table).select("institution_id").eq("id", id).maybeSingle();
  if (!data || data.institution_id !== institutionId) throw new Error("المورد المطلوب لا ينتمي إلى مؤسستك.");
}

export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      moduleId: z.string().uuid().nullable().optional(),
      groupId: z.string().uuid().nullable().optional(),
      skillId: z.string().uuid().nullable().optional(),
      teacherId: z.string().uuid().nullable().optional(),
      title: z.string().trim().min(1).max(200),
      kind: z.enum(["exam", "quiz", "homework", "project", "oral", "practical"]).default("exam"),
      maxScore: z.number().min(1).max(1000).default(20),
      weight: z.number().min(0).max(10).default(1),
      heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    await assertOwned(context as Ctx, "modules", data.moduleId, institutionId);
    await assertOwned(context as Ctx, "groups", data.groupId, institutionId);
    await assertOwned(context as Ctx, "skills", data.skillId, institutionId);
    const { data: row, error } = await context.supabase
      .from("assessments")
      .insert({
        institution_id: institutionId,
        module_id: data.moduleId ?? null,
        group_id: data.groupId ?? null,
        skill_id: data.skillId ?? null,
        teacher_id: data.teacherId ?? context.userId,
        title: data.title,
        kind: data.kind,
        max_score: data.maxScore,
        weight: data.weight,
        held_on: data.heldOn ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      moduleId: z.string().uuid().optional(),
      groupId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const institutionId = role?.institution_id as string | undefined;
    if (!institutionId) return { items: [], total: 0 };
    let q = context.supabase
      .from("assessments")
      .select("*, modules(name), groups(name), skills(name)", { count: "exact" })
      .eq("institution_id", institutionId)
      .order("held_on", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.moduleId) q = q.eq("module_id", data.moduleId);
    if (data.groupId) q = q.eq("group_id", data.groupId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

export const recordResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      assessmentId: z.string().uuid(),
      studentId: z.string().uuid(),
      score: z.number().min(0).max(1000),
      note: z.string().trim().max(500).optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    await assertOwned(context as Ctx, "assessments", data.assessmentId, institutionId);
    const { data: student } = await context.supabase
      .from("profiles")
      .select("institution_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (!student || student.institution_id !== institutionId) throw new Error("الطالب لا ينتمي إلى مؤسستك.");
    const { error } = await context.supabase
      .from("results")
      .upsert({
        institution_id: institutionId,
        assessment_id: data.assessmentId,
        student_id: data.studentId,
        score: data.score,
        note: data.note ?? null,
        recorded_by: context.userId,
      }, { onConflict: "assessment_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const bulkRecordResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      assessmentId: z.string().uuid(),
      entries: z.array(z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0).max(1000),
        note: z.string().trim().max(500).optional().nullable(),
      })).min(1).max(300),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    await assertOwned(context as Ctx, "assessments", data.assessmentId, institutionId);
    const { data: assessment } = await context.supabase
      .from("assessments")
      .select("max_score")
      .eq("id", data.assessmentId)
      .maybeSingle();
    const maxScore = assessment?.max_score ?? 100;
    const invalid = data.entries.find((e) => e.score > maxScore);
    if (invalid) throw new Error(`النتيجة ${invalid.score} تتجاوز العلامة القصوى (${maxScore}).`);
    const rows = data.entries.map((e) => ({
      institution_id: institutionId,
      assessment_id: data.assessmentId,
      student_id: e.studentId,
      score: e.score,
      note: e.note ?? null,
      recorded_by: context.userId,
    }));
    const { error } = await context.supabase
      .from("results")
      .upsert(rows, { onConflict: "assessment_id,student_id" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };
  });

export const getResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      assessmentId: z.string().uuid().optional(),
      studentId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(200),
      offset: z.number().int().min(0).default(0),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id, role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const institutionId = role?.institution_id as string | undefined;
    if (!institutionId) return { items: [], total: 0 };
    let q = context.supabase
      .from("results")
      .select("*, assessments(title, max_score, kind, held_on), profiles!results_student_id_fkey(first_name, last_name)", { count: "exact" })
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.assessmentId) q = q.eq("assessment_id", data.assessmentId);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });
