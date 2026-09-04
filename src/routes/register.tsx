import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  registerInstitutionAccount,
  saveInstitutionMedia,
} from "@/lib/signup.functions";
import {
  INSTITUTION_TYPES,
  WILAYAS,
  institutionSignupSchema,
  type InstitutionSignupInput,
} from "@/lib/signup.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "تسجيل مؤسسة جديدة | Study DZ" },
      {
        name: "description",
        content:
          "سجّل مؤسستك التعليمية في Study DZ: بيانات المؤسسة الكاملة، الشعار والغلاف، رقم الاعتماد والسجل التجاري، ثم ادفع عبر CCP ليتم التفعيل خلال 24 ساعة.",
      },
      { property: "og:title", content: "تسجيل مؤسسة جديدة | Study DZ" },
      {
        property: "og:description",
        content: "أنشئ حساب مؤسستك التعليمية على منصة Study DZ في دقائق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const emptyForm: InstitutionSignupInput = {
  name: "",
  nameFr: "",
  type: "",
  accreditationNumber: "",
  commercialRegister: "",
  accreditationAuthority: "",
  foundedOn: "",
  wilaya: "",
  commune: "",
  address: "",
  mapsUrl: "",
  phone: "",
  email: "",
  website: "",
  facebookUrl: "",
  instagramUrl: "",
  firstName: "",
  lastName: "",
  managerPhone: "",
  managerEmail: "",
  password: "",
  confirmPassword: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerInstitutionAccount);
  const saveMedia = useServerFn(saveInstitutionMedia);

  const [form, setForm] = useState<InstitutionSignupInput>(emptyForm);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof InstitutionSignupInput>(key: K, value: InstitutionSignupInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function uploadMedia(institutionId: string) {
    const payload: { logoUrl?: string; coverUrl?: string } = {};
    const items: [File | null, "logo" | "cover"][] = [
      [logo, "logo"],
      [cover, "cover"],
    ];
    for (const [file, kind] of items) {
      if (!file) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${institutionId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("institution-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) continue;
      const { data: signed } = await supabase.storage
        .from("institution-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (!signed?.signedUrl) continue;
      if (kind === "logo") payload.logoUrl = signed.signedUrl;
      else payload.coverUrl = signed.signedUrl;
    }
    if (payload.logoUrl || payload.coverUrl) {
      await saveMedia({ data: payload });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = institutionSignupSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("يرجى تصحيح الحقول المطلوبة.");
      return;
    }

    setBusy(true);
    try {
      const { institutionId } = await register({ data: form });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.managerEmail.trim().toLowerCase(),
        password: form.password,
      });
      if (!signInError) {
        try {
          await uploadMedia(institutionId);
        } catch {
          toast.warning("تم إنشاء الحساب، لكن تعذّر رفع الصور. يمكنك رفعها لاحقًا من لوحة المؤسسة.");
        }
      }

      setDone(true);
      toast.success("تم إنشاء حساب مؤسستك بنجاح.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إنشاء الحساب.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">🏢 تسجيل مؤسسة جديدة</h1>
        <p className="mt-3 text-muted-foreground">
          املأ المعلومات التالية لإنشاء حساب مؤسستك. البريد الإلكتروني ورقم الهاتف إجباريان، ولا
          يمكن استعمال بريد أو رقم مسجّل مسبقًا في المنصة.
        </p>

        {done ? (
          <div className="card-soft mt-8 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl">🟡 حسابك قيد المراجعة</h2>
            <ol className="mx-auto mt-5 max-w-md space-y-2 text-start text-sm leading-7 text-muted-foreground">
              <li>1. اختر الباقة (9,000 دج سنويًا).</li>
              <li>2. قم بالدفع عبر الحساب البريدي CCP.</li>
              <li>3. أرسل إثبات الدفع (صورة أو PDF).</li>
              <li>4. انتظر التفعيل بعد التحقق اليدوي من الإدارة خلال 24 ساعة.</li>
            </ol>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/subscribe">الانتقال إلى صفحة الاشتراك والدفع</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ to: "/institution" })}
              >
                الدخول إلى لوحة المؤسسة
              </Button>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-8" onSubmit={handleSubmit} noValidate>
            <section className="card-soft p-6">
              <h2 className="text-xl">معلومات المؤسسة</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  id="name"
                  label="اسم المؤسسة (بالعربية)"
                  required
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  error={errors["name"]}
                />
                <Field
                  id="nameFr"
                  label="اسم المؤسسة (بالفرنسية) — اختياري"
                  dir="ltr"
                  value={form.nameFr ?? ""}
                  onChange={(v) => set("nameFr", v)}
                  error={errors["nameFr"]}
                />
                <div className="grid gap-2">
                  <Label htmlFor="type">نوع المؤسسة</Label>
                  <select
                    id="type"
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">اختر النوع…</option>
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {errors["type"] && <ErrorText>{errors["type"]}</ErrorText>}
                </div>
                <Field
                  id="foundedOn"
                  label="تاريخ التأسيس — اختياري"
                  type="date"
                  dir="ltr"
                  value={form.foundedOn ?? ""}
                  onChange={(v) => set("foundedOn", v)}
                  error={errors["foundedOn"]}
                />
                <Field
                  id="accreditationNumber"
                  label="رقم الاعتماد — اختياري"
                  dir="ltr"
                  value={form.accreditationNumber ?? ""}
                  onChange={(v) => set("accreditationNumber", v)}
                  error={errors["accreditationNumber"]}
                />
                <Field
                  id="accreditationAuthority"
                  label="جهة الاعتماد — اختياري"
                  value={form.accreditationAuthority ?? ""}
                  onChange={(v) => set("accreditationAuthority", v)}
                  error={errors["accreditationAuthority"]}
                />
                <Field
                  id="commercialRegister"
                  label="رقم السجل التجاري — اختياري"
                  dir="ltr"
                  value={form.commercialRegister ?? ""}
                  onChange={(v) => set("commercialRegister", v)}
                  error={errors["commercialRegister"]}
                />
                <FileField
                  id="logo"
                  label="شعار المؤسسة — اختياري"
                  file={logo}
                  onFile={setLogo}
                />
                <FileField
                  id="cover"
                  label="صورة الغلاف — اختياري"
                  file={cover}
                  onFile={setCover}
                />
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="text-xl">الموقع ومعلومات التواصل</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="wilaya">الولاية</Label>
                  <select
                    id="wilaya"
                    value={form.wilaya}
                    onChange={(e) => set("wilaya", e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">اختر الولاية…</option>
                    {WILAYAS.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                  {errors["wilaya"] && <ErrorText>{errors["wilaya"]}</ErrorText>}
                </div>
                <Field
                  id="commune"
                  label="البلدية"
                  required
                  value={form.commune}
                  onChange={(v) => set("commune", v)}
                  error={errors["commune"]}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="address"
                    label="العنوان"
                    required
                    value={form.address}
                    onChange={(v) => set("address", v)}
                    error={errors["address"]}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    id="mapsUrl"
                    label="رابط Google Maps — اختياري"
                    dir="ltr"
                    placeholder="https://maps.google.com/…"
                    value={form.mapsUrl ?? ""}
                    onChange={(v) => set("mapsUrl", v)}
                    error={errors["mapsUrl"]}
                  />
                </div>
                <Field
                  id="phone"
                  label="رقم هاتف المؤسسة"
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="05XXXXXXXX"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  error={errors["phone"]}
                />
                <Field
                  id="email"
                  label="البريد الإلكتروني للمؤسسة"
                  type="email"
                  dir="ltr"
                  required
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  error={errors["email"]}
                />
                <Field
                  id="website"
                  label="الموقع الإلكتروني — اختياري"
                  dir="ltr"
                  placeholder="https://…"
                  value={form.website ?? ""}
                  onChange={(v) => set("website", v)}
                  error={errors["website"]}
                />
                <Field
                  id="facebookUrl"
                  label="صفحة فيسبوك — اختياري"
                  dir="ltr"
                  placeholder="https://facebook.com/…"
                  value={form.facebookUrl ?? ""}
                  onChange={(v) => set("facebookUrl", v)}
                  error={errors["facebookUrl"]}
                />
                <Field
                  id="instagramUrl"
                  label="حساب إنستغرام — اختياري"
                  dir="ltr"
                  placeholder="https://instagram.com/…"
                  value={form.instagramUrl ?? ""}
                  onChange={(v) => set("instagramUrl", v)}
                  error={errors["instagramUrl"]}
                />
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="text-xl">معلومات المدير</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="الاسم"
                  required
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                  error={errors["firstName"]}
                />
                <Field
                  id="lastName"
                  label="اللقب"
                  required
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                  error={errors["lastName"]}
                />
                <Field
                  id="managerPhone"
                  label="رقم الهاتف"
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="05XXXXXXXX"
                  value={form.managerPhone}
                  onChange={(v) => set("managerPhone", v)}
                  error={errors["managerPhone"]}
                />
                <Field
                  id="managerEmail"
                  label="البريد الإلكتروني (للدخول)"
                  type="email"
                  dir="ltr"
                  required
                  value={form.managerEmail}
                  onChange={(v) => set("managerEmail", v)}
                  error={errors["managerEmail"]}
                />
                <Field
                  id="password"
                  label="كلمة المرور"
                  type="password"
                  required
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  error={errors["password"]}
                />
                <Field
                  id="confirmPassword"
                  label="تأكيد كلمة المرور"
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  error={errors["confirmPassword"]}
                />
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  لا يمكن فتح أكثر من حساب مؤسسة بنفس البريد الإلكتروني أو رقم الهاتف. ستستعمل بريد
                  المدير وكلمة المرور لتسجيل الدخول إلى لوحة التحكم مباشرة.
                </span>
              </p>
            </section>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {busy ? "جارٍ إنشاء الحساب…" : "إنشاء حساب المؤسسة"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <Link to="/auth" className="font-semibold text-foreground underline">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-destructive">{children}</span>;
}

function Field({
  id,
  label,
  type = "text",
  required,
  dir,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        dir={dir}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function FileField({
  id,
  label,
  file,
  onFile,
}: {
  id: string;
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file && (
        <span className="truncate text-xs text-muted-foreground">{file.name}</span>
      )}
    </div>
  );
}
