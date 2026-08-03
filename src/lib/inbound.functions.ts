import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  trialRequestSchema,
  supportMessageSchema,
  type TrialRequestInput,
  type SupportMessageInput,
} from "@/lib/inbound.shared";

/** طلب تجربة مجانية — نقطة عمومية */
export const submitTrialRequest = createServerFn({ method: "POST" })
  .inputValidator((data: TrialRequestInput) => trialRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyInbound } = await import("@/lib/inbound.server");

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("trial_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return { ok: false as const, message: "تم إرسال عدة طلبات مؤخرًا، حاول لاحقًا." };
    }

    const { error } = await supabaseAdmin.from("trial_requests").insert({
      institution_name: data.institutionName,
      email: data.email,
      phone: data.phone,
      motivation: data.motivation,
    });
    if (error) throw new Error(error.message);

    const delivered = await notifyInbound({
      subject: `طلب تجربة جديد — ${data.institutionName}`,
      lines: [
        ["المؤسسة", data.institutionName],
        ["البريد", data.email],
        ["الهاتف", data.phone],
        ["الدافع", data.motivation],
      ],
    });

    return { ok: true as const, delivered };
  });

/** رسالة تواصل / دعم — نقطة عمومية */
export const submitSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((data: SupportMessageInput) => supportMessageSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyInbound } = await import("@/lib/inbound.server");

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return { ok: false as const, message: "تم إرسال عدة رسائل مؤخرًا، حاول لاحقًا." };
    }

    const { error } = await supabaseAdmin.from("support_messages").insert({
      first_name: data.firstName,
      last_name: data.lastName,
      institution_name: data.institutionName || null,
      wilaya: data.wilaya || null,
      commune: data.commune || null,
      address: data.address || null,
      phone: data.phone,
      email: data.email,
      message: data.message,
    });
    if (error) throw new Error(error.message);

    const delivered = await notifyInbound({
      subject: `رسالة دعم — ${data.firstName} ${data.lastName}`,
      lines: [
        ["الاسم", `${data.firstName} ${data.lastName}`],
        ["المؤسسة", data.institutionName || "—"],
        ["الولاية", data.wilaya || "—"],
        ["البلدية", data.commune || "—"],
        ["العنوان", data.address || "—"],
        ["الهاتف", data.phone],
        ["البريد", data.email],
        ["الرسالة", data.message],
      ],
    });

    return { ok: true as const, delivered };
  });

/** قرار مدير المنصة على طلب تجربة */
export const decideTrialRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; approve: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "platform_admin",
    });
    if (!isAdmin) throw new Error("غير مصرح");

    const { TRIAL_HOURS } = await import("@/lib/inbound.shared");
    const now = new Date();
    const ends = new Date(now.getTime() + TRIAL_HOURS * 60 * 60 * 1000);

    const { error } = await context.supabase
      .from("trial_requests")
      .update(
        data.approve
          ? {
              status: "approved",
              trial_started_at: now.toISOString(),
              trial_ends_at: ends.toISOString(),
            }
          : { status: "rejected" },
      )
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true as const, trialEndsAt: data.approve ? ends.toISOString() : null };
  });
