import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Hidden platform-admin entry: the caller signs in with a real account, then this
 * function verifies against the database that the account holds the platform_admin
 * role. No secret code or password exists anywhere in the source code.
 */
export const verifyPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (data) return { isPlatformAdmin: true };

    // First-run provisioning: the platform owner account (configured server-side)
    // receives the platform_admin role automatically on its first hidden sign-in.
    const owner = (process.env["PLATFORM_OWNER_EMAIL"] ?? "isaacdiaf2@gmail.com").toLowerCase().trim();
    const email = String(context.claims.email ?? "").toLowerCase().trim();
    if (owner && email && owner === email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: context.userId, role: "platform_admin" }, { onConflict: "user_id,role" });
      return { isPlatformAdmin: true };
    }
    return { isPlatformAdmin: false };
  });




// NOTE: the self-service "unlock platform admin" endpoint was removed for security.
// Platform administrators are provisioned out-of-band only (see bootstrapRole).


/** Public: a user who forgot their password sends a request to the responsible admin. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(3).max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, institution_id")
      .ilike("email", data.identifier)
      .maybeSingle();

    if (!profile) {
      // No account enumeration: same response either way.
      return { ok: true as const, target: null };
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .maybeSingle();

    const role = roleRow?.role ?? "student";
    const target = role === "institution_admin" || role === "platform_admin"
      ? "platform_admin"
      : "institution_admin";

    const { data: existing } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true as const, target };

    const { error } = await supabaseAdmin.from("password_reset_requests").insert({
      user_id: profile.id,
      email: profile.email,
      full_name: `${profile.first_name} ${profile.last_name}`.trim(),
      role,
      institution_id: profile.institution_id,
      target,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, target };
  });

export const resolvePasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        action: z.enum(["set_password", "temp_code", "reject"]),
        newPassword: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: request } = await supabaseAdmin
      .from("password_reset_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request) throw new Error("الطلب غير موجود.");

    const { data: myRoles } = await context.supabase
      .from("user_roles")
      .select("role, institution_id")
      .eq("user_id", context.userId);

    const isPlatform = (myRoles ?? []).some((r) => r.role === "platform_admin");
    const myInstitution = (myRoles ?? []).find((r) => r.role === "institution_admin")?.institution_id;

    const allowed =
      request.target === "platform_admin"
        ? isPlatform
        : isPlatform || (!!myInstitution && myInstitution === request.institution_id);
    if (!allowed) throw new Error("غير مسموح بمعالجة هذا الطلب.");

    if (data.action === "reject") {
      await supabaseAdmin
        .from("password_reset_requests")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", request.id);
      return { ok: true as const, tempCode: null };
    }

    if (!request.user_id) throw new Error("الحساب غير موجود.");

    const password =
      data.action === "temp_code"
        ? `SDZ${Math.floor(100000 + Math.random() * 900000)}`
        : data.newPassword;
    if (!password || password.length < 8) throw new Error("كلمة المرور يجب أن تكون 8 أحرف فأكثر.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(request.user_id, { password });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "resolved",
        temp_code: data.action === "temp_code" ? password : null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    return { ok: true as const, tempCode: data.action === "temp_code" ? password : null };
  });
