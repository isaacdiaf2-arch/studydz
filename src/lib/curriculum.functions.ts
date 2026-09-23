import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CURRICULUM, findBranch } from "@/lib/curriculum.shared";

/**
 * استيراد بنك المواد الجزائري إلى مؤسسة.
 * يُنشئ برنامجًا (program) للطور، وتخصصًا (specialization) للشعبة،
 * ومستوى (academic_level)، ثم يُضيف كل المواد كوحدات (modules) مع معاملاتها.
 * كل ذلك مرتبط بمؤسسة المستخدم فقط (مع عزل RLS).
 */
export const importCurriculum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        stageKey: z.string().min(1),
        branchKey: z.string().min(1),
        levelName: z.string().trim().min(1).max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const stage = CURRICULUM.find((s) => s.key === data.stageKey);
    if (!stage) throw new Error("الطور المحدد غير موجود في بنك المواد.");
    const branch = findBranch(data.stageKey, data.branchKey);
    if (!branch) throw new Error("الشعبة المحددة غير موجودة في بنك المواد.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify caller is institution admin
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!role?.institution_id) {
      throw new Error("غير مسموح: هذه العملية مخصصة لمدير المؤسسة.");
    }
    const institutionId = role.institution_id as string;

    // 2. Create or reuse program for this stage
    const { data: existingProgram } = await context.supabase
      .from("programs")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("name", stage.label)
      .maybeSingle();

    let programId: string;
    if (existingProgram) {
      programId = existingProgram.id;
    } else {
      const { data: newProgram, error: progErr } = await context.supabase
        .from("programs")
        .insert({
          institution_id: institutionId,
          name: stage.label,
          kind: "program",
        })
        .select("id")
        .single();
      if (progErr || !newProgram) throw new Error(progErr?.message ?? "تعذّر إنشاء البرنامج.");
      programId = newProgram.id;
    }

    // 3. Create or reuse specialization for this branch
    const { data: existingSpec } = await context.supabase
      .from("specializations")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("program_id", programId)
      .eq("name", branch.label)
      .maybeSingle();

    let specializationId: string;
    if (existingSpec) {
      specializationId = existingSpec.id;
    } else {
      const { data: newSpec, error: specErr } = await context.supabase
        .from("specializations")
        .insert({
          institution_id: institutionId,
          program_id: programId,
          name: branch.label,
          kind: "specialization",
        })
        .select("id")
        .single();
      if (specErr || !newSpec) throw new Error(specErr?.message ?? "تعذّر إنشاء التخصص.");
      specializationId = newSpec.id;
    }

    // 4. Create or reuse academic level
    const levelName = data.levelName?.trim() || stage.label;
    const { data: existingLevel } = await context.supabase
      .from("academic_levels")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("specialization_id", specializationId)
      .eq("name", levelName)
      .maybeSingle();

    let levelId: string;
    if (existingLevel) {
      levelId = existingLevel.id;
    } else {
      const { data: newLevel, error: levelErr } = await context.supabase
        .from("academic_levels")
        .insert({
          institution_id: institutionId,
          specialization_id: specializationId,
          program_id: programId,
          name: levelName,
          order_index: 1,
        })
        .select("id")
        .single();
      if (levelErr || !newLevel) throw new Error(levelErr?.message ?? "تعذّر إنشاء المستوى.");
      levelId = newLevel.id;
    }

    // 5. Insert modules (skip duplicates by name + level)
    const { data: existingModules } = await context.supabase
      .from("modules")
      .select("name")
      .eq("institution_id", institutionId)
      .eq("level_id", levelId);

    const existingNames = new Set((existingModules ?? []).map((m: { name: string }) => m.name));
    const toInsert = branch.subjects
      .filter((s) => !existingNames.has(s.name))
      .map((s) => ({
        institution_id: institutionId,
        level_id: levelId,
        specialization_id: specializationId,
        name: s.name,
        coefficient: s.coefficient,
        hours: s.hours ?? null,
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const { data: created, error: modErr } = await context.supabase
        .from("modules")
        .insert(toInsert)
        .select("id");
      if (modErr) throw new Error(modErr.message);
      inserted = (created ?? []).length;
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "institution_admin",
      institution_id: institutionId,
      action: "curriculum.import",
      resource: "modules",
      result: "success",
      metadata: {
        stage: data.stageKey,
        branch: data.branchKey,
        inserted,
        skipped: branch.subjects.length - toInsert.length,
      } as never,
    });

    return {
      ok: true as const,
      programId,
      specializationId,
      levelId,
      inserted,
      skipped: branch.subjects.length - toInsert.length,
    };
  });
