import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "ربط مساعد ذكي بـ Study DZ" },
      { name: "description", content: "خطوات ربط ChatGPT وClaude وClaude Code وغيرها بحسابك في Study DZ." },
      { property: "og:title", content: "ربط مساعد ذكي بـ Study DZ" },
      { property: "og:description", content: "خطوات ربط المساعدات الذكية بحسابك في Study DZ وتحديث الاتصال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

const APP_NAME = "Study DZ";
const SLUG = "study-dz";

function CopyBox({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div dir="ltr" className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-2">
      <code className="min-w-0 flex-1 break-all px-2 text-sm">{value || "…"}</code>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Steps({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div className="card-soft p-5">
      <h3 className="mb-3 font-display text-lg font-bold">{title}</h3>
      <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ol>
    </div>
  );
}

function ConnectPage() {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(new URL("/mcp", window.location.origin).toString()), []);
  const cmd = `claude mcp add --scope user --transport http ${SLUG} '${url.replace(/'/g, "'\\''")}'`;
  const claudeLink = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(APP_NAME)}&connectorUrl=${encodeURIComponent(url)}`;
  const a = "font-semibold text-brand underline";

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <section className="space-y-3">
          <h1 className="font-display text-3xl font-extrabold">ربط مساعد ذكي بـ Study DZ</h1>
          <p className="text-muted-foreground">
            اربط ChatGPT أو Claude أو أي مساعد آخر بحسابك ليطّلع على ملفك ودورك ومؤسستك وفق صلاحياتك فقط.
          </p>
          <p className="text-sm font-semibold">رابط الخادم:</p>
          <CopyBox value={url} />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">طريقة الربط</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Steps title="ChatGPT" items={[
              <>افتح <a className={a} href="https://chatgpt.com/#settings/Connectors/Advanced" target="_blank" rel="noreferrer">الإعدادات المتقدمة</a> وفعّل وضع المطوّر (Developer mode). إن لم يظهر، اطلب من مسؤول الحساب تفعيله.</>,
              <>افتح <a className={a} href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins" target="_blank" rel="noreferrer">نافذة إضافة جديدة</a>.</>,
              <>اكتب الاسم «{APP_NAME}» والصق الرابط أعلاه.</>,
              "راجع التفاصيل، وفعّل «I understand and want to continue» (يظهر هذا التنبيه لكل خادم مخصص)، ثم اضغط Create.",
              "فعّل التطبيق من خانة الكتابة واطلب من ChatGPT استخدامه.",
            ]} />
            <Steps title="Claude" items={[
              <>افتح <a className={a} href={claudeLink} target="_blank" rel="noreferrer">نافذة الربط الجاهزة</a> (الاسم والرابط معبّآن مسبقًا).</>,
              "راجع التفاصيل واضغط Add.",
              "إن لم تفتح النافذة: افتح صفحة Connectors، اختر Add custom connector، ثم اكتب الاسم والصق الرابط.",
              "فعّل الموصل من خانة الكتابة واطلب من Claude استخدامه.",
            ]} />
            <Steps title="Claude Code" items={[
              <>شغّل هذا الأمر في الطرفية:<div className="mt-2"><CopyBox value={url ? cmd : ""} /></div></>,
              "شغّل Claude Code ثم اكتب /mcp للتأكد من الاتصال وتسجيل الدخول.",
              "اطلب من Claude Code استخدام التطبيق.",
            ]} />
            <Steps title="مساعدات أخرى" items={[
              "افتح إعدادات خوادم MCP أو الموصلات المخصصة.",
              "أنشئ اتصالًا بخادم MCP عن بُعد.",
              "سمّه والصق الرابط أعلاه.",
              "أكمل تسجيل الدخول والموافقة.",
              "فعّل الاتصال واطلب من المساعد استخدام التطبيق.",
            ]} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">التحديث بعد تغييرات المنصة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Steps title="ChatGPT" items={[
              "افتح صفحة Plugins واختر التطبيق.",
              "انزل إلى Information واضغط Refresh.",
              "لا يمكن تعديل الرابط؛ إن تغيّر احذف التطبيق وأعد خطوات الربط.",
              "ابدأ محادثة جديدة.",
            ]} />
            <Steps title="Claude" items={[
              "افتح صفحة Connectors واختر الموصل.",
              "حدّث أدوات الموصل.",
              "لا يمكن تعديل الرابط؛ إن تغيّر احذف الموصل وأعد خطوات الربط.",
              "اطلب من Claude استخدام التطبيق.",
            ]} />
            <Steps title="Claude Code" items={[
              "ابدأ جلسة جديدة لتحميل أحدث الأدوات.",
              <>إن تغيّر الرابط شغّل <code dir="ltr">claude mcp remove {SLUG}</code> ثم أعد أمر التثبيت.</>,
              "اطلب من Claude Code استخدام التطبيق.",
            ]} />
            <Steps title="مساعدات أخرى" items={[
              "افتح إعدادات الاتصال الخاص بالتطبيق.",
              "حدّث قائمة الأدوات أو أعد الاتصال.",
              "إن تغيّر الرابط الصق الرابط الجديد.",
              "ابدأ محادثة جديدة.",
            ]} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
