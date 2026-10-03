import { createFileRoute, Link } from "@tanstack/react-router";
import {
  School,
  GraduationCap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";



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


function Features() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl">📚 نظام المواد والتخصصات</h1>
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
