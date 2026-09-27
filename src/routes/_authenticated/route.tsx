import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, institution_id")
      .eq("user_id", data.user.id);

    const isPlatformAdmin = (roles ?? []).some((r) => r.role === "platform_admin");
    if (!isPlatformAdmin) {
      const institutionId = (roles ?? []).find((r) => r.institution_id)?.institution_id;
      if (institutionId) {
        const { data: inst } = await supabase
          .from("institutions")
          .select("status")
          .eq("id", institutionId)
          .maybeSingle();

        if (inst?.status === "expired" || inst?.status === "suspended") {
          throw redirect({
            to: "/auth",
            search: { redirect: undefined, blocked: inst.status },
          });
        }
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
