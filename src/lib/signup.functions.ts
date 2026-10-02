import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { institutionSignupSchema } from "@/lib/signup.shared";

/** تسجيل مؤسسة جديدة + إنشاء حساب مديرها (عمومي). */
export const registerInstitutionAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => institutionSignupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const managerEmail = data.managerEmail.toLowerCase();

    const { data: emailTaken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", managerEmail)
      .maybeSingle();
    if (emailTaken) throw new Error("البريد الإلكتروني مستعمل مسبقًا في المنصة.");

    const { data: phoneTaken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.managerPhone)
      .maybeSingle();
    if (phoneTaken) throw new Error("رقم الهاتف مستعمل مسبقًا في المنصة.");

    const { data: instTaken } = await supabaseAdmin
      .from("institutions")
      .select("id")
      .or(`email.eq.${data.email.toLowerCase()},phone.eq.${data.phone}`)
      .maybeSingle();
    if (instTaken) throw new Error("بريد أو هاتف المؤسسة مسجّل مسبقًا.");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: managerEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.managerPhone,
      },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "تعذّر إنشاء الحساب.");
    }
    const userId = created.user.id;

    const { data: institution, error: instError } = await supabaseAdmin
      .from("institutions")
      .insert({
        name: data.name,
        name_fr: data.nameFr,
        type: data.type,
        wilaya: data.wilaya,
        commune: data.commune,
        daira: data.daira,
        address: data.address,
        maps_url: data.mapsUrl,
        phone: data.phone,
        email: data.email.toLowerCase(),
        website: data.website,
        facebook_url: data.facebookUrl,
        instagram_url: data.instagramUrl,
        accreditation_number: data.accreditationNumber,
        accreditation_authority: data.accreditationAuthority,
        commercial_register: data.commercialRegister,
        founded_on: data.foundedOn,
        owner_id: userId,
        status: "pending",
      })
      .select("id")
      .single();
    if (instError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(instError.message);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: managerEmail,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.managerPhone,
        institution_id: institution.id,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "institution_admin", institution_id: institution.id },
      { onConflict: "user_id,role" },
    );
    if (roleError) throw new Error(roleError.message);

    await supabaseAdmin.from("contracts").insert({
      institution_id: institution.id,
      body:
        "عقد اشتراك سنوي بين إدارة منصة Study DZ ومدير المؤسسة، مدته سنة كاملة بمبلغ 9,000 دج، يُجدَّد بعد الدفع والمراجعة.",
    });

    return { institutionId: institution.id };
  });

/** حفظ روابط الشعار وصورة الغلاف بعد رفعها من طرف مدير المؤسسة. */
export const saveInstitutionMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        logoUrl: z.string().max(2000).optional().nullable(),
        coverUrl: z.string().max(2000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!role?.institution_id) throw new Error("غير مسموح: هذه العملية لمدير المؤسسة فقط.");

    const patch: { logo_url?: string; cover_url?: string } = {};
    if (data.logoUrl) patch.logo_url = data.logoUrl;
    if (data.coverUrl) patch.cover_url = data.coverUrl;
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await context.supabase
      .from("institutions")
      .update(patch)
      .eq("id", role.institution_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
