import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { submitSupportMessage } from "@/lib/inbound.functions";
import { supportMessageSchema } from "@/lib/inbound.shared";

import { SUPPORT_EMAIL, SUPPORT_PHONE, GMAIL_COMPOSE, WHATSAPP_LINK } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "التواصل والدعم | Study DZ" },
      {
        name: "description",
        content:
          "تواصل مع فريق Study DZ: أرسل معلومات مؤسستك وسؤالك أو طلب التجربة وسيصلك الرد على البريد الإلكتروني في أقرب وقت.",
      },
      { property: "og:title", content: "التواصل والدعم | Study DZ" },
      {
        property: "og:description",
        content: "أرسل استفسارك أو طلب تجربة المنصة لفريق Study DZ.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useServerFn(submitSupportMessage);

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
      toast.success("تم استلام رسالتك بنجاح");
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error("تعذّر إرسال الرسالة");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const parsed = supportMessageSchema.safeParse({
      firstName: get("firstName"),
      lastName: get("lastName"),
      institutionName: get("institution"),
      wilaya: get("wilaya"),
      commune: get("commune"),
      address: get("address"),
      phone: get("phones"),
      email: get("email"),
      message: get("message"),
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
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">التواصل والدعم</h1>
        <p className="mt-3 text-muted-foreground">
          املأ المعلومات التالية وسيتم إرسالها مباشرة إلى فريق الدعم على البريد{" "}
          <span dir="ltr" className="font-semibold text-foreground">
            {SUPPORT_EMAIL}
          </span>
          .
        </p>

        {sent ? (
          <div className="card-soft mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl">تم استلام رسالتك</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              وصلت رسالتك إلى فريق الدعم وسيتم الرد عليك على بريدك الإلكتروني. للاستعجال يمكنك
              مراسلتنا على{" "}
              <a className="font-semibold text-primary" href={GMAIL_COMPOSE} target="_blank" rel="noreferrer" dir="ltr">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
              إرسال رسالة أخرى
            </Button>
          </div>
        ) : (
          <form className="card-soft mt-8 space-y-5 p-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="firstName" label="الاسم" required />
              <TextField name="lastName" label="اللقب" required />
              <div className="sm:col-span-2">
                <TextField name="institution" label="اسم المؤسسة" required />
              </div>
              <TextField name="wilaya" label="الولاية" required />
              <TextField name="commune" label="البلدية" required />
              <div className="sm:col-span-2">
                <TextField name="address" label="عنوان المؤسسة" required />
              </div>
              <TextField name="phones" label="رقم الهاتف" type="tel" dir="ltr" required />
              <TextField name="email" label="البريد الإلكتروني" type="email" dir="ltr" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">رسالتك</Label>
              <Textarea id="message" name="message" rows={5} maxLength={2000} required />
            </div>
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
              إرسال الرسالة
            </Button>
          </form>
        )}


        <div className="card-soft mt-8 flex flex-wrap items-center gap-4 p-5 text-sm">
          <a
            className="flex items-center gap-2 font-semibold text-foreground"
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
          >
            <Phone className="h-5 w-5 shrink-0 text-primary" />
            <span dir="ltr">{SUPPORT_PHONE}</span>
          </a>
          <Mail className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-muted-foreground">
            للدعم المباشر:{" "}
            <a className="font-semibold text-foreground" href={GMAIL_COMPOSE} target="_blank" rel="noreferrer" dir="ltr">
              {SUPPORT_EMAIL}
            </a>
          </span>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TextField({
  name,
  label,
  type = "text",
  required,
  dir,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} dir={dir} maxLength={200} />
    </div>
  );
}
