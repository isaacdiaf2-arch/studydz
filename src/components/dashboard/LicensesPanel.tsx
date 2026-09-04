import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import {
  LICENSE_AMOUNT,
  issueLicense,
  listLicenses,
  renewLicense,
  setLicenseStatus,
} from "@/lib/licenses.functions";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  active: "سارية",
  suspended: "موقوفة",
  revoked: "ملغاة",
  expired: "منتهية",
};

const deploymentLabels: Record<string, string> = {
  cloud: "سحابي",
  local: "خادم محلي",
  hybrid: "هجين",
};

export function LicensesPanel() {
  const queryClient = useQueryClient();
  const fetchLicenses = useServerFn(listLicenses);
  const issue = useServerFn(issueLicense);
  const renew = useServerFn(renewLicense);
  const setStatus = useServerFn(setLicenseStatus);

  const [form, setForm] = useState({ institutionId: "", deployment: "cloud", installationId: "", months: "12" });

  const licenses = useQuery({
    queryKey: ["licenses"],
    queryFn: () => fetchLicenses({ data: undefined as never }),
  });

  const institutions = useQuery({
    queryKey: ["licenses", "institutions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("id, name").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("تم تحديث الترخيص.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ العملية."),
  });

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">إصدار ترخيص سنوي ({LICENSE_AMOUNT.toLocaleString("en")} دج)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          الترخيص مرتبط بالمؤسسة وبالتنصيب (Installation)، ولا يُفعَّل إلا يدويًا بعد مراجعة وصل CCP.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="lic-inst">المؤسسة</Label>
            <select
              id="lic-inst"
              className={selectClass}
              value={form.institutionId}
              onChange={(e) => setForm({ ...form, institutionId: e.target.value })}
            >
              <option value="">اختر مؤسسة</option>
              {(institutions.data ?? []).map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lic-dep">نمط التشغيل</Label>
            <select
              id="lic-dep"
              className={selectClass}
              value={form.deployment}
              onChange={(e) => setForm({ ...form, deployment: e.target.value })}
            >
              <option value="cloud">سحابي</option>
              <option value="local">خادم محلي</option>
              <option value="hybrid">هجين</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lic-install">معرّف التنصيب</Label>
            <Input
              id="lic-install"
              dir="ltr"
              value={form.installationId}
              onChange={(e) => setForm({ ...form, installationId: e.target.value })}
            />
          </div>
          <Button
            className="self-end"
            disabled={!form.institutionId || act.isPending}
            onClick={() =>
              act.mutate(async () => {
                const res = await issue({
                  data: {
                    institutionId: form.institutionId,
                    deployment: form.deployment as never,
                    installationId: form.installationId.trim() || null,
                    months: Number(form.months) || 12,
                  },
                });
                setForm({ institutionId: "", deployment: "cloud", installationId: "", months: "12" });
                toast.success(`مفتاح الترخيص: ${res.licenseKey}`);
              })
            }
          >
            إصدار
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">التراخيص المُصدَرة</h2>
        {licenses.isLoading && <p className="mt-3 text-sm text-muted-foreground">جارٍ التحميل…</p>}
        {!licenses.isLoading && (licenses.data ?? []).length === 0 && (
          <EmptyState text="لا توجد تراخيص مُصدَرة بعد" />
        )}
        <div className="mt-3 space-y-3">
          {(licenses.data ?? []).map((l: any) => (
            <div key={l.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{l.institutions?.name ?? "—"}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">
                    {l.license_key} · {deploymentLabels[l.deployment] ?? l.deployment}
                    {l.installation_id ? ` · ${l.installation_id}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الحالة: {statusLabels[l.status] ?? l.status} · تنتهي في {l.expires_on ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => act.mutate(() => renew({ data: { licenseId: l.id, months: 12 } }))}
                  >
                    تجديد سنة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() =>
                      act.mutate(() => setStatus({ data: { licenseId: l.id, status: "suspended" } }))
                    }
                  >
                    إيقاف
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={act.isPending}
                    onClick={() =>
                      act.mutate(() => setStatus({ data: { licenseId: l.id, status: "revoked" } }))
                    }
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
