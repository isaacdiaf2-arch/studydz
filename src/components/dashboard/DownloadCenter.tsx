import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldCheck, Server, FileDown, Terminal, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import { getInstallationInfo } from "@/lib/licenses.functions";

const STATUS_LABEL: Record<string, string> = {
  active: "فعّال",
  pending: "قيد التفعيل",
  suspended: "موقوف",
  revoked: "ملغى",
  expired: "منتهي",
};

export function DownloadCenter() {
  const fetchInfo = useServerFn(getInstallationInfo);
  const info = useQuery({ queryKey: ["installation", "info"], queryFn: () => fetchInfo({ data: undefined }) });
  const [copied, setCopied] = useState(false);

  const data = info.data;

  function downloadConfig() {
    if (!data?.license || !data.active) return;
    const config = {
      product: "Study DZ — Educational Institution OS",
      version: data.release.version,
      deployment: data.license.deployment,
      institution_id: data.institution?.id,
      institution_name: data.institution?.name,
      license_key: data.license.license_key,
      installation_id: data.license.installation_id,
      starts_on: data.license.starts_on,
      expires_on: data.license.expires_on,
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studydz-license-${data.license.license_key}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل ملف التفعيل الخاص بمؤسستك.");
  }

  function copyInstallCommand() {
    const cmd = `# 1. أنشئ كلمة مرور قاعدة البيانات:\nmkdir -p secrets && openssl rand -hex 24 > secrets/db_password.txt\n\n# 2. ضع ملف التفعيل:\ncp /path/to/license.json ./license.json\n\n# 3. أنشئ ملف secrets/app.env بالقيم التالية:\n# SUPABASE_URL=...\n# SUPABASE_ANON_KEY=...\n# SUPABASE_SERVICE_ROLE_KEY=...\n\n# 4. شغّل الخدمات:\ndocker-compose up -d\n\n# 5. طبّق قاعدة البيانات:\n./scripts/run-migrations.sh`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("تم نسخ أوامر التثبيت.");
  }

  if (info.isLoading) return <EmptyState text="جارٍ تحميل بيانات التثبيت…" />;
  if (!data) return <EmptyState text="هذه الصفحة مخصصة لمدير المؤسسة فقط." />;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Server className="h-5 w-5 text-brand" />
          <h2 className="flex-1 text-lg font-semibold">تحميل Study DZ — نسخة المؤسسة</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs">الإصدار {data.release.version}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          نسخة تُثبَّت على خادم المؤسسة وتعمل داخل الشبكة الداخلية، مرتبطة بترخيص مؤسستك وحدها.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h3 className="text-base font-semibold">حالة الترخيص</h3>
        </div>
        {data.license ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">مفتاح الترخيص</dt>
              <dd className="font-mono">{data.license.license_key}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">الحالة</dt>
              <dd>{STATUS_LABEL[data.license.status] ?? data.license.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">نمط التشغيل</dt>
              <dd>
                {data.license.deployment === "local"
                  ? "خادم محلي"
                  : data.license.deployment === "hybrid"
                    ? "هجين"
                    : "سحابي"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">معرّف التثبيت</dt>
              <dd className="font-mono text-xs">{data.license.installation_id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ينتهي في</dt>
              <dd>{data.license.expires_on ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            لا يوجد ترخيص صادر لمؤسستك بعد. يُصدر الترخيص من إدارة Study DZ بعد اعتماد الدفع وتوقيع العقد.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-brand" />
          <h3 className="text-base font-semibold">ملفات التثبيت</h3>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {data.release.platforms.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={downloadConfig} disabled={!data.active}>
            <FileDown className="ml-2 h-4 w-4" />
            تنزيل ملف التفعيل الخاص بالمؤسسة
          </Button>
        </div>
        {!data.active && (
          <p className="mt-3 text-sm text-muted-foreground">
            يصبح التنزيل متاحًا بعد تفعيل ترخيص مؤسستك.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold">متطلبات التشغيل</h3>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {data.release.requirements.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        <h3 className="mt-5 text-base font-semibold">خطوات التثبيت</h3>
        <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm text-muted-foreground">
          <li>ثبّت Docker و Docker Compose على خادم المؤسسة.</li>
          <li>حمّل حزمة Study DZ المحلية وافتح المجلد.</li>
          <li>ضع ملف التفعيل المُنزَّل (license.json) في المجلد الجذري.</li>
          <li>أنشئ كلمة مرور قاعدة البيانات في secrets/db_password.txt.</li>
          <li>شغّل الأوامر التالية:</li>
        </ol>
        <div className="mt-3 rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" />
              <span>أوامر التثبيت</span>
            </div>
            <Button variant="ghost" size="sm" onClick={copyInstallCommand}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <pre className="mt-2 overflow-x-auto text-xs leading-5" dir="ltr">
{`docker-compose up -d
./scripts/run-migrations.sh`}
          </pre>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          الترخيص مرتبط بمعرّف تثبيت فريد (Installation ID) لا يعمل على أي خادم آخر.
        </p>
      </section>
    </div>
  );
}
