import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORM_OWNER_EMAIL = "isaacdiaf2@gmail.com";

const institutionSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  wilaya: z.string().min(1),
  commune: z.string().min(1),
  address: z.string().optional().default(""),
  phone: z.string().min(6),
  email: z.string().email(),
  managerPhone: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const registerInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => institutionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("institution_id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile?.institution_id) {
      throw new Error("لا يمكن فتح أكثر من حساب مؤسسة واحد لنفس المستخدم.");
    }

    const { data: phoneTaken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.managerPhone)
      .neq("id", userId)
      .maybeSingle();
    if (phoneTaken) throw new Error("رقم الهاتف مستعمل في حساب آخر.");

    const { data: institution, error: instError } = await supabaseAdmin
      .from("institutions")
      .insert({
        name: data.name,
        type: data.type,
        wilaya: data.wilaya,
        commune: data.commune,
        address: data.address,
        phone: data.phone,
        email: data.email,
        owner_id: userId,
        status: "pending",
      })
      .select("id")
      .single();
    if (instError) throw new Error(instError.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        institution_id: institution.id,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.managerPhone,
      })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "institution_admin", institution_id: institution.id },
        { onConflict: "user_id,role" },
      );

    await supabaseAdmin.from("contracts").insert({
      institution_id: institution.id,
      body: "عقد اشتراك سنوي بين إدارة منصة Study DZ ومدير المؤسسة، مدته سنة كاملة بمبلغ 8,000 دج، يُجدَّد بعد الدفع والمراجعة.",
    });

    return { institutionId: institution.id };
  });

export const bootstrapRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = String(context.claims.email ?? "").toLowerCase();
    if (email !== PLATFORM_OWNER_EMAIL) return { role: null };
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "platform_admin" }, { onConflict: "user_id,role" });
    return { role: "platform_admin" as const };
  });

const memberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  role: z.enum(["teacher", "student"]),
  classId: z.string().uuid().optional().nullable(),
});

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role, institution_id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!adminRole?.institution_id) throw new Error("غير مسموح: هذه العملية لمدير المؤسسة فقط.");
    const institutionId = adminRole.institution_id;

    const { data: emailTaken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (emailTaken) throw new Error("البريد الإلكتروني مستعمل مسبقًا.");

    const { data: phoneTaken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (phoneTaken) throw new Error("رقم الهاتف مستعمل مسبقًا.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.firstName, last_name: data.lastName, phone: data.phone },
    });
    if (error || !created.user) throw new Error(error?.message ?? "تعذر إنشاء الحساب.");

    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      institution_id: institutionId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
    });

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: created.user.id, role: data.role, institution_id: institutionId },
        { onConflict: "user_id,role" },
      );

    if (data.role === "student" && data.classId) {
      await supabaseAdmin.from("enrollments").upsert(
        {
          institution_id: institutionId,
          student_id: created.user.id,
          class_id: data.classId,
        },
        { onConflict: "student_id,class_id" },
      );
    }

    return { userId: created.user.id };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!adminRole?.institution_id) throw new Error("غير مسموح.");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("institution_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.institution_id !== adminRole.institution_id) throw new Error("غير مسموح.");

    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

export const transferStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ studentId: z.string().uuid(), targetInstitutionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!adminRole?.institution_id) throw new Error("غير مسموح.");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("institution_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (target?.institution_id !== adminRole.institution_id) throw new Error("غير مسموح.");

    await supabaseAdmin.from("enrollments").delete().eq("student_id", data.studentId);
    await supabaseAdmin
      .from("profiles")
      .update({ institution_id: data.targetInstitutionId })
      .eq("id", data.studentId);
    await supabaseAdmin
      .from("user_roles")
      .update({ institution_id: data.targetInstitutionId })
      .eq("user_id", data.studentId);
    return { ok: true };
  });

const supportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  institutionName: z.string().optional().default(""),
  wilaya: z.string().optional().default(""),
  commune: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().min(6),
  email: z.string().email(),
  message: z.string().optional().default(""),
});

export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => supportSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("support_messages").insert({
      first_name: data.firstName,
      last_name: data.lastName,
      institution_name: data.institutionName,
      wilaya: data.wilaya,
      commune: data.commune,
      address: data.address,
      phone: data.phone,
      email: data.email,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        decision: z.enum(["accepted", "rejected", "suspended"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("غير مسموح: مدير المنصة فقط.");

    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const expiresAt = expires.toISOString().slice(0, 10);

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .update({
        status: data.decision,
        reviewed_at: new Date().toISOString(),
        expires_at: data.decision === "accepted" ? expiresAt : null,
      })
      .eq("id", data.paymentId)
      .select("institution_id")
      .single();
    if (error) throw new Error(error.message);

    if (data.decision === "accepted") {
      await supabaseAdmin
        .from("institutions")
        .update({ status: "active", subscription_end: expiresAt })
        .eq("id", payment.institution_id);
    } else if (data.decision === "suspended") {
      await supabaseAdmin
        .from("institutions")
        .update({ status: "suspended" })
        .eq("id", payment.institution_id);
    }
    return { ok: true };
  });

export const setInstitutionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        status: z.enum(["pending", "active", "suspended", "expired"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("غير مسموح: مدير المنصة فقط.");

    const { error } = await supabaseAdmin
      .from("institutions")
      .update({ status: data.status })
      .eq("id", data.institutionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
