import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LICENSE_AMOUNT = 9000;

/** Current Study DZ server release served to on-premise installations. */
export const SERVER_VERSION = "1.3.0";

async function requirePlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!data) throw new Error("غير مسموح: مدير المنصة فقط.");
}

/** Cryptographically secure license key (no predictable Math.random). */
function generateKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  const block = (i: number) => chars.slice(i * 5, i * 5 + 5).join("");
  return `SDZ-${block(0)}-${block(1)}-${block(2)}`;
}

/** Platform admin: list every license with its institution. */
export const listLicenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("licenses")
      .select("*, institutions(name, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Institution manager: the license of their own institution only. */
export const getMyLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("licenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

export const issueLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        deployment: z.enum(["cloud", "local", "hybrid"]).default("cloud"),
        installationId: z.string().trim().max(120).optional().nullable(),
        months: z.number().int().min(1).max(60).default(12),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: institution } = await supabaseAdmin
      .from("institutions")
      .select("id")
      .eq("id", data.institutionId)
      .maybeSingle();
    if (!institution) throw new Error("المؤسسة غير موجودة.");

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.months);

    const { data: row, error } = await supabaseAdmin
      .from("licenses")
      .insert({
        institution_id: data.institutionId,
        license_key: generateKey(),
        installation_id: data.installationId ?? null,
        deployment: data.deployment,
        status: "active",
        amount: LICENSE_AMOUNT,
        starts_on: start.toISOString().slice(0, 10),
        expires_on: end.toISOString().slice(0, 10),
      })
      .select("id, license_key")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "platform_admin",
      institution_id: data.institutionId,
      action: "license.issue",
      resource: "licenses",
      resource_id: row.id,
      result: "success",
      metadata: { deployment: data.deployment, months: data.months },
    });

    return { id: row.id as string, licenseKey: row.license_key as string };
  });

export const setLicenseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        licenseId: z.string().uuid(),
        status: z.enum(["pending", "active", "suspended", "revoked", "expired"]),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("licenses")
      .update({
        status: data.status,
        note: data.note ?? null,
        revoked_at: data.status === "revoked" ? new Date().toISOString() : null,
      })
      .eq("id", data.licenseId)
      .select("institution_id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "platform_admin",
      institution_id: row.institution_id,
      action: `license.${data.status}`,
      resource: "licenses",
      resource_id: data.licenseId,
      result: "success",
      metadata: {},
    });
    return { ok: true as const };
  });

/** Renew an existing license by extending its expiry (manual, after CCP review). */
export const renewLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ licenseId: z.string().uuid(), months: z.number().int().min(1).max(60).default(12) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current } = await supabaseAdmin
      .from("licenses")
      .select("expires_on, institution_id")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!current) throw new Error("الترخيص غير موجود.");

    const base = current.expires_on && new Date(current.expires_on) > new Date()
      ? new Date(current.expires_on)
      : new Date();
    base.setMonth(base.getMonth() + data.months);

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ status: "active", expires_on: base.toISOString().slice(0, 10), revoked_at: null })
      .eq("id", data.licenseId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "platform_admin",
      institution_id: current.institution_id,
      action: "license.renew",
      resource: "licenses",
      resource_id: data.licenseId,
      result: "success",
      metadata: { months: data.months },
    });
    return { ok: true as const, expiresOn: base.toISOString().slice(0, 10) };
  });

/** Installation / on-premise info for the caller's own institution. */
export const getInstallationInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institution_id, role")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    const institutionId = role?.institution_id as string | undefined;
    if (!institutionId) return null;

    const [{ data: institution }, { data: license }] = await Promise.all([
      context.supabase.from("institutions").select("id, name, status, subscription_end").eq("id", institutionId).maybeSingle(),
      context.supabase
        .from("licenses")
        .select("*")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const active =
      !!license &&
      license.status === "active" &&
      (!license.expires_on || new Date(license.expires_on) >= new Date());

    return {
      institution: institution ?? null,
      license: license ?? null,
      active,
      release: {
        version: SERVER_VERSION,
        channel: "stable" as const,
        platforms: ["Windows Server 2019+ / Windows 10+", "Linux (مخطط له)"],
        requirements: [
          "معالج 2 نواة وذاكرة 4 غيغابايت على الأقل",
          "مساحة تخزين 10 غيغابايت",
          "PostgreSQL 15 أو أحدث (محلي)",
          "شبكة داخلية للمؤسسة",
        ],
      },
    };
  });
