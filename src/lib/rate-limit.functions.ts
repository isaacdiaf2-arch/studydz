import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 1;

export const checkLoginRateLimit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(1).max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("identifier", data.identifier)
      .eq("success", false)
      .gte("created_at", since);

    if (error) return { locked: false, waitSeconds: 0 };

    const failedCount = count ?? 0;
    if (failedCount >= MAX_ATTEMPTS) {
      return { locked: true, waitSeconds: LOCKOUT_MINUTES * 60 };
    }

    return { locked: false, waitSeconds: 0, remaining: MAX_ATTEMPTS - failedCount };
  });

export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      identifier: z.string().trim().min(1).max(255),
      success: z.boolean(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("login_attempts").insert({
      identifier: data.identifier,
      success: data.success,
    });
    return { ok: true as const };
  });
