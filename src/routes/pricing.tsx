import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار — اشتراك سنوي 8,000 دج | Study DZ" },
      {
        name: "description",
        content:
          "الباقة الأساسية من Study DZ: أساتذة وطلاب وأقسام غير محدودة، دروس وملفات واختبارات، باشتراك سنوي 8,000 دج.",
      },
      { property: "og:title", content: "الأسعار — اشتراك سنوي 8,000 دج | Study DZ" },
      {
        property: "og:description",
        content: "باقة واحدة بسيطة لكل المؤسسات التعليمية الجزائرية بسعر 8,000 دج سنويًا.",
      },
    ],
  }),
  component: Pricing,
});

const included = [
  "أساتذة غير محدود",
  "طلاب غير محدود",
  "أقسام غير محدود",
  "دروس ومحتوى تعليمي غير محدود",
  "رفع ملفات PDF وفيديوهات",
  "اختبارات إلكترونية مع تصحيح تلقائي",
  "واجبات منزلية وتصحيحها",
  "الجدول الدراسي والحضور والغياب",
  "الإعلانات والإشعارات",
  "لوحات تحكم للمدير والأستاذ والطالب",
  "شعار وألوان خاصة بالمؤسسة",
  "تقارير ومتابعة أداء الطلاب",
  "دعم فني عبر البريد الإلكتروني",
];

function Pricing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-center text-4xl">سعر بسيط وواضح</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          باقة واحدة تشمل كل شيء. بدون رسوم خفية وبدون حدود على عدد المستخدمين.
        </p>

        <div className="card-soft mt-10 overflow-hidden">
          <div className="surface-hero border-b border-border px-6 py-8 text-center sm:px-10">
            <p className="text-sm font-semibold text-muted-foreground">🟢 الباقة الأساسية</p>
            <p className="mt-3 font-display text-5xl font-extrabold text-foreground">
              8,000 <span className="text-2xl">دج</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">اشتراك سنوي لكل مؤسسة</p>

          </div>
          <div className="p-6 sm:p-10">
            <ul className="grid gap-3 sm:grid-cols-2">
              {included.map((i) => (
                <li key={i} className="flex gap-2 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="sm:flex-1">
                <Link to="/register">تسجيل مؤسسة والاشتراك</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="sm:flex-1">
                <Link to="/contact">طلب تجربة</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="card-soft mt-8 p-6">
          <h2 className="text-xl">ماذا يحدث عند انتهاء الاشتراك؟</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
            <li>• تنبيه قبل 30 يومًا من انتهاء الاشتراك.</li>
            <li>• تنبيه ثانٍ قبل 7 أيام.</li>
            <li>
              • عند الانتهاء يتم إيقاف الحساب مؤقتًا فقط، <strong>ولا تُحذف أي بيانات</strong>.
            </li>
            <li>• بمجرد التجديد تعود المؤسسة لاستعمال المنصة بكامل بياناتها.</li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
