import { createFileRoute, Link } from "@tanstack/react-router";
import {
  School,
  GraduationCap,
  Users,
  ShieldCheck,
  MessageSquare,
  Wallet,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Smartphone,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const benefits = [
  { icon: BookOpen, t: "محتوى تعليمي غني", d: "دروس فيديو، ملفات PDF، عروض تقديمية ومكتبة تعليمية." },
  { icon: ClipboardCheck, t: "اختبارات إلكترونية", d: "اختيار من متعدد، صح/خطأ وإجابة قصيرة مع تصحيح تلقائي وتوقيت." },
  { icon: BarChart3, t: "تقارير ذكية", d: "نسبة إنجاز الدروس، المتوسطات، نقاط القوة والضعف وتقرير شهري." },
  { icon: ShieldCheck, t: "أمان وعزل البيانات", d: "نظام متعدد المؤسسات: كل مؤسسة ترى بياناتها فقط، مع سجل عمليات ونسخ احتياطية." },
  { icon: Smartphone, t: "متجاوب 100%", d: "واجهة مهيأة للهواتف واللوحيات والحواسيب بدعم كامل للعربية." },
  { icon: CloudDownload, t: "عمل دون اتصال", d: "تحميل الدروس للمطالعة دون إنترنت مع مزامنة عند عودة الاتصال." },
  { icon: MessageSquare, t: "تواصل مباشر", d: "رسائل بين الإدارة والأستاذ والطالب، وأسئلة تحت كل درس." },
  { icon: Wallet, t: "إدارة مالية", d: "اشتراك المؤسسة، رسوم الطلاب، الفواتير وسجل المدفوعات." },
];


export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "مميزات المنصة — إدارة وتعليم وتواصل | Study DZ" },
      {
        name: "description",
        content:
          "كل مميزات Study DZ: نظام متعدد المؤسسات، لوحات تحكم للمدير والأستاذ والطالب، اختبارات إلكترونية، تقارير أداء وأمان كامل للبيانات.",
      },
      { property: "og:title", content: "مميزات المنصة | Study DZ" },
      {
        property: "og:description",
        content: "إدارة المؤسسة، المحتوى التعليمي، متابعة الطالب، التواصل، الإدارة المالية والأمان.",
      },
    ],
  }),
  component: Features,
});

const groups = [
  {
    icon: School,
    title: "🏫 إدارة المؤسسة",
    items: [
      "إدارة الطلاب والأساتذة",
      "إدارة الأقسام والمواد",
      "إدارة السنوات الدراسية",
      "إدارة الجداول",
      "إدارة الحضور والغياب",
      "إدارة النتائج والإعلانات",
      "إدارة الاشتراك السنوي",
      "تحويل الطلاب بين المؤسسات",
    ],
  },
  {
    icon: BookOpen,
    title: "📚 التعليم",
    items: [
      "دروس فيديو",
      "ملفات PDF وعروض تقديمية",
      "واجبات منزلية",
      "اختبارات إلكترونية",
      "تصحيح تلقائي للاختبارات الموضوعية",
      "بنك أسئلة",
      "مكتبة تعليمية",
    ],
  },
  {
    icon: BarChart3,
    title: "📈 متابعة الطالب",
    items: [
      "نسبة إنجاز الدروس",
      "سجل الاختبارات",
      "سجل الحضور",
      "متوسطات الطالب",
      "نقاط القوة والضعف",
      "تقرير تقدم شهري",
    ],
  },
  {
    icon: MessageSquare,
    title: "💬 التواصل",
    items: [
      "رسائل بين الأستاذ والطالب",
      "رسائل بين الإدارة والأستاذ",
      "رسائل بين الإدارة والطالب",
      "إشعارات فورية",
      "قسم للأسئلة تحت كل درس",
    ],
  },
  {
    icon: Wallet,
    title: "💰 الإدارة المالية",
    items: ["اشتراك المؤسسة", "رسوم الطلاب", "الفواتير", "سجل المدفوعات", "تقارير مالية"],
  },
  {
    icon: ShieldCheck,
    title: "🔒 الأمان",
    items: [
      "صلاحيات متعددة لكل نوع مستخدم",
      "تشفير كلمات المرور والبيانات",
      "منع الأستاذ من رؤية بيانات مؤسسات أخرى",
      "سجل العمليات",
      "نسخ احتياطية",
      "رمز تفعيل يُستعمل مرة واحدة فقط",
      "نظام استرجاع الحساب",
    ],
  },
];

