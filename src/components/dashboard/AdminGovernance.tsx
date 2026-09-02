import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import { reviewInstitution, reviewChangeRequest, issueInvoice } from "@/lib/governance.functions";

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("ar-DZ", { dateStyle: "short", timeStyle: "short" });
}

/** مراجعة طلبات تسجيل المؤسسات: قبول / رفض بسبب / تعليق / أرشفة */
export function InstitutionReviewPanel() {
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const review = useServerFn(reviewInstitution);

  const pending = useQuery({
    queryKey: ["admin", "institution-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: (vars: {
      institutionId: string;
      decision: "approved" | "active" | "suspended" | "archived" | "rejected";
      reason?: string;
    }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("تم تسجيل القرار وإشعار المؤسسة");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = pending.data ?? [];

  return (
    <section className="card-soft p-4">
      <h2 className="font-display text-lg font-extrabold">طلبات تسجيل المؤسسات</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        لا يوجد قبول تلقائي — كل مؤسسة تمر بمراجعة مدير المنصة (قبول / رفض بسبب).
      </p>
      <div className="mt-4 space-y-3">
        {list.length === 0 && <EmptyState text="لا توجد طلبات بانتظار المراجعة" />}
        {list.map((inst) => (
          <div key={inst.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold">{inst.name}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                {inst.status === "pending" ? "قيد المراجعة" : "مقبولة — بانتظار التفعيل"}
              </span>
              <span className="text-xs text-muted-foreground">
                {inst.type} · {inst.wilaya} / {inst.commune}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {inst.email} · مُرسل في {fmt(inst.created_at)}
              {inst.rejection_reason ? ` · سبب الرفض السابق: ${inst.rejection_reason}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                className="h-9 max-w-xs"
                placeholder="سبب الرفض (إلزامي عند الرفض)"
                value={reasons[inst.id] ?? ""}
                onChange={(e) => setReasons((p) => ({ ...p, [inst.id]: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={() => decide.mutate({ institutionId: inst.id, decision: "approved" })}
              >
                قبول
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => decide.mutate({ institutionId: inst.id, decision: "active" })}
              >
                تفعيل
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = (reasons[inst.id] ?? "").trim();
                  if (!reason) {
                    toast.error("يجب كتابة سبب الرفض");
                    return;
                  }
                  decide.mutate({ institutionId: inst.id, decision: "rejected", reason });
                }}
              >
                رفض
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => decide.mutate({ institutionId: inst.id, decision: "archived" })}
              >
                أرشفة
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** طلبات تعديل البيانات الحساسة */
export function ChangeRequestsPanel() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const decideFn = useServerFn(reviewChangeRequest);

  const requests = useQuery({
    queryKey: ["admin", "change-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: (vars: { requestId: string; decision: "approved" | "rejected"; note?: string }) =>
      decideFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تسجيل القرار");
      queryClient.invalidateQueries({ queryKey: ["admin", "change-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = requests.data ?? [];
  const targetLabel: Record<string, string> = {
    profile: "بيانات مستخدم",
    institution: "بيانات مؤسسة",
    institution_settings: "إعدادات مؤسسة",
  };

  return (
    <section className="card-soft p-4">
      <h2 className="font-display text-lg font-extrabold">طلبات تعديل البيانات</h2>
      <div className="mt-4 space-y-3">
        {list.length === 0 && <EmptyState text="لا توجد طلبات تعديل" />}
        {list.map((r) => (
          <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{targetLabel[r.target] ?? r.target}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                {r.status === "pending" ? "🟡 قيد المراجعة" : r.status === "approved" ? "🟢 مقبول" : "🔴 مرفوض"}
              </span>
              <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-secondary p-2 text-[11px]">
                القديم: {JSON.stringify(r.old_values, null, 1)}
              </pre>
              <pre className="overflow-x-auto rounded-lg bg-brand-soft p-2 text-[11px]">
                الجديد: {JSON.stringify(r.new_values, null, 1)}
              </pre>
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 max-w-xs"
                  placeholder="ملاحظة القرار (اختياري)"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    decide.mutate({ requestId: r.id, decision: "approved", note: notes[r.id] })
                  }
                >
                  موافقة وتطبيق
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    decide.mutate({ requestId: r.id, decision: "rejected", note: notes[r.id] })
                  }
                >
                  رفض
                </Button>
              </div>
            )}
            {r.decision_note && (
              <p className="mt-2 text-xs text-muted-foreground">ملاحظة المراجع: {r.decision_note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** سجل التدقيق الأمني والإداري */
export function AuditLogPanel({ institutionId }: { institutionId?: string }) {
  const [q, setQ] = useState("");
  const logs = useQuery({
    queryKey: ["audit-logs", institutionId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (institutionId) query = query.eq("institution_id", institutionId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const list = (logs.data ?? []).filter(
    (l) =>
      !q.trim() ||
      `${l.action} ${l.resource ?? ""} ${l.resource_id ?? ""} ${l.actor_role ?? ""}`
        .toLowerCase()
        .includes(q.trim().toLowerCase()),
  );

  return (
    <section className="card-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold">سجل التدقيق (Audit Logs)</h2>
        <Input
          className="h-9 max-w-xs"
          placeholder="بحث في السجل…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState text="لا توجد أحداث مسجلة بعد" />
        ) : (
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2 text-start">التاريخ</th>
                <th className="p-2 text-start">الحدث</th>
                <th className="p-2 text-start">المورد</th>
                <th className="p-2 text-start">الدور</th>
                <th className="p-2 text-start">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{fmt(l.created_at)}</td>
                  <td className="p-2 font-semibold">{l.action}</td>
                  <td className="p-2">
                    {l.resource ?? "—"}
                    {l.resource_id ? ` · ${String(l.resource_id).slice(0, 8)}` : ""}
                  </td>
                  <td className="p-2">{l.actor_role ?? "—"}</td>
                  <td className="p-2">{l.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/** الفواتير والوصولات */
export function InvoicesPanel({
  institutionId,
  allowIssue = false,
}: {
  institutionId?: string;
  allowIssue?: boolean;
}) {
  const queryClient = useQueryClient();
  const issue = useServerFn(issueInvoice);

  const invoices = useQuery({
    queryKey: ["invoices", institutionId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select("*, institutions(name, wilaya, commune, email)")
        .order("issued_at", { ascending: false });
      if (institutionId) query = query.eq("institution_id", institutionId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const acceptedPayments = useQuery({
    enabled: allowIssue,
    queryKey: ["invoices", "issuable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, paid_at, institution_id, institutions(name)")
        .eq("status", "accepted")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: (paymentId: string) => issue({ data: { paymentId } }),
    onSuccess: (res: { number?: string }) => {
      toast.success(`تم إصدار الفاتورة ${res?.number ?? ""}`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issued = new Set((invoices.data ?? []).map((i) => i.payment_id));

  return (
    <div className="space-y-4">
      {allowIssue && (
        <section className="card-soft p-4">
          <h2 className="font-display text-lg font-extrabold">إصدار فاتورة لدفعة مقبولة</h2>
          <div className="mt-3 space-y-2">
            {(acceptedPayments.data ?? []).filter((p) => !issued.has(p.id)).length === 0 && (
              <EmptyState text="كل الدفعات المقبولة لديها فواتير" />
            )}
            {(acceptedPayments.data ?? [])
              .filter((p) => !issued.has(p.id))
              .map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                >
                  <span>
                    {(p.institutions as { name?: string } | null)?.name ?? "—"} · {p.amount} دج ·{" "}
                    {fmt(p.paid_at)}
                  </span>
                  <Button size="sm" onClick={() => create.mutate(p.id)}>
                    إصدار الفاتورة
                  </Button>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="card-soft p-4">
        <h2 className="font-display text-lg font-extrabold">الفواتير والوصولات</h2>
        <div className="mt-3 space-y-2">
          {(invoices.data ?? []).length === 0 && <EmptyState text="لا توجد فواتير بعد" />}
          {(invoices.data ?? []).map((inv) => (
            <article key={inv.id} className="rounded-xl border border-border p-3 text-sm print-area">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display font-bold">فاتورة رقم {inv.number}</span>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  طباعة / PDF
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {(inv.institutions as { name?: string } | null)?.name ?? "—"} · صدرت في{" "}
                {fmt(inv.issued_at)} · طريقة الدفع: {inv.method.toUpperCase()} · الحالة:{" "}
                {inv.status === "paid" ? "مدفوعة" : inv.status}
              </p>
              <p className="mt-1 font-semibold">
                المبلغ: {Number(inv.amount).toLocaleString("ar-DZ")} دج — الفترة:{" "}
                {inv.period_start ?? "—"} → {inv.period_end ?? "—"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
