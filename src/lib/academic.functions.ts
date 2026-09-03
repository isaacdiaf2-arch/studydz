import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Dynamic academic structure:
 *   institution -> program -> specialization -> level -> group
 *                                            -> module -> skill -> assessment -> result
 *
 * The tenant (institution_id) is ALWAYS derived server-side from the caller's
 * institution_admin role row. It is never accepted from the client, so changing
 * a tenant id in the browser cannot cross institution boundaries. RLS enforces
 * the same rule a second time at the database level.
 */

type Ctx = { supabase: any; userId: string };

async function requireInstitutionAdmin(context: Ctx): Promise<string> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("institution_id")
    .eq("user_id", context.userId)
    .eq("role", "institution_admin")
    .maybeSingle();
  if (!data?.institution_id) {
    throw new Error("غير مسموح: هذه العملية مخصصة لمدير المؤسسة.");
  }
  return data.institution_id as string;
}

/** Verifies a referenced row belongs to the caller's institution (anti-IDOR). */
async function assertOwned(
  context: Ctx,
  table: string,
  id: string | null | undefined,
  institutionId: string,
) {
  if (!id) return;
  const { data } = await context.supabase
    .from(table)
    .select("institution_id")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.institution_id !== institutionId) {
    throw new Error("المورد المطلوب لا ينتمي إلى مؤسستك.");
  }
}

export const getAcademicStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const institutionId = role?.institution_id as string | undefined;
    if (!institutionId) {
      return { programs: [], specializations: [], levels: [], groups: [], modules: [], skills: [] };
    }

    const [programs, specializations, levels, groups, modules, skills] = await Promise.all([
      context.supabase.from("programs").select("*").order("created_at"),
      context.supabase.from("specializations").select("*").order("created_at"),
      context.supabase.from("academic_levels").select("*").order("order_index"),
      context.supabase.from("groups").select("*").order("created_at"),
      context.supabase.from("modules").select("*").order("created_at"),
      context.supabase.from("skills").select("*").order("created_at"),
    ]);

    return {
      programs: programs.data ?? [],
      specializations: specializations.data ?? [],
      levels: levels.data ?? [],
      groups: groups.data ?? [],
      modules: modules.data ?? [],
      skills: skills.data ?? [],
    };
  });

export const createProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().max(40).optional().nullable(),
        kind: z.enum(["program", "branch", "stream", "track", "language"]).default("program"),
        description: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    const { data: row, error } = await context.supabase
      .from("programs")
      .insert({ ...data, institution_id: institutionId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const createSpecialization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        programId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().max(40).optional().nullable(),
        kind: z.enum(["specialization", "language"]).default("specialization"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    await assertOwned(context as Ctx, "programs", data.programId, institutionId);
    const { data: row, error } = await context.supabase
      .from("specializations")
      .insert({
        institution_id: institutionId,
        program_id: data.programId ?? null,
        name: data.name,
        code: data.code ?? null,
        kind: data.kind,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const createLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        specializationId: z.string().uuid().nullable().optional(),
        programId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(120),
        orderIndex: z.number().int().min(1).max(99).default(1),
        durationMonths: z.number().int().min(1).max(120).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    await assertOwned(context as Ctx, "specializations", data.specializationId, institutionId);
    await assertOwned(context as Ctx, "programs", data.programId, institutionId);
    const { data: row, error } = await context.supabase
      .from("academic_levels")
      .insert({
        institution_id: institutionId,
        specialization_id: data.specializationId ?? null,
        program_id: data.programId ?? null,
        name: data.name,
        order_index: data.orderIndex,
        duration_months: data.durationMonths ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        levelId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(120),
        capacity: z.number().int().min(1).max(1000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    await assertOwned(context as Ctx, "academic_levels", data.levelId, institutionId);
    const { data: row, error } = await context.supabase
      .from("groups")
      .insert({
        institution_id: institutionId,
        level_id: data.levelId ?? null,
        name: data.name,
        capacity: data.capacity ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const createModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        levelId: z.string().uuid().nullable().optional(),
        specializationId: z.string().uuid().nullable().optional(),
        teacherId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(120),
        code: z.string().trim().max(40).nullable().optional(),
        coefficient: z.number().min(0.5).max(10).default(1),
        hours: z.number().int().min(1).max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    await assertOwned(context as Ctx, "academic_levels", data.levelId, institutionId);
    await assertOwned(context as Ctx, "specializations", data.specializationId, institutionId);
    if (data.teacherId) {
      const { data: teacher } = await context.supabase
        .from("profiles")
        .select("institution_id")
        .eq("id", data.teacherId)
        .maybeSingle();
      if (!teacher || teacher.institution_id !== institutionId) {
        throw new Error("الأستاذ المحدد لا ينتمي إلى مؤسستك.");
      }
    }
    const { data: row, error } = await context.supabase
      .from("modules")
      .insert({
        institution_id: institutionId,
        level_id: data.levelId ?? null,
        specialization_id: data.specializationId ?? null,
        teacher_id: data.teacherId ?? null,
        name: data.name,
        code: data.code ?? null,
        coefficient: data.coefficient,
        hours: data.hours ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const createSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        weight: z.number().min(0.5).max(10).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    await assertOwned(context as Ctx, "modules", data.moduleId, institutionId);
    const { data: row, error } = await context.supabase
      .from("skills")
      .insert({
        institution_id: institutionId,
        module_id: data.moduleId,
        name: data.name,
        weight: data.weight,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const TABLES = {
  program: "programs",
  specialization: "specializations",
  level: "academic_levels",
  group: "groups",
  module: "modules",
  skill: "skills",
} as const;

export const deleteAcademicNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["program", "specialization", "level", "group", "module", "skill"]),
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const institutionId = await requireInstitutionAdmin(context as Ctx);
    const table = TABLES[data.kind];
    await assertOwned(context as Ctx, table, data.id, institutionId);
    const { error } = await context.supabase
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("institution_id", institutionId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
