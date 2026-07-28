import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
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
          "سجّل مؤسستك التعليمية في Study DZ: معلومات المؤسسة ومعلومات المدير، ثم اختر الباقة وادفع عبر CCP ليتم التفعيل خلال 24 ساعة.",
      },
      { property: "og:title", content: "تسجيل مؤسسة جديدة | Study DZ" },
      {
        property: "og:description",
        content: "أنشئ حساب مؤسستك التعليمية على منصة Study DZ في دقائق.",
      },
    ],
  }),
  component: RegisterPage,
});

const types = ["مدرسة خاصة", "مركز دعم", "معهد", "مركز تكوين", "مؤسسة عامة"];

const wilayas = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة",
  "تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة",
  "سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة",
  "وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة",
  "سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون",
  "برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة",
];

function RegisterPage() {
  const [done, setDone] = useState(false);

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
              <li>1. اختر الباقة (7,000 دج سنويًا).</li>
              <li>2. قم بالدفع عبر الحساب البريدي CCP.</li>
              <li>3. أرسل إثبات الدفع (صورة أو PDF).</li>
              <li>4. انتظر التفعيل بعد التحقق اليدوي من الإدارة خلال 24 ساعة.</li>
            </ol>
            <Button asChild size="lg" className="mt-7">
              <Link to="/subscribe">الانتقال إلى صفحة الاشتراك والدفع</Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-8 space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <section className="card-soft p-6">
              <h2 className="text-xl">معلومات المؤسسة</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="inst-name" label="اسم المؤسسة" required />
                <div className="grid gap-2">
                  <Label htmlFor="inst-type">نوع المؤسسة</Label>
                  <select
                    id="inst-type"
                    required
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">اختر النوع…</option>
                    {types.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wilaya">الولاية</Label>
                  <select
                    id="wilaya"
                    required
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">اختر الولاية…</option>
                    {wilayas.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <Field id="commune" label="البلدية" required />
                <div className="sm:col-span-2">
                  <Field id="address" label="العنوان" required />
                </div>
                <Field id="inst-phone" label="رقم هاتف المؤسسة" type="tel" required dir="ltr" />
                <Field id="inst-email" label="البريد الإلكتروني للمؤسسة" type="email" required dir="ltr" />
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="text-xl">معلومات المدير</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="dir-first" label="الاسم" required />
                <Field id="dir-last" label="اللقب" required />
                <Field id="dir-phone" label="رقم الهاتف" type="tel" required dir="ltr" />
                <Field id="dir-email" label="البريد الإلكتروني" type="email" required dir="ltr" />
                <Field id="dir-pass" label="كلمة المرور" type="password" required />
                <Field id="dir-pass2" label="تأكيد كلمة المرور" type="password" required />
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  لا يمكن فتح أكثر من حساب مؤسسة بنفس البريد الإلكتروني أو رقم الهاتف. سيتم إرسال رمز
                  تحقق إلى رقم هاتف المؤسسة عند تفعيل المصادقة الثنائية.
                </span>
              </p>
            </section>

            <Button type="submit" size="lg" className="w-full">
              إنشاء حساب المؤسسة
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  dir,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} dir={dir} />
    </div>
  );
}
