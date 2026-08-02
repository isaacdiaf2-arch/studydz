import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Name-only directory of the caller's own institution.
 * Never returns email/phone: those stay restricted to the profile owner and admins.
 */
export const listInstitutionDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("institution_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!me?.institution_id) return [] as { id: string; first_name: string; last_name: string }[];

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("institution_id", me.institution_id);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
