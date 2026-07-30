import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const body = [
      `الاسم: ${get("firstName")}`,
      `اللقب: ${get("lastName")}`,
      `اسم المؤسسة: ${get("institution")}`,
      `الولاية: ${get("wilaya")}`,
      `البلدية: ${get("commune")}`,
      `عنوان المؤسسة: ${get("address")}`,
      `أرقام الهاتف: ${get("phones")}`,
      `البريد الإلكتروني: ${get("email")}`,
      "",
      "الرسالة:",
      get("message"),
    ].join("\n");

    const subject = `طلب تواصل من ${get("institution") || "مؤسسة"} — Study DZ`;
    window.open(`${GMAIL_COMPOSE}&su=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">التواصل والدعم</h1>
        <p className="mt-3 text-muted-foreground">
          املأ المعلومات التالية وسيتم إرسالها إلى فريق الدعم على البريد{" "}
          <span dir="ltr" className="font-semibold text-foreground">
            {SUPPORT_EMAIL}
          </span>
          .
        </p>

        {sent ? (
          <div className="card-soft mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl">تم تجهيز رسالتك</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              إن لم يفتح برنامج البريد تلقائيًا، يمكنك مراسلتنا مباشرة على{" "}
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
              <TextField name="phones" label="أرقام الهاتف" type="tel" dir="ltr" required />
              <TextField name="email" label="البريد الإلكتروني" type="email" dir="ltr" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">رسالتك</Label>
              <Textarea id="message" name="message" rows={5} maxLength={1000} required />
            </div>
            <Button type="submit" size="lg" className="w-full">
              <Send className="h-4 w-4" />
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
