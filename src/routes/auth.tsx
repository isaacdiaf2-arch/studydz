import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SiteHeader } from "@/components/site/SiteHeader";
import { useServerFn } from "@tanstack/react-start";
import { startDemoSession } from "@/lib/demo.functions";
import { DEMO_ACCOUNTS, type DemoRoleKey } from "@/lib/demo.shared";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit.functions";


export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    redirect: z.string().optional(),
    blocked: z.enum(["expired", "suspended"]).optional(),
  }),
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

  const blockedMessage = search.blocked
    ? search.blocked === "expired"
      ? "انتهى اشتراك مؤسستك. يرجى التجديد عبر صفحة الاشتراك للوصول إلى المنصة."
      : "تم إيقاف مؤسستك. تواصل مع إدارة المنصة لإعادة التفعيل."
    : null;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const startDemo = useServerFn(startDemoSession);
  const checkRate = useServerFn(checkLoginRateLimit);
  const recordAttempt = useServerFn(recordLoginAttempt);
  const [demoBusy, setDemoBusy] = useState<DemoRoleKey | null>(null);

  async function handleDemo(role: DemoRoleKey) {
    setError(null);
    setDemoBusy(role);
    try {
      const account = await startDemo({ data: { role } });
      const { error: demoError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (demoError) throw new Error(demoError.message);
      toast.success(`تم الدخول بحساب تجريبي: ${DEMO_ACCOUNTS[role].label}`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر فتح الحساب التجريبي.";
      setError(message);
      toast.error(message);
    } finally {
      setDemoBusy(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lockedUntil && Date.now() < lockedUntil) {
      const wait = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`تم إيقاف المحاولات مؤقتًا. حاول بعد ${wait} ثانية.`);
      return;
    }

    const identifier = email.trim().toLowerCase();
    try {
      const rateCheck = await checkRate({ data: { identifier } });
      if (rateCheck.locked) {
        const until = Date.now() + (rateCheck.waitSeconds ?? 60) * 1000;
        setLockedUntil(until);
        setError("تم تجاوز الحد المسموح من المحاولات الفاشلة. حاول لاحقًا.");
        return;
      }
    } catch {
      // If rate check fails, proceed with client-side fallback
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (signInError) {
      setLoading(false);
      try {
        await recordAttempt({ data: { identifier, success: false } });
      } catch { /* ignore */ }
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        const until = Date.now() + 60_000;
        setLockedUntil(until);
        setAttempts(0);
        setError("تم تجاوز 5 محاولات فاشلة. تم إيقاف المحاولات لمدة 60 ثانية.");
      } else {
        const message =
          signInError.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
            : signInError.message === "Email not confirmed"
              ? "لم يتم تأكيد البريد الإلكتروني بعد."
              : `تعذّر تسجيل الدخول: ${signInError.message}`;
        setError(message);
        toast.error(message);
      }
      return;
    }

    try {
      await recordAttempt({ data: { identifier, success: true } });
    } catch { /* ignore */ }
    setAttempts(0);
    setLockedUntil(null);

    const destination = search.redirect ?? "/dashboard";


    setLoading(false);
    navigate({ to: destination });
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
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {blockedMessage && !error && (
            <p role="alert" className="rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
              {blockedMessage}
            </p>
          )}
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

        <section className="mt-10 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">حسابات تجريبية</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            جرّب المنصة فورًا بحساب مؤقت مخصص لكل دور، ضمن مؤسسة تجريبية منفصلة عن البيانات الحقيقية.
          </p>
          <div className="mt-4 grid gap-3">
            {(Object.keys(DEMO_ACCOUNTS) as DemoRoleKey[]).map((role) => (
              <div
                key={role}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{DEMO_ACCOUNTS[role].label}</p>
                  <p className="text-xs text-muted-foreground">{DEMO_ACCOUNTS[role].description}</p>
                  <p dir="ltr" className="mt-1 text-xs text-muted-foreground">
                    {DEMO_ACCOUNTS[role].email} · {DEMO_ACCOUNTS[role].password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={demoBusy !== null}
                  onClick={() => handleDemo(role)}
                >
                  {demoBusy === role ? "جارٍ التحضير…" : "دخول تجريبي"}
                </Button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
