import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { unlockPlatformAdmin } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site/SiteHeader";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Study DZ" },
      {
        name: "description",
        content: "سجّل الدخول إلى حسابك في منصة Study DZ: مدير مؤسسة، أستاذ أو طالب.",
      },
      { property: "og:title", content: "تسجيل الدخول | Study DZ" },
      { property: "og:description", content: "الدخول إلى لوحة التحكم الخاصة بك في Study DZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const unlock = useServerFn(unlockPlatformAdmin);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("تعذّر تسجيل الدخول: تحقّق من البريد وكلمة المرور.");
      return;
    }
    const pending = sessionStorage.getItem("sdz_pending_unlock");
    if (pending) {
      sessionStorage.removeItem("sdz_pending_unlock");
      try {
        await unlock({ data: { code: pending } });
        await queryClient.invalidateQueries({ queryKey: ["account"] });
        toast.success("تم فتح لوحة مدير المنصة.");
        navigate({ to: "/admin" });
        return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "تعذّر فتح لوحة مدير المنصة.");
      }
    }
    navigate({ to: search.redirect === "/admin" ? "/dashboard" : (search.redirect ?? "/dashboard") });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="text-3xl">تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">أدخل بيانات حسابك للمتابعة</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جارٍ الدخول…" : "دخول"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="font-semibold text-foreground underline">
            نسيت كلمة المرور؟
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          مؤسسة جديدة؟{" "}
          <Link to="/register" className="font-semibold text-foreground underline">
            سجّل مؤسستك
          </Link>
        </p>

      </main>
    </div>
  );
}
