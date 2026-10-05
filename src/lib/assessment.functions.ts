import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* Access layer: every decision is derived server-side from the real   */
/* relationship (role row + group membership + module assignment),     */
/* never from IDs sent by the browser.                                  */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_KINDS = [
  "quiz", "test", "exam", "continuous", "homework", "activity", "participation", "project", "oral", "practical",
] as const;

type Role = "platform_admin" | "institution_admin" | "teacher" | "student";
type Actor = {
  userId: string;
  role: Role;
  institutionId: string;
  groupIds: Set<string>;
  moduleIds: Set<string>;
  admin: any;
};

function forbid(msg = "غير مسموح: لا تملك صلاحية الوصول إلى هذا المورد."): never {
  try { setResponseStatus(403); } catch { /* no request context */ }
  throw new Error(`403 ${msg}`);
}

async function loadActor(userId: string): Promise<Actor> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const [{ data: roles }, { data: profile }] = await Promise.all([
    admin.from("user_roles").select("role, institution_id").eq("user_id", userId),
    admin.from("profiles").select("institution_id").eq("id", userId).maybeSingle(),
  ]);
  const order: Role[] = ["institution_admin", "teacher", "student"];
  const roleRow = order.map((r) => (roles ?? []).find((x: any) => x.role === r)).find(Boolean) as any;
  const institutionId = (roleRow?.institution_id ?? profile?.institution_id) as string | undefined;
  if (!roleRow || !institutionId || (profile?.institution_id && profile.institution_id !== institutionId)) forbid();
  const role = roleRow.role as Role;
  const groupIds = new Set<string>();
  const moduleIds = new Set<string>();

  if (role === "institution_admin") {
    const [{ data: g }, { data: m }] = await Promise.all([
      admin.from("groups").select("id").eq("institution_id", institutionId),
      admin.from("modules").select("id").eq("institution_id", institutionId),
    ]);
    (g ?? []).forEach((r: any) => groupIds.add(r.id));
    (m ?? []).forEach((r: any) => moduleIds.add(r.id));
  } else if (role === "teacher") {
    const { data: mods } = await admin.from("modules").select("id, level_id")
      .eq("institution_id", institutionId).eq("teacher_id", userId).eq("archived", false);
    (mods ?? []).forEach((r: any) => moduleIds.add(r.id));
    const levels = [...new Set((mods ?? []).map((r: any) => r.level_id).filter(Boolean))];
    if (levels.length) {
      const { data: g } = await admin.from("groups").select("id")
        .eq("institution_id", institutionId).in("level_id", levels);
      (g ?? []).forEach((r: any) => groupIds.add(r.id));
    }
  } else {
    const { data: gm } = await admin.from("group_memberships")
      .select("group_id, groups!inner(level_id, institution_id)")
      .eq("student_id", userId).eq("institution_id", institutionId);
    (gm ?? []).forEach((r: any) => groupIds.add(r.group_id));
    const levels = [...new Set((gm ?? []).map((r: any) => r.groups?.level_id).filter(Boolean))];
    if (levels.length) {
      const { data: m } = await admin.from("modules").select("id")
        .eq("institution_id", institutionId).in("level_id", levels);
      (m ?? []).forEach((r: any) => moduleIds.add(r.id));
    }
  }
  return { userId, role, institutionId, groupIds, moduleIds, admin };
}

const isStaff = (a: Actor) => a.role === "institution_admin" || a.role === "teacher";

async function loadAssessment(actor: Actor, id: string) {
  const { data } = await actor.admin.from("assessments").select("*").eq("id", id).maybeSingle();
  if (!data || data.institution_id !== actor.institutionId) forbid();
  return data;
}

function canManage(actor: Actor, a: any) {
  if (actor.role === "institution_admin") return true;
  if (actor.role !== "teacher") return false;
  return a.teacher_id === actor.userId || (a.module_id && actor.moduleIds.has(a.module_id));
}

function canStudentSee(actor: Actor, a: any) {
  return actor.role === "student" && a.published && a.group_id && actor.groupIds.has(a.group_id);
}

async function groupStudentIds(actor: Actor, groupId: string | null) {
  if (!groupId) return [] as string[];
  const { data } = await actor.admin.from("group_memberships").select("student_id").eq("group_id", groupId);
  return (data ?? []).map((r: any) => r.student_id as string);
}

