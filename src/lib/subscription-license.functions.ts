import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * يُنفّذ انتهاء الاشتراك تلقائيًا — يُغيّر حالة كل مؤسسة نشطة تجاوز تاريخ
 * انتهاء اشتراكها إلى "expired". لا يحذف أي بيانات.
 * يُستدعى من server function (admin) أو يمكن جدولته كـ cron.
 */
export const runSubscriptionExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("غير مسموح: مدير المنصة فقط.");

    const { data, error } = await supabaseAdmin.rpc("expire_subscriptions");
    if (error) throw new Error(error.message);

    const expired = (data ?? []) as Array<{ institution_id: string; name: string; subscription_end: string }>;

    if (expired.length > 0) {
      for (const inst of expired) {
        await supabaseAdmin.from("audit_logs").insert({
          actor_id: context.userId,
          actor_role: "platform_admin",
          institution_id: inst.institution_id,
          action: "subscription.expired",
          resource: "institutions",
          resource_id: inst.institution_id,
          result: "success",
          metadata: { subscription_end: inst.subscription_end } as never,
        });
      }
    }

    return { expiredCount: expired.length, expired };
  });

/**
 * يتحقق من صحة ترخيص مؤسسة معينة.
 * التحقق يتم server-side فقط — لا يُكشف مفتاح الترخيص للـ frontend.
 */
export const verifyInstitutionLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ institutionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("institution_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile || profile.institution_id !== data.institutionId) {
      const { data: isAdmin } = await context.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "platform_admin")
        .maybeSingle();
      if (!isAdmin) throw new Error("غير مسموح.");
    }

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("license_key, status, deployment, starts_on, expires_on, installation_id")
      .eq("institution_id", data.institutionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!license) {
      return { valid: false as const, reason: "no_license" as const };
    }

    const { data: verifyResult, error } = await supabaseAdmin.rpc("verify_license", {
      _institution_id: data.institutionId,
      _license_key: license.license_key,
    });
    if (error) throw new Error(error.message);

    return {
      valid: (verifyResult as { valid: boolean }).valid,
      deployment: license.deployment,
      startsOn: license.starts_on,
      expiresOn: license.expires_on,
      installationId: license.installation_id,
      reason: (verifyResult as { reason?: string }).reason ?? null,
    };
  });
