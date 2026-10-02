import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEMO_ACCOUNTS, DEMO_INSTITUTION_EMAIL, type DemoRoleKey } from "./demo.shared";

/**
 * Provisions (idempotently) the shared demo environment: one demo institution
 * with a demo institution admin, teacher and student. Credentials are public
 * on purpose — the demo institution holds no real data.
 */
export const startDemoSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ role: z.enum(["institution_admin", "teacher", "student"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Demo institution
    const { data: existingInst } = await supabaseAdmin
      .from("institutions")
      .select("id")
      .eq("email", DEMO_INSTITUTION_EMAIL)
      .maybeSingle();

    let institutionId = existingInst?.id ?? null;
    if (!institutionId) {
      const { data: inserted, error } = await supabaseAdmin
        .from("institutions")
        .insert({
          name: "مؤسسة Study DZ التجريبية",
          name_fr: "Etablissement Demo Study DZ",
          type: "مدرسة خاصة",
          wilaya: "الجزائر",
          commune: "بئر مراد رايس",
          phone: "000000000",
          email: DEMO_INSTITUTION_EMAIL,
          status: "active",
          is_trial: false,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error("تعذّر تجهيز المؤسسة التجريبية.");
      institutionId = inserted.id;
    }

    // 2. Demo class
    const { data: existingClass } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("name", "قسم تجريبي")
      .maybeSingle();

    let classId = existingClass?.id ?? null;
    if (!classId) {
      const { data: inserted } = await supabaseAdmin
        .from("classes")
        .insert({ institution_id: institutionId, name: "قسم تجريبي", stage: "متوسط" })
        .select("id")
        .single();
      classId = inserted?.id ?? null;
    }

    // 3. Demo users
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const users = list?.users ?? [];

    async function ensureUser(key: DemoRoleKey) {
      const account = DEMO_ACCOUNTS[key];
      let user = users.find((u) => (u.email ?? "").toLowerCase() === account.email);
      if (!user) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: { first_name: account.firstName, last_name: account.lastName },
        });
        if (error || !created.user) {
          console.error("demo createUser failed", error);
          throw new Error("تعذّر تجهيز الحساب التجريبي.");
        }
        user = created.user;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: account.password,
          email_confirm: true,
        });
      }

      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: account.email,
            first_name: account.firstName,
            last_name: account.lastName,
            institution_id: institutionId,
          },
          { onConflict: "id" },
        );

      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: key, institution_id: institutionId },
          { onConflict: "user_id,role" },
        );

      return user.id;
    }

    const adminId = await ensureUser("institution_admin");
    const teacherId = await ensureUser("teacher");
    const studentId = await ensureUser("student");
    void adminId;

    // 4. Demo subject + enrollment
    if (classId) {
      const { data: subject } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("class_id", classId)
        .eq("name", "الرياضيات")
        .maybeSingle();
      if (!subject) {
        await supabaseAdmin.from("subjects").insert({
          institution_id: institutionId,
          class_id: classId,
          name: "الرياضيات",
          teacher_id: teacherId,
        });
      }

      const { data: enrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .maybeSingle();
      if (!enrollment) {
        await supabaseAdmin.from("enrollments").insert({
          institution_id: institutionId,
          class_id: classId,
          student_id: studentId,
        });
      }
    }

    const account = DEMO_ACCOUNTS[data.role];
    return { ok: true as const, email: account.email, password: account.password };
  });