/* ------------------------------ Scope ------------------------------ */

export const getTeachingScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await loadActor(context.userId);
    if (!isStaff(actor)) forbid();
    const [groups, modules] = await Promise.all([
      actor.groupIds.size
        ? actor.admin.from("groups").select("id, name, level_id, academic_levels(name)").in("id", [...actor.groupIds]).eq("archived", false).order("name")
        : { data: [] },
      actor.moduleIds.size
        ? actor.admin.from("modules").select("id, name, level_id").in("id", [...actor.moduleIds]).eq("archived", false).order("name")
        : { data: [] },
    ]);
    return {
      role: actor.role,
      groups: ((groups as any).data ?? []).map((g: any) => ({ id: g.id, name: g.name, levelId: g.level_id, levelName: g.academic_levels?.name ?? null })),
      modules: ((modules as any).data ?? []).map((m: any) => ({ id: m.id, name: m.name, levelId: m.level_id })),
    };
  });

/* --------------------------- Assessments --------------------------- */

const assessmentInput = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(ASSESSMENT_KINDS).default("exam"),
  groupId: z.string().uuid(),
  moduleId: z.string().uuid(),
  skillId: z.string().uuid().nullable().optional(),
  maxScore: z.number().min(1).max(1000).default(20),
  weight: z.number().min(0).max(10).default(1),
  heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dueAt: z.string().max(40).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
});

async function resolveLinks(actor: Actor, groupId: string, moduleId: string) {
  if (!actor.groupIds.has(groupId) || !actor.moduleIds.has(moduleId)) forbid();
  const [{ data: g }, { data: m }] = await Promise.all([
    actor.admin.from("groups").select("id, level_id, institution_id").eq("id", groupId).maybeSingle(),
    actor.admin.from("modules").select("id, level_id, specialization_id, institution_id").eq("id", moduleId).maybeSingle(),
  ]);
  if (!g || !m || g.institution_id !== actor.institutionId || m.institution_id !== actor.institutionId) forbid();
  if (g.level_id && m.level_id && g.level_id !== m.level_id) forbid("المادة لا تنتمي إلى مستوى هذه المجموعة.");
  const levelId = (m.level_id ?? g.level_id) as string | null;
  let specializationId = m.specialization_id as string | null;
  let programId: string | null = null;
  if (levelId) {
    const { data: lvl } = await actor.admin.from("academic_levels").select("specialization_id, program_id").eq("id", levelId).maybeSingle();
    specializationId = specializationId ?? lvl?.specialization_id ?? null;
    programId = lvl?.program_id ?? null;
  }
  if (!programId && specializationId) {
    const { data: sp } = await actor.admin.from("specializations").select("program_id").eq("id", specializationId).maybeSingle();
    programId = sp?.program_id ?? null;
  }
  return { levelId, specializationId, programId };
}

