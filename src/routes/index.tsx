import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Smartphone,
  CloudDownload,
  MessageSquare,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study DZ — منصة سحابية جزائرية لإدارة التعليم" },
      {
        name: "description",
        content:
          "حوّل مؤسستك إلى مؤسسة تعليمية رقمية متكاملة: لوحات تحكم للمدير والأستاذ والطالب، دروس واختبارات ونتائج، باشتراك سنوي 7,000 دج.",
      },
      { property: "og:title", content: "Study DZ — منصة سحابية جزائرية لإدارة التعليم" },
      {
        property: "og:description",
        content: "حوّل مؤسستك إلى مؤسسة تعليمية رقمية متكاملة: لوحات تحكم للمدير والأستاذ والطالب، دروس واختبارات ونتائج، باشتراك سنوي 7,000 دج.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  { n: "1", t: "تسجيل المؤسسة", d: "أدخل معلومات المؤسسة ومعلومات المدير." },
  { n: "2", t: "اختيار الباقة والدفع", d: "دفع 7,000 دج سنويًا عبر الحساب البريدي CCP." },
  { n: "3", t: "رفع وصل الدفع", d: "صوّر الوصل بعد كتابة اسم المؤسسة عليه وارفعه." },
  { n: "4", t: "التفعيل خلال 24 ساعة", d: "بعد التحقق اليدوي من الإدارة يُفعّل حسابك مباشرة." },
];


const features = [
  { icon: BookOpen, t: "محتوى تعليمي غني", d: "دروس فيديو، ملفات PDF، عروض تقديمية ومكتبة تعليمية." },
  { icon: ClipboardCheck, t: "اختبارات إلكترونية", d: "اختيار من متعدد، صح/خطأ وإجابة قصيرة مع تصحيح تلقائي وتوقيت." },
  { icon: BarChart3, t: "تقارير ذكية", d: "نسبة إنجاز الدروس، المتوسطات، نقاط القوة والضعف وتقرير شهري." },
  { icon: ShieldCheck, t: "أمان وعزل البيانات", d: "نظام متعدد المؤسسات: كل مؤسسة ترى بياناتها فقط، مع سجل عمليات ونسخ احتياطية." },
  { icon: Smartphone, t: "متجاوب 100%", d: "واجهة مهيأة للهواتف واللوحيات والحواسيب بدعم كامل للعربية." },
  { icon: CloudDownload, t: "عمل دون اتصال", d: "تحميل الدروس للمطالعة دون إنترنت مع مزامنة عند عودة الاتصال." },
  { icon: MessageSquare, t: "تواصل مباشر", d: "رسائل بين الإدارة والأستاذ والطالب، وأسئلة تحت كل درس." },
  { icon: Wallet, t: "إدارة مالية", d: "اشتراك المؤسسة، رسوم الطلاب، الفواتير وسجل المدفوعات." },
];

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="surface-hero relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-foreground">
            منصة سحابية جزائرية · نظام SaaS متعدد المؤسسات
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.25] sm:text-5xl lg:text-6xl">
            حوّل مؤسستك إلى <span className="text-gold">مؤسسة تعليمية رقمية</span> متكاملة
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Study DZ منصة موجّهة للمدارس الخاصة، مراكز الدعم، المعاهد ومراكز التكوين المهني في
            الجزائر. إدارة كاملة للأساتذة والطلاب والأقسام، مع دروس واختبارات ونتائج.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">
                سجّل مؤسستك الآن
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">اطّلع على الأسعار</Link>
            </Button>
          </div>

          <dl className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              ["اشتراك سنوي واحد", "7,000 دج"],
              ["أساتذة وطلاب وأقسام", "غير محدود"],
              ["تفعيل الحساب", "خلال 24 ساعة"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl">كيف تعمل المنصة؟</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          أربع خطوات فقط تفصل مؤسستك عن منصة رقمية كاملة باسمها.
        </p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card-soft p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent font-display text-lg font-extrabold text-accent-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg">{s.t}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>




      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="surface-hero rounded-4xl border border-border px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl text-foreground">جاهز لرقمنة مؤسستك؟</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            سجّل مؤسستك اليوم، ادفع 7,000 دج عبر CCP، وارفع وصل الدفع ليتم تفعيل حسابك خلال 24
            ساعة.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">تسجيل مؤسسة جديدة</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">طلب تجربة أو تواصل</Link>
            </Button>
          </div>
        </div>
      </section>


      <SiteFooter />
    </div>
  );
}
