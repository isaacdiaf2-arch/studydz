import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "./contracts.server";

const input = z.object({
  pin: z.string().min(1).max(20),
  search: z.string().max(100).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().int().min(0).max(1000).default(0),
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const listPlatformActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", context.userId)
      .eq("action", "activity_pin_failed")
      .gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("محاولات كثيرة. أعد المحاولة بعد 15 دقيقة.");
    const expected = process.env["ACTIVITY_LOG_PIN"] ?? "";
    if (!expected || !timingSafeEqual(data.pin, expected)) {
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: context.userId, actor_role: "platform_admin", action: "activity_pin_failed",
        resource: "activity_log", result: "denied",
      });
      throw new Error("رمز PIN غير صحيح.");
    }
    const size = 100;
    let q = supabaseAdmin
      .from("audit_logs")
      .select("id,actor_id,actor_role,institution_id,action,resource,resource_id,result,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * size, data.page * size + size - 1);
    if (data.day) {
      // Algiers is UTC+1 year-round
      const start = new Date(`${data.day}T00:00:00+01:00`);
      q = q.gte("created_at", start.toISOString()).lt("created_at", new Date(start.getTime() + 86400000).toISOString());
    }
    const s = data.search?.trim().replace(/[%,()]/g, "");
    if (s) q = q.or(`action.ilike.%${s}%,resource.ilike.%${s}%,resource_id.ilike.%${s}%`);
    const { data: rows, count: total, error } = await q;
    if (error) throw new Error("تعذر تحميل السجل.");
    const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
    const instIds = [...new Set((rows ?? []).map((r) => r.institution_id).filter(Boolean))] as string[];
    const [actors, insts] = await Promise.all([
      actorIds.length ? supabaseAdmin.from("profiles").select("id,first_name,last_name").in("id", actorIds) : { data: [] },
      instIds.length ? supabaseAdmin.from("institutions").select("id,name").in("id", instIds) : { data: [] },
    ]);
    const an = new Map((actors.data ?? []).map((a: any) => [a.id, `${a.first_name} ${a.last_name}`.trim()]));
    const inn = new Map((insts.data ?? []).map((i: any) => [i.id, i.name]));
    return {
      total: total ?? 0,
      pageSize: size,
      rows: (rows ?? []).map((r) => ({
        ...r,
        actor_name: r.actor_id ? an.get(r.actor_id) ?? null : null,
        institution_name: r.institution_id ? inn.get(r.institution_id) ?? null : null,
      })),
    };
  });
