import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's Study DZ profile, role and institution.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, email, institution_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    let institution: { name: string; status: string } | null = null;
    if (profile?.institution_id) {
      const { data } = await supabase
        .from("institutions")
        .select("name, status")
        .eq("id", profile.institution_id)
        .maybeSingle();
      if (data) institution = { name: String(data.name), status: String(data.status) };
    }
    const result = {
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      email: profile?.email ?? ctx.getUserEmail() ?? null,
      roles: (roles ?? []).map((r) => String(r.role)),
      institution,
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { profile: result } };
  },
});
