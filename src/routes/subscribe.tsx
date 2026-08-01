import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Upload, CheckCircle2, Clock, XCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "الاشتراك السنوي والدفع عبر CCP | Study DZ" },
      {
        name: "description",
        content:
          "ادفع اشتراك Study DZ السنوي 8,000 دج عبر الحساب البريدي CCP، ثم ارفع وصل الدفع ليتم التحقق وتفعيل حساب مؤسستك خلال 24 ساعة.",
      },
      { property: "og:title", content: "الاشتراك السنوي والدفع عبر CCP | Study DZ" },
      {
        property: "og:description",
        content: "خطوات الاشتراك: الدفع 8,000 دج عبر CCP، رفع الوصل، ثم التفعيل بعد المراجعة.",
      },
    ],
  }),
  component: Subscribe,
});

const flow = [
  "🏫 تسجيل المؤسسة",
  "📄 إنشاء طلب الاشتراك السنوي",
  "💰 السعر الثابت: 8,000 دج",
  "💳 طريقة الدفع: CCP",
  "📤 دفع 8,000 دج",
  "📸 رفع وصل الدفع",
  "🟡 طلب قيد المراجعة",
  "👨‍💼 مدير المنصة يتحقق من الوصل",
];

function Subscribe() {
  const [file, setFile] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">الاشتراك السنوي والدفع</h1>
        <p className="mt-3 text-muted-foreground">
          سعر الاشتراك السنوي ثابت: <strong>8,000 دج</strong> لكل مؤسسة، والدفع يتم حاليًا عبر
          الحساب البريدي CCP مع تحقق يدوي من إدارة المنصة.
        </p>

        <div className="card-soft mt-8 p-6">
          <h2 className="text-xl">مسار الاشتراك</h2>
          <ol className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
            {flow.map((s, i) => (
              <li key={s}>
                <span className="font-semibold text-foreground">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusChip icon={CheckCircle2} label="🟢 قبول" tone="success" />
            <StatusChip icon={XCircle} label="🔴 رفض" tone="destructive" />
            <StatusChip icon={PauseCircle} label="🟠 موقوف" tone="warning" />
          </div>
        </div>

        <div className="card-soft mt-8 overflow-hidden">
          <div className="surface-hero border-b border-border p-6">
            <h2 className="text-xl text-foreground">معلومات الدفع</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              المبلغ المطلوب: 8,000.00 دج — دفع سنوي
            </p>
          </div>

          <dl className="grid gap-4 p-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">الاسم واللقب المستفيد</dt>
              <dd className="mt-1 font-display text-lg font-bold" dir="ltr">
                ishak diaf
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">رقم الحساب البريدي N° CCP</dt>
              <dd className="mt-1 font-display text-lg font-bold" dir="ltr">
                0042451103
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">المفتاح Clé</dt>
              <dd className="mt-1 font-display text-lg font-bold" dir="ltr">
                65
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
          <div className="text-sm leading-7">
            <p className="font-bold">تنبيه هام للمديرين</p>
            <p className="text-muted-foreground">
              بعد إتمام عملية الدفع (Versement) لدى مكتب البريد، يرجى كتابة اسم مؤسستكم على الوصل،
              ثم التقاط صورة واضحة له ورفعها في المكان المخصص أسفله لتأكيد المعاملة وتفعيل حسابكم في
              غضون 24 ساعة.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="card-soft mt-8 p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-warning" />
            <h2 className="mt-4 text-2xl">🟡 طلبك قيد المراجعة</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              تم استلام وصل الدفع. سيقوم مدير المنصة بالتحقق يدويًا من الوصل، وعند القبول يُفعّل
              حساب مؤسستكم مباشرة لمدة سنة كاملة.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/contact">تواصل مع الدعم</Link>
            </Button>
          </div>
        ) : (
          <form
            className="card-soft mt-8 space-y-5 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <h2 className="text-xl">📸 رفع وصل الدفع</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pay-inst">اسم المؤسسة</Label>
                <Input id="pay-inst" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-date">تاريخ الدفع</Label>
                <Input id="pay-date" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">المبلغ المدفوع (دج)</Label>
                <Input id="pay-amount" type="number" defaultValue={8000} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-method">طريقة الدفع</Label>
                <Input id="pay-method" defaultValue="CCP" readOnly />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pay-proof">إثبات الدفع (صورة أو PDF)</Label>
              <label
                htmlFor="pay-proof"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-4 py-10 text-center text-sm text-muted-foreground hover:border-primary"
              >
                <Upload className="h-6 w-6" />
                <span>{file ?? "اضغط لاختيار صورة الوصل أو ملف PDF"}</span>
              </label>
              <Input
                id="pay-proof"
                type="file"
                accept="image/*,application/pdf"
                required
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              إرسال إثبات الدفع
            </Button>
          </form>
        )}

        <div className="card-soft mt-8 p-6">
          <h2 className="text-xl">🔁 نظام التجديد</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            الاشتراك ← تجديد الاشتراك ← اختيار الباقة ← الدفع عبر CCP ← رفع إثبات الدفع ← مراجعة
            الإدارة ← تجديد سنة جديدة. ولا تُحذف بيانات المؤسسة في أي حالة.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  tone: "success" | "destructive" | "warning";
}) {
  const tones = {
    success: "border-success/40 bg-success/10 text-success",
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
    warning: "border-warning/50 bg-warning/15 text-warning-foreground",
  } as const;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}
