import { createFileRoute } from "@tanstack/react-router";
import { DownloadCenter } from "@/components/dashboard/DownloadCenter";

export const Route = createFileRoute("/_authenticated/download")({
  head: () => ({
    meta: [
      { title: "تحميل Study DZ — نسخة المؤسسة" },
      {
        name: "description",
        content: "تنزيل نسخة Study DZ الخاصة بمؤسستك، حالة الترخيص، متطلبات التشغيل وخطوات التثبيت المحلي.",
      },
      { property: "og:title", content: "تحميل Study DZ — نسخة المؤسسة" },
      {
        property: "og:description",
        content: "نسخة المؤسسة القابلة للتثبيت محليًا مع ترخيص مرتبط بالمؤسسة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">تحميل Study DZ</h1>
      <DownloadCenter />
    </main>
  );
}
