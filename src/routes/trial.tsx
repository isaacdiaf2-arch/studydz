import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2, Rocket, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { submitTrialRequest } from "@/lib/inbound.functions";
import { trialRequestSchema } from "@/lib/inbound.shared";
import { startDemoSession } from "@/lib/demo.functions";
import { DEMO_ACCOUNTS, type DemoRoleKey } from "@/lib/demo.shared";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trial")({
  head: () => ({
    meta: [
      { title: "طلب تجربة مجانية 24 ساعة | Study DZ" },
      {
        name: "description",
        content:
          "اطلب تجربة مجانية لمنصة Study DZ لمدة 24 ساعة: أدخل اسم مؤسستك وبريدك ورقم هاتفك ودافعك من التجربة وسيتواصل معك فريقنا.",
      },
      { property: "og:title", content: "طلب تجربة مجانية 24 ساعة | Study DZ" },
      {
        property: "og:description",
        content: "جرّب منصة Study DZ لإدارة مؤسستك التعليمية مجانًا لمدة 24 ساعة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrialPage,
});

function TrialPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useServerFn(submitTrialRequest);
  const startDemo = useServerFn(startDemoSession);
  const navigate = useNavigate();
  const [demoBusy, setDemoBusy] = useState<DemoRoleKey | null>(null);

  async function enterTrial(role: DemoRoleKey) {
    setDemoBusy(role);
    try {
      const account = await startDemo({ data: { role } });
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (signErr) throw new Error(signErr.message);
      toast.success(`تم الدخول إلى التجربة: ${DEMO_ACCOUNTS[role].label}`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول إلى التجربة.");
    } finally {
      setDemoBusy(null);
    }
  }

  const mutation = useMutation({
    mutationFn: send,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setSent(true);
      toast.success("تم إرسال طلب التجربة");
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error("تعذّر إرسال الطلب");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const parsed = trialRequestSchema.safeParse({
      institutionName: get("institutionName"),
      email: get("email"),
      phone: get("phone"),
      motivation: get("motivation"),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "تحقق من البيانات المدخلة";
      setError(msg);
      toast.error(msg);
      return;
    }
    mutation.mutate({ data: parsed.data });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          <Rocket className="h-4 w-4" />
          تجربة مجانية
        </span>
        <h1 className="mt-4 text-4xl">اطلب تجربة المنصة لمدة 24 ساعة</h1>
        <p className="mt-3 leading-8 text-muted-foreground">
          املأ الاستمارة وسيصل طلبك فورًا إلى فريق Study DZ. بعد الموافقة تُفتح لك المنصة كاملة
          لمدة <strong className="text-foreground">24 ساعة</strong> فقط، ثم يمكنك الاشتراك السنوي
          للاستمرار.
        </p>

        <section className="card-soft mt-8 p-6">
          <h2 className="text-xl">ادخل إلى التجربة الآن</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(DEMO_ACCOUNTS) as DemoRoleKey[]).map((role) => (
              <Button
                key={role}
                variant="outline"
                disabled={demoBusy !== null}
                onClick={() => enterTrial(role)}
              >
                {demoBusy === role ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {DEMO_ACCOUNTS[role].label}
              </Button>
            ))}
          </div>
        </section>

        {sent ? (
          <div className="card-soft mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl">تم استلام طلبك</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              سيراجع فريق Study DZ طلبك ويتواصل معك على البريد الإلكتروني الذي أدخلته لتفعيل
              التجربة المجانية.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link to="/pricing">الاطلاع على الأسعار</Link>
              </Button>
              <Button variant="ghost" onClick={() => setSent(false)}>
                إرسال طلب آخر
              </Button>
            </div>
          </div>
        ) : (
          <form className="card-soft mt-8 space-y-5 p-6" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="institutionName">اسم المؤسسة</Label>
              <Input id="institutionName" name="institutionName" maxLength={150} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" dir="ltr" maxLength={255} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motivation">الدافع وراء تجربة المنصة</Label>
              <Textarea id="motivation" name="motivation" rows={5} maxLength={1000} required />
            </div>

            <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              مدة التجربة 24 ساعة فقط من لحظة التفعيل، وتنتهي الصلاحية تلقائيًا بعدها.
            </p>

            {error && (
              <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال طلب التجربة
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