const levels = [
  {
    title: "الطور الابتدائي",
    body: "السنة الأولى والثانية: اللغة العربية، الرياضيات، التربية الإسلامية، التربية البدنية والفنية. السنة الثالثة تضيف الإنجليزية والتربية العلمية والتكنولوجية والتاريخ والجغرافيا. الرابعة والخامسة تضيف الفرنسية.",
  },
  {
    title: "الطور المتوسط (1-4)",
    body: "اللغة العربية، الرياضيات، الفرنسية، الإنجليزية، علوم الطبيعة والحياة، العلوم الفيزيائية والتكنولوجيا، التاريخ والجغرافيا، التربية الإسلامية والمدنية، المعلوماتية، التربية الفنية والبدنية، اللغة الأمازيغية.",
  },
  {
    title: "الطور الثانوي",
    body: "آداب وفلسفة، لغات أجنبية، علوم تجريبية، رياضيات، هندسة (تقني رياضي)، معلوماتية وذكاء اصطناعي، تسيير واقتصاد — مع إمكانية إضافة مواد أخرى يدويًا.",
  },
  {
    title: "المراكز الخاصة",
    body: "دروس الدعم، تعليم اللغات الأجنبية، ودورات معتمدة مع رقم اعتماد لكل دورة.",
  },
  {
    title: "مراكز التكوين المهني (BT — 24 شهرًا)",
    body: "تقنيات الإدارة: المحاسبة، تسيير المخزونات، الأمانة المكتبية، التوثيق والأرشيف. التقنيات الحرفية والتجارية: بائع تجاري، صيانة التجهيزات المعلوماتية، البنوك، التأمينات. إضافة إلى التكوين التأهيلي القصير (3 إلى 6 أشهر).",
  },
  {
    title: "معاهد التكوين (BTS — 30 شهرًا)",
    body: "الإعلام الآلي والرقمنة، الأنظمة الرقمية، الأمن السيبراني وتطوير الويب، تسيير الموارد البشرية، المحاسبة والمالية، التجارة الدولية، الأمانة والمديرية، الصناعة والبيئة، الفندقة والسياحة ومربية الطفولة الأولى.",
  },
];

const roles = [
  {
    icon: School,
    title: "لوحة مدير المؤسسة",
    items: [
      "إدارة الأساتذة والطلاب (إضافة وحذف)",
      "إنشاء الأقسام والشعب والتخصصات",
      "ربط الأستاذ بالمادة والقسم",
      "شعار وألوان خاصة بالمؤسسة",
      "متابعة النتائج والحضور والنشاط",
      "إدارة الاشتراك والتجديد",
    ],
  },
  {
    icon: GraduationCap,
    title: "لوحة الأستاذ",
    items: [
      "موادي وأقسامي فقط",
      "إنشاء الدروس ورفع PDF والفيديو",
      "إنشاء الاختبارات مع تصحيح آلي",
      "نتائج الطلاب حسب القسم والشعبة",
      "الجدول الدراسي والإعلانات",
      "لا يرى بيانات مؤسسات أو أقسام أخرى",
    ],
  },
  {
    icon: Users,
    title: "لوحة الطالب",
    items: [
      "مشاهدة الدروس وتحديدها كمكتملة",
      "تحميل الملفات المسموحة",
      "اجتياز الاختبارات وإرسال الواجبات",
      "نتائجي فقط دون رؤية نتائج غيري",
      "الجدول الدراسي والإعلانات",
      "إشعارات فورية من الأستاذ والإدارة",
    ],
  },
];

function Features() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">المميزات الأساسية</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          نظام SaaS متعدد المؤسسات: كل مؤسسة لها مساحة مستقلة تمامًا داخل نفس النظام، مع دعم كامل
          للغة العربية وواجهة بسيطة جدًا.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <article key={g.title} className="card-soft p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <g.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg">{g.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {g.items.map((i) => (
                  <li key={i}>✅ {i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <h2 className="mt-16 text-3xl">📚 نظام المواد والتخصصات</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          المنصة مهيأة لبرنامج التعليم الجزائري، والأستاذ يرى فقط المادة أو القسم المرتبط به.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {levels.map((l) => (
            <article key={l.title} className="card-soft p-6">
              <h3 className="text-lg">{l.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{l.body}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-16 text-3xl">فوائد المؤسسات</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((f) => (
            <article key={f.t} className="card-soft p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base">{f.t}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.d}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { icon: School, t: "مساحة مستقلة", d: "كل مؤسسة تحصل على منصة خاصة بها داخل نفس النظام مع نطاق فرعي خاص." },
            { icon: GraduationCap, t: "توسّع سهل", d: "إضافة وحدات جديدة دون إعادة بناء النظام." },
            { icon: Users, t: "إحصائيات لحظية", d: "لوحة إحصائيات مباشرة لأداء المؤسسة والطلاب." },
          ].map((c) => (
            <article key={c.t} className="card-soft p-6">
              <c.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-base">⭐ {c.t}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.d}</p>
            </article>
          ))}
        </div>


        <div className="mt-14 text-center">
          <Button asChild size="lg">
            <Link to="/register">ابدأ بتسجيل مؤسستك</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