export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assessmentInput.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    if (!isStaff(actor)) forbid();
    const links = await resolveLinks(actor, data.groupId, data.moduleId);
    if (data.skillId) {
      const { data: sk } = await actor.admin.from("skills").select("module_id").eq("id", data.skillId).maybeSingle();
      if (!sk || sk.module_id !== data.moduleId) forbid();
    }
    const { data: row, error } = await actor.admin.from("assessments").insert({
      institution_id: actor.institutionId,
      group_id: data.groupId,
      module_id: data.moduleId,
      skill_id: data.skillId ?? null,
      level_id: links.levelId,
      specialization_id: links.specializationId,
      program_id: links.programId,
      teacher_id: context.userId,
      title: data.title,
      kind: data.kind,
      max_score: data.maxScore,
      weight: data.weight,
      held_on: data.heldOn ?? null,
      due_at: data.dueAt || null,
      description: data.description ?? null,
      published: false,
      results_published: false,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const updateAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(1).max(200).optional(),
      maxScore: z.number().min(1).max(1000).optional(),
      weight: z.number().min(0).max(10).optional(),
      heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      dueAt: z.string().max(40).nullable().optional(),
      description: z.string().trim().max(4000).nullable().optional(),
      published: z.boolean().optional(),
      resultsPublished: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    const a = await loadAssessment(actor, data.id);
    if (!canManage(actor, a)) forbid();
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.maxScore !== undefined) patch.max_score = data.maxScore;
    if (data.weight !== undefined) patch.weight = data.weight;
    if (data.heldOn !== undefined) patch.held_on = data.heldOn;
    if (data.dueAt !== undefined) patch.due_at = data.dueAt || null;
    if (data.description !== undefined) patch.description = data.description;
    if (data.published !== undefined) {
      patch.published = data.published;
      patch.published_at = data.published ? new Date().toISOString() : null;
      if (!data.published) patch.results_published = false;
    }
    if (data.resultsPublished !== undefined) {
      if (data.resultsPublished && !(data.published ?? a.published)) throw new Error("انشر التقييم أولًا قبل نشر النتائج.");
      patch.results_published = data.resultsPublished;
    }
    const { error } = await actor.admin.from("assessments").update(patch).eq("id", a.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      moduleId: z.string().uuid().optional(),
      groupId: z.string().uuid().optional(),
      kind: z.enum(ASSESSMENT_KINDS).optional(),
      search: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    if (data.groupId && !actor.groupIds.has(data.groupId)) forbid();
    if (data.moduleId && !actor.moduleIds.has(data.moduleId)) forbid();
    let q = actor.admin
      .from("assessments")
      .select("*, modules(name), groups(name)", { count: "exact" })
      .eq("institution_id", actor.institutionId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (actor.role === "teacher") {
      const mods = [...actor.moduleIds];
      q = mods.length ? q.or(`teacher_id.eq.${actor.userId},module_id.in.(${mods.join(",")})`) : q.eq("teacher_id", actor.userId);
    } else if (actor.role === "student") {
      const groups = [...actor.groupIds];
      if (!groups.length) return { items: [], total: 0 };
      q = q.eq("published", true).in("group_id", groups);
    }
    if (data.groupId) q = q.eq("group_id", data.groupId);
    if (data.moduleId) q = q.eq("module_id", data.moduleId);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.search) q = q.ilike("title", `%${data.search.replace(/[%_,()]/g, "")}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

/* ---------------------------- Gradebook ---------------------------- */

export const getGradebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ assessmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    const a = await loadAssessment(actor, data.assessmentId);
    if (!canManage(actor, a)) forbid();
    const ids = await groupStudentIds(actor, a.group_id);
    if (!ids.length) return { assessment: a, rows: [] };
    const [{ data: profiles }, { data: results }, { data: subs }] = await Promise.all([
      actor.admin.from("profiles").select("id, first_name, last_name").in("id", ids),
      actor.admin.from("results").select("student_id, score, note").eq("assessment_id", a.id),
      actor.admin.from("homework_submissions").select("student_id, content, file_url, submitted_at, feedback, graded_at").eq("assessment_id", a.id),
    ]);
    const rMap = new Map((results ?? []).map((r: any) => [r.student_id, r]));
    const sMap = new Map((subs ?? []).map((s: any) => [s.student_id, s]));
    const rows = (profiles ?? [])
      .map((p: any) => ({
        studentId: p.id as string,
        name: `${p.first_name} ${p.last_name}`.trim(),
        score: (rMap.get(p.id) as any)?.score ?? null,
        note: (rMap.get(p.id) as any)?.note ?? null,
        submission: sMap.get(p.id) ?? null,
      }))
      .sort((x: any, y: any) => x.name.localeCompare(y.name, "ar"));
    return { assessment: a, rows };
  });

export const bulkRecordResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      assessmentId: z.string().uuid(),
      entries: z.array(z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0).max(1000),
        note: z.string().trim().max(500).optional().nullable(),
      })).min(1).max(300),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    const a = await loadAssessment(actor, data.assessmentId);
    if (!canManage(actor, a)) forbid();
    const allowed = new Set(await groupStudentIds(actor, a.group_id));
    const outsider = data.entries.find((e) => !allowed.has(e.studentId));
    if (outsider) forbid("أحد الطلاب لا ينتمي إلى مجموعة هذا التقييم.");
    const max = Number(a.max_score);
    const invalid = data.entries.find((e) => e.score > max);
    if (invalid) throw new Error(`النتيجة ${invalid.score} تتجاوز العلامة القصوى (${max}).`);
    const now = new Date().toISOString();
    const rows = data.entries.map((e) => ({
      institution_id: actor.institutionId,
      assessment_id: a.id,
      student_id: e.studentId,
      score: e.score,
      note: e.note ?? null,
      recorded_by: context.userId,
    }));
    const { error } = await actor.admin.from("results").upsert(rows, { onConflict: "assessment_id,student_id" });
    if (error) throw new Error(error.message);
    if (a.kind === "homework") {
      await actor.admin.from("homework_submissions")
        .update({ graded_at: now, graded_by: context.userId })
        .eq("assessment_id", a.id).in("student_id", data.entries.map((e) => e.studentId));
    }
    return { saved: rows.length };
  });

export const gradeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      assessmentId: z.string().uuid(),
      studentId: z.string().uuid(),
      score: z.number().min(0).max(1000),
      feedback: z.string().trim().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    const a = await loadAssessment(actor, data.assessmentId);
    if (!canManage(actor, a) || a.kind !== "homework") forbid();
    const { data: sub } = await actor.admin.from("homework_submissions").select("id")
      .eq("assessment_id", a.id).eq("student_id", data.studentId).maybeSingle();
    if (!sub) forbid("لا يوجد تسليم لهذا الطالب.");
    if (data.score > Number(a.max_score)) throw new Error("العلامة تتجاوز العلامة القصوى.");
    const now = new Date().toISOString();
    await actor.admin.from("homework_submissions")
      .update({ feedback: data.feedback ?? null, graded_at: now, graded_by: context.userId }).eq("id", sub.id);
    const { error } = await actor.admin.from("results").upsert({
      institution_id: actor.institutionId, assessment_id: a.id, student_id: data.studentId,
      score: data.score, note: data.feedback ?? null, recorded_by: context.userId,
    }, { onConflict: "assessment_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* --------------------------- Results read -------------------------- */

export const getResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      assessmentId: z.string().uuid().optional(),
      studentId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(200),
      offset: z.number().int().min(0).default(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    let q = actor.admin
      .from("results")
      .select("id, student_id, score, note, created_at, assessment_id, assessments!inner(title, max_score, kind, held_on, published, results_published, group_id, module_id, teacher_id, institution_id, modules(name))", { count: "exact" })
      .eq("institution_id", actor.institutionId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (actor.role === "student") {
      if (data.studentId && data.studentId !== actor.userId) forbid("لا يمكنك الاطلاع على نتائج طالب آخر.");
      if (data.assessmentId) {
        const a = await loadAssessment(actor, data.assessmentId);
        if (!canStudentSee(actor, a)) forbid();
      }
      q = q.eq("student_id", actor.userId).eq("assessments.published", true).eq("assessments.results_published", true);
    } else if (actor.role === "teacher") {
      if (data.assessmentId) {
        const a = await loadAssessment(actor, data.assessmentId);
        if (!canManage(actor, a)) forbid();
      } else {
        const mods = [...actor.moduleIds];
        q = mods.length
          ? q.or(`teacher_id.eq.${actor.userId},module_id.in.(${mods.join(",")})`, { referencedTable: "assessments" })
          : q.eq("assessments.teacher_id", actor.userId);
      }
      if (data.studentId) {
        const { data: gm } = await actor.admin.from("group_memberships").select("group_id").eq("student_id", data.studentId);
        if (!(gm ?? []).some((r: any) => actor.groupIds.has(r.group_id))) forbid();
      }
    } else if (data.assessmentId) {
      await loadAssessment(actor, data.assessmentId);
    }
    if (data.assessmentId) q = q.eq("assessment_id", data.assessmentId);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

/* ------------------------- Student surfaces ------------------------ */

export const getMyLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await loadActor(context.userId);
    if (actor.role !== "student") forbid();
    const groups = [...actor.groupIds];
    const mods = [...actor.moduleIds];
    if (!groups.length) return { groups: [], modules: [], assessments: [], attendance: { absent: 0, late: 0, lateMinutes: 0 } };
    const [g, m, a, att] = await Promise.all([
      actor.admin.from("groups").select("id, name, academic_levels(name)").in("id", groups),
      mods.length ? actor.admin.from("modules").select("id, name, coefficient").in("id", mods).eq("archived", false).order("name") : { data: [] },
      actor.admin.from("assessments").select("id, title, kind, max_score, weight, held_on, due_at, description, results_published, group_id, module_id, modules(name)")
        .eq("published", true).in("group_id", groups).order("created_at", { ascending: false }).limit(200),
      actor.admin.from("attendance_records").select("status, minutes_late").eq("student_id", actor.userId).limit(2000),
    ]);
    const ids = ((a as any).data ?? []).map((x: any) => x.id);
    const [{ data: res }, { data: subs }] = ids.length
      ? await Promise.all([
          actor.admin.from("results").select("assessment_id, score, note").eq("student_id", actor.userId).in("assessment_id", ids),
          actor.admin.from("homework_submissions").select("assessment_id, submitted_at, feedback, graded_at").eq("student_id", actor.userId).in("assessment_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const rMap = new Map((res ?? []).map((r: any) => [r.assessment_id, r]));
    const sMap = new Map((subs ?? []).map((s: any) => [s.assessment_id, s]));
    const attRows = ((att as any).data ?? []) as any[];
    return {
      groups: ((g as any).data ?? []).map((x: any) => ({ id: x.id, name: x.name, level: x.academic_levels?.name ?? null })),
      modules: (m as any).data ?? [],
      assessments: ((a as any).data ?? []).map((x: any) => {
        const r: any = rMap.get(x.id);
        const s: any = sMap.get(x.id);
        return {
          ...x,
          result: x.results_published && r ? { score: r.score, note: r.note } : null,
          submission: s ? { submitted_at: s.submitted_at, graded: !!s.graded_at, feedback: x.results_published ? s.feedback : null } : null,
        };
      }),
      attendance: {
        absent: attRows.filter((r) => r.status === "absent").length,
        late: attRows.filter((r) => r.status === "late").length,
        lateMinutes: attRows.reduce((n, r) => n + (r.minutes_late ?? 0), 0),
      },
    };
  });

export const submitHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      assessmentId: z.string().uuid(),
      content: z.string().trim().max(10000).optional().nullable(),
      fileUrl: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    const a = await loadAssessment(actor, data.assessmentId);
    if (a.kind !== "homework" || !canStudentSee(actor, a)) forbid();
    if (!data.content && !data.fileUrl) throw new Error("أدخل نص الإجابة أو رابط الملف.");
    const { data: existing } = await actor.admin.from("homework_submissions").select("graded_at")
      .eq("assessment_id", a.id).eq("student_id", actor.userId).maybeSingle();
    if (existing?.graded_at) throw new Error("تم تصحيح هذا الواجب ولا يمكن تعديل التسليم.");
    const { error } = await actor.admin.from("homework_submissions").upsert({
      institution_id: actor.institutionId,
      assessment_id: a.id,
      student_id: actor.userId,
      content: data.content ?? null,
      file_url: data.fileUrl || null,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "assessment_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const, late: !!a.due_at && new Date(a.due_at) < new Date() };
  });

/** Student → Group → Modules → Attendance → Assessments → Results → Resources for one group. */
export const getGroupOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ groupId: z.string().uuid(), moduleId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await loadActor(context.userId);
    if (!actor.groupIds.has(data.groupId)) forbid();
    if (data.moduleId && !actor.moduleIds.has(data.moduleId)) forbid();
    const student = actor.role === "student";
    let aq = actor.admin.from("assessments").select("id, title, kind, max_score, published, results_published, module_id").eq("group_id", data.groupId);
    if (student) aq = aq.eq("published", true);
    if (data.moduleId) aq = aq.eq("module_id", data.moduleId);
    let lq = actor.admin.from("lessons").select("id, title, pdf_url, video_url, module_id").eq("group_id", data.groupId);
    if (student) lq = lq.eq("published", true);
    if (data.moduleId) lq = lq.eq("module_id", data.moduleId);
    let attq = actor.admin.from("attendance_records").select("student_id, status, minutes_late, session_date").eq("group_id", data.groupId).limit(1000);
    if (student) attq = attq.eq("student_id", actor.userId);
    const [{ data: assessments }, { data: lessons }, { data: attendance }] = await Promise.all([aq, lq, attq]);
    return { groupId: data.groupId, assessments: assessments ?? [], lessons: lessons ?? [], attendance: attendance ?? [] };
  });

/** Student-facing alias: published assessments/homework of the student's own groups only. */
export const listStudentAssessments = getMyLearning;
