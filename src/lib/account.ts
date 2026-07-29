import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "platform_admin" | "institution_admin" | "teacher" | "student";

export const roleLabels: Record<AppRole, string> = {
  platform_admin: "مدير المنصة",
  institution_admin: "مدير المؤسسة",
  teacher: "أستاذ",
  student: "طالب",
};

export const roleHome: Record<AppRole, string> = {
  platform_admin: "/admin",
  institution_admin: "/institution",
  teacher: "/teacher",
  student: "/student",
};

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      let institution = null;
      if (profile?.institution_id) {
        const { data } = await supabase
          .from("institutions")
          .select("*")
          .eq("id", profile.institution_id)
          .maybeSingle();
        institution = data;
      }

      const role = (roles?.[0]?.role ?? null) as AppRole | null;
      return { user, profile, role, institution };
    },
  });
}

export async function signOutEverything() {
  await supabase.auth.signOut();
}
