import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { requestPasswordReset } from "@/lib/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | Study DZ" },
      {
        name: "description",
        content:
          "نسيت كلمة المرور؟ أرسل طلب إعادة التعيين إلى مدير مؤسستك أو إلى مدير منصة Study DZ ليصدر لك كلمة مرور جديدة أو رمزًا مؤقتًا.",
      },
      { property: "og:title", content: "استعادة كلمة المرور | Study DZ" },
      {
        property: "og:description",
        content: "أرسل طلب إعادة تعيين كلمة المرور إلى المسؤول المختص في Study DZ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useServerFn(requestPasswordReset);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request({ data: { identifier: identifier.trim() } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-3xl">نسيت كلمة المرور</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          أدخل بريدك الإلكتروني أو اسم المستخدم. إذا كنت طالبًا أو أستاذًا يُرسل الطلب إلى مدير
          مؤسستك، وإذا كنت مدير مؤسسة يُرسل الطلب إلى مدير منصة Study DZ ليعيد تعيين كلمة المرور أو
          يصدر لك رمزًا مؤقتًا.
        </p>

        {sent ? (
          <div className="card-soft mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-2xl">تم إرسال الطلب</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              سيصل طلبك إلى لوحة تحكم المسؤول المختص. تواصل معه لاستلام كلمة المرور الجديدة أو الرمز
              المؤقت.
            </p>
            <Button asChild className="mt-6">
              <Link to="/auth">العودة لتسجيل الدخول</Link>
            </Button>
          </div>
        ) : (
          <form className="card-soft mt-8 space-y-5 p-6" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="identifier">البريد الإلكتروني أو اسم المستخدم</Label>
              <Input
                id="identifier"
                dir="ltr"
                required
                maxLength={255}
                placeholder="email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              <KeyRound className="h-4 w-4" />
              {busy ? "جارٍ الإرسال…" : "إرسال طلب إعادة التعيين"}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
