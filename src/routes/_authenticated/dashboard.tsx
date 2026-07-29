import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, roleHome } from "@/lib/account";
import { bootstrapRole } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const navigate = useNavigate();
  const { data, isLoading } = useAccount();
  const bootstrap = useServerFn(bootstrapRole);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isLoading) return;
    if (data?.role) {
      navigate({ to: roleHome[data.role], replace: true });
      return;
    }
    let cancelled = false;
    bootstrap({ data: undefined }).then((res) => {
      if (cancelled) return;
      if (res?.role) {
        queryClient.invalidateQueries({ queryKey: ["account"] });
        navigate({ to: "/admin", replace: true });
      } else {
        navigate({ to: "/register", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, data, navigate, bootstrap, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      جارٍ تحميل لوحة التحكم…
    </div>
  );
}
