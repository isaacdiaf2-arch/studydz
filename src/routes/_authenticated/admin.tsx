import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileSignature,
  LifeBuoy,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
  Banknote,
  KeyRound,
  CalendarClock,
  Activity,
  Download,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardShell, StatCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { reviewPayment, setInstitutionStatus } from "@/lib/platform.functions";
import { signContractAsPlatform, setContractStatus } from "@/lib/contracts.functions";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "@/lib/contracts.shared";
import { resolvePasswordReset } from "@/lib/auth.functions";
import { SignatureSheet } from "@/components/dashboard/SignatureSheet";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

const nav = [
  { key: "home", label: "الرئيسية", icon: BarChart3 },
  { key: "institutions", label: "المؤسسات", icon: Building2 },
  { key: "subscriptions", label: "الاشتراكات", icon: CalendarClock },
  { key: "payments", label: "المدفوعات", icon: CreditCard },
  { key: "contracts", label: "العقود", icon: FileSignature },
  { key: "users", label: "المستخدمون", icon: Users },
  { key: "resets", label: "طلبات كلمة المرور", icon: KeyRound },
  { key: "reports", label: "التقارير", icon: Download },
  { key: "activity", label: "سجل العمليات", icon: Activity },
  { key: "support", label: "الدعم", icon: LifeBuoy },
];

const statusLabels: Record<string, string> = {
  pending: "🟡 قيد المراجعة",
  active: "🟢 نشطة",
  suspended: "🟠 موقوفة",
  expired: "🔴 منتهية",
};

const roleLabels: Record<string, string> = {
  platform_admin: "مدير المنصة",
  institution_admin: "مدير مؤسسة",
  teacher: "أستاذ",
  student: "طالب",
};

function daysLeft(date: string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminDashboard() {
  const [tab, setTab] = useState("home");
  const [instQuery, setInstQuery] = useState("");
  const [instFilter, setInstFilter] = useState<string>("all");
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState<string>("all");
  const [payFilter, setPayFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const institutions = useQuery({
    queryKey: ["admin", "institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const payments = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, institutions(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const profiles = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, institutions(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data;
    },
  });

  const contracts = useQuery({
    queryKey: ["admin", "contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, institutions(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const events = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_events")
        .select("*, contracts(contract_number)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const support = useQuery({
    queryKey: ["admin", "support"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resets = useQuery({
    queryKey: ["admin", "resets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*")
        .eq("target", "platform_admin")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const signPlatformFn = useServerFn(signContractAsPlatform);
  const contractStatusFn = useServerFn(setContractStatus);
  const resolveResetFn = useServerFn(resolvePasswordReset);
  const [signingContract, setSigningContract] = useState<string | null>(null);

  const signContract = useMutation({
    mutationFn: (vars: { contractId: string; signature: string }) => signPlatformFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم اعتماد العقد وتفعيل الاشتراك.");
      setSigningContract(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeContract = useMutation({
    mutationFn: (vars: { contractId: string; status: ContractStatus; note?: string }) =>
      contractStatusFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحديث حالة العقد.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveReset = useMutation({
    mutationFn: (vars: {
      requestId: string;
      action: "set_password" | "temp_code" | "reject";
      newPassword?: string;
    }) => resolveResetFn({ data: vars }),
    onSuccess: (res) => {
      toast.success(res.tempCode ? `الرمز المؤقت: ${res.tempCode}` : "تمت معالجة الطلب.", {
        duration: 12000,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "resets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewFn = useServerFn(reviewPayment);
  const statusFn = useServerFn(setInstitutionStatus);

  const review = useMutation({
    mutationFn: (vars: { paymentId: string; decision: "accepted" | "rejected" | "suspended" }) =>
      reviewFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الدفع.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: (vars: {
      institutionId: string;
      status: "pending" | "active" | "suspended" | "expired";
    }) => statusFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحديث حالة المؤسسة.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = institutions.data ?? [];
  const pays = payments.data ?? [];
  const roleList = roles.data ?? [];
  const contractList = contracts.data ?? [];
  const profileList = profiles.data ?? [];

  const accepted = pays.filter((p) => p.status === "accepted");
  const revenue = accepted.reduce((sum, p) => sum + Number(p.amount), 0);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const sumBy = (prefix: string) =>
    accepted
      .filter((p) => String(p.paid_at ?? "").startsWith(prefix))
      .reduce((s, p) => s + Number(p.amount), 0);

  const expiringSoon = list.filter((i) => {
    const d = daysLeft(i.subscription_end);
    return d !== null && d >= 0 && d <= 30;
  });

  const filteredInstitutions = useMemo(() => {
    const q = instQuery.trim().toLowerCase();
    return list.filter(
      (i) =>
        (instFilter === "all" || i.status === instFilter) &&
        (q === "" ||
          [i.name, i.wilaya, i.commune, i.email, i.phone]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [list, instQuery, instFilter]);

  const instNames = useMemo(
    () => new Map(list.map((i) => [i.id, i.name])),
    [list],
  );

  const roleByUser = useMemo(() => {

    const map = new Map<string, string[]>();
    roleList.forEach((r) => {
      map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
    });
    return map;
  }, [roleList]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return profileList.filter((p) => {
      const userRoles = roleByUser.get(p.id) ?? [];
      const matchRole = userRole === "all" || userRoles.includes(userRole);
      const matchQuery =
        q === "" ||
        [p.first_name, p.last_name, p.email, p.phone].join(" ").toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [profileList, roleByUser, userQuery, userRole]);

  const filteredPayments = pays.filter((p) => payFilter === "all" || p.status === payFilter);
  const filteredContracts = contractList.filter(
    (c) => contractFilter === "all" || c.status === contractFilter,
  );

  return (
    <DashboardShell title="لوحة مدير المنصة" nav={nav} active={tab} onChange={setTab}>
      {tab === "home" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="إجمالي المؤسسات" value={list.length} icon={Building2} />
            <StatCard
              label="المؤسسات النشطة"
              value={list.filter((i) => i.status === "active").length}
              icon={CheckCircle2}
            />
            <StatCard
              label="قيد المراجعة"
              value={list.filter((i) => i.status === "pending").length}
              icon={Clock}
            />
            <StatCard
              label="مؤسسات موقوفة"
              value={list.filter((i) => i.status === "suspended").length}
              icon={PauseCircle}
            />
            <StatCard
              label="اشتراكات منتهية"
              value={list.filter((i) => i.status === "expired").length}
              icon={XCircle}
            />
            <StatCard label="إجمالي المستخدمين" value={profileList.length} icon={Users} />
            <StatCard
              label="طلبات الدفع المعلقة"
              value={pays.filter((p) => p.status === "pending").length}
              icon={CreditCard}
            />
            <StatCard
              label="عقود بانتظار الإمضاء"
              value={contractList.filter((c) => c.status === "awaiting_platform").length}
              icon={FileSignature}
            />
          </div>

          <h2 className="pt-2 text-lg">👥 المستخدمون حسب الدور</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["institution_admin", "teacher", "student", "platform_admin"] as const).map((r) => (
              <StatCard
                key={r}
                label={roleLabels[r]}
                value={roleList.filter((x) => x.role === r).length}
                icon={Users}
              />
            ))}
          </div>

          <h2 className="pt-2 text-lg">💰 الإيرادات</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="إيرادات اليوم" value={`${sumBy(today).toLocaleString("en-US")} دج`} icon={Banknote} />
            <StatCard label="إيرادات الشهر" value={`${sumBy(month).toLocaleString("en-US")} دج`} icon={Banknote} />
            <StatCard label="إيرادات السنة" value={`${sumBy(year).toLocaleString("en-US")} دج`} icon={Banknote} />
            <StatCard label="الإيرادات الكلية" value={`${revenue.toLocaleString("en-US")} دج`} icon={Banknote} />
          </div>

          <h2 className="pt-2 text-lg">🔔 تنبيهات مهمة</h2>
          <div className="space-y-2">
            {pays.filter((p) => p.status === "pending").length > 0 && (
              <AlertRow
                text={`${pays.filter((p) => p.status === "pending").length} طلب دفع بانتظار المراجعة`}
                onClick={() => setTab("payments")}
              />
            )}
            {contractList.filter((c) => c.status === "awaiting_platform").length > 0 && (
              <AlertRow
                text={`${contractList.filter((c) => c.status === "awaiting_platform").length} عقد بانتظار إمضاء المنصة`}
                onClick={() => setTab("contracts")}
              />
            )}
            {expiringSoon.length > 0 && (
              <AlertRow
                text={`${expiringSoon.length} اشتراك ينتهي خلال 30 يومًا`}
                onClick={() => setTab("subscriptions")}
              />
            )}
            {(resets.data ?? []).filter((r) => r.status === "pending").length > 0 && (
              <AlertRow
                text={`${(resets.data ?? []).filter((r) => r.status === "pending").length} طلب إعادة تعيين كلمة مرور`}
                onClick={() => setTab("resets")}
              />
            )}
            {pays.filter((p) => p.status === "pending").length === 0 &&
              contractList.filter((c) => c.status === "awaiting_platform").length === 0 &&
              expiringSoon.length === 0 && <EmptyState text="لا توجد تنبيهات حاليًا." />}
          </div>

          <h2 className="pt-2 text-lg">🕒 آخر العمليات</h2>
          <div className="space-y-2">
            {(events.data ?? []).length === 0 && <EmptyState text="لا توجد عمليات مسجّلة." />}
            {(events.data ?? []).slice(0, 6).map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {tab === "institutions" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                value={instQuery}
                onChange={(e) => setInstQuery(e.target.value)}
                placeholder="بحث بالاسم أو الولاية أو البريد…"
                className="ps-9"
              />
            </div>
            <FilterTabs
              value={instFilter}
              onChange={setInstFilter}
              options={[
                ["all", "الكل"],
                ["pending", "قيد المراجعة"],
                ["active", "نشطة"],
                ["suspended", "موقوفة"],
                ["expired", "منتهية"],
              ]}
            />
          </div>
          {filteredInstitutions.length === 0 && <EmptyState text="لا توجد مؤسسات مطابقة." />}
          {filteredInstitutions.map((inst) => (
            <div key={inst.id} className="card-soft p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {inst.type} — {inst.wilaya} / {inst.commune}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {inst.phone} · {inst.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {statusLabels[inst.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => changeStatus.mutate({ institutionId: inst.id, status: "active" })}
                >
                  قبول وتفعيل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    changeStatus.mutate({ institutionId: inst.id, status: "suspended" })
                  }
                >
                  تعليق
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus.mutate({ institutionId: inst.id, status: "expired" })}
                >
                  إنهاء الاشتراك
                </Button>
              </div>
              {inst.subscription_end && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ينتهي الاشتراك في: {inst.subscription_end}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="اشتراكات سارية"
              value={list.filter((i) => i.status === "active").length}
              icon={CheckCircle2}
            />
            <StatCard label="تنتهي خلال 30 يومًا" value={expiringSoon.length} icon={AlertTriangle} />
            <StatCard
              label="اشتراكات منتهية"
              value={list.filter((i) => i.status === "expired").length}
              icon={XCircle}
            />
            <StatCard
              label="بدون اشتراك"
              value={list.filter((i) => !i.subscription_end).length}
              icon={Clock}
            />
          </div>
          {list.length === 0 && <EmptyState text="لا توجد اشتراكات." />}
          {list.map((inst) => {
            const d = daysLeft(inst.subscription_end);
            return (
              <div key={inst.id} className="card-soft flex flex-wrap items-center gap-2 p-4 text-sm">
                <span className="font-semibold">{inst.name}</span>
                <span className="text-xs text-muted-foreground">
                  {inst.subscription_end ? `ينتهي في ${inst.subscription_end}` : "لا يوجد اشتراك مفعّل"}
                </span>
                <span className="ms-auto rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {d === null
                    ? "—"
                    : d < 0
                      ? "🔴 منتهٍ"
                      : d <= 30
                        ? `🟠 يتبقى ${d} يومًا`
                        : `🟢 يتبقى ${d} يومًا`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-3">
          <FilterTabs
            value={payFilter}
            onChange={setPayFilter}
            options={[
              ["all", "الكل"],
              ["pending", "قيد المراجعة"],
              ["accepted", "مقبولة"],
              ["rejected", "مرفوضة"],
              ["suspended", "موقوفة"],
            ]}
          />
          {filteredPayments.length === 0 && <EmptyState text="لا توجد طلبات دفع." />}
          {filteredPayments.map((p) => (
            <div key={p.id} className="card-soft p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {(p.institutions as { name: string } | null)?.name ?? "مؤسسة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الباقة الأساسية · {Number(p.amount).toLocaleString("en-US")} دج · {p.method}
                  </p>
                  <p className="text-xs text-muted-foreground">تاريخ الدفع: {p.paid_at}</p>
                  {p.expires_at && (
                    <p className="text-xs text-muted-foreground">
                      نهاية الاشتراك السنوي: {p.expires_at}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {p.status === "pending" && "🟡 قيد المراجعة"}
                  {p.status === "accepted" && "🟢 مقبول"}
                  {p.status === "rejected" && "🔴 مرفوض"}
                  {p.status === "suspended" && "🟠 موقوف"}
                </span>
              </div>
              {p.proof_url && <ProofLink path={p.proof_url} />}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => review.mutate({ paymentId: p.id, decision: "accepted" })}
                >
                  <CheckCircle2 className="ms-1 h-4 w-4" /> قبول الدفع
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => review.mutate({ paymentId: p.id, decision: "rejected" })}
                >
                  <XCircle className="ms-1 h-4 w-4" /> رفض
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => review.mutate({ paymentId: p.id, decision: "suspended" })}
                >
                  <PauseCircle className="ms-1 h-4 w-4" /> إيقاف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "contracts" && (
        <div className="space-y-3">
          <FilterTabs
            value={contractFilter}
            onChange={setContractFilter}
            options={[
              ["all", "الكل"],
              ["awaiting_institution", "بانتظار المؤسسة"],
              ["awaiting_platform", "بانتظار المنصة"],
              ["approved", "معتمدة"],
              ["renewed", "مجدَّدة"],
              ["cancelled", "ملغاة"],
            ]}
          />
          {filteredContracts.length === 0 && <EmptyState text="لا توجد عقود." />}
          {filteredContracts.map((c) => (
            <div key={c.id} className="card-soft p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {(c.institutions as { name: string } | null)?.name ?? "مؤسسة"}
                  </p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {c.contract_number ?? "—"}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {CONTRACT_STATUS_LABEL[(c.status ?? "created") as ContractStatus]}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {c.body}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SignatureBox title="إمضاء مدير المؤسسة" value={c.institution_signature} />
                <SignatureBox title="إمضاء مدير المنصة" value={c.platform_signature} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status === "awaiting_platform" && (
                  <Button size="sm" onClick={() => setSigningContract(c.id)}>
                    <FileSignature className="ms-1 h-4 w-4" /> إمضاء واعتماد العقد
                  </Button>
                )}
                {c.status !== "cancelled" && c.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeContract.mutate({ contractId: c.id, status: "cancelled" })}
                  >
                    <XCircle className="ms-1 h-4 w-4" /> إلغاء العقد
                  </Button>
                )}
                {c.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeContract.mutate({ contractId: c.id, status: "renewed" })}
                  >
                    تجديد العقد
                  </Button>
                )}
              </div>
            </div>
          ))}
          {signingContract && (
            <SignatureSheet
              open
              title="إمضاء مدير المنصة"
              onClose={() => setSigningContract(null)}
              onConfirm={(signature: string) =>
                signContract.mutate({ contractId: signingContract, signature })
              }
            />
          )}
        </div>
      )}

      {tab === "resets" && (
        <div className="space-y-3">
          {(resets.data ?? []).length === 0 && (
            <EmptyState text="لا توجد طلبات إعادة تعيين كلمة المرور." />
          )}
          {(resets.data ?? []).map((r) => (
            <div key={r.id} className="card-soft p-4 text-sm">
              <p className="font-semibold">{r.full_name}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {r.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                الحالة:{" "}
                {r.status === "pending"
                  ? "🟡 معلّق"
                  : r.status === "resolved"
                    ? "🟢 تمت المعالجة"
                    : "🔴 مرفوض"}
                {r.temp_code ? ` · الرمز المؤقت: ${r.temp_code}` : ""}
              </p>
              {r.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => resolveReset.mutate({ requestId: r.id, action: "temp_code" })}
                  >
                    إصدار رمز مؤقت
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pwd = window.prompt("كلمة المرور الجديدة (8 أحرف فأكثر)");
                      if (pwd) {
                        resolveReset.mutate({
                          requestId: r.id,
                          action: "set_password",
                          newPassword: pwd,
                        });
                      }
                    }}
                  >
                    تعيين كلمة مرور
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveReset.mutate({ requestId: r.id, action: "reject" })}
                  >
                    رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="بحث بالاسم أو البريد أو الهاتف…"
                className="ps-9"
              />
            </div>
            <FilterTabs
              value={userRole}
              onChange={setUserRole}
              options={[
                ["all", "الكل"],
                ["institution_admin", "المديرون"],
                ["teacher", "الأساتذة"],
                ["student", "الطلاب"],
              ]}
            />
          </div>
          {filteredUsers.length === 0 && <EmptyState text="لا يوجد مستخدمون مطابقون." />}
          {filteredUsers.map((p) => (
            <div key={p.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="font-semibold">
                {p.first_name} {p.last_name}
              </span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {p.email}
              </span>
              <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {(roleByUser.get(p.id) ?? []).map((r) => roleLabels[r] ?? r).join(" · ") || "بدون دور"}
              </span>
              <span className="ms-auto rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {(p.institutions as { name: string } | null)?.name ?? "بدون مؤسسة"}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="مؤسسات" value={list.length} icon={Building2} />
            <StatCard label="مستخدمون" value={profileList.length} icon={Users} />
            <StatCard label="عقود" value={contractList.length} icon={FileSignature} />
            <StatCard label="مدفوعات مقبولة" value={accepted.length} icon={CheckCircle2} />
          </div>
          <div className="card-soft space-y-3 p-4">
            <p className="font-semibold">📤 تصدير البيانات (CSV)</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv("institutions.csv", [
                    ["الاسم", "النوع", "الولاية", "البلدية", "الهاتف", "البريد", "الحالة", "نهاية الاشتراك"],
                    ...list.map((i) => [
                      i.name,
                      i.type,
                      i.wilaya,
                      i.commune,
                      i.phone,
                      i.email,
                      i.status,
                      i.subscription_end ?? "",
                    ]),
                  ])
                }
              >
                <Download className="ms-1 h-4 w-4" /> المؤسسات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv("payments.csv", [
                    ["المؤسسة", "المبلغ", "الطريقة", "تاريخ الدفع", "الحالة"],
                    ...pays.map((p) => [
                      (p.institutions as { name: string } | null)?.name ?? "",
                      p.amount,
                      p.method,
                      p.paid_at,
                      p.status,
                    ]),
                  ])
                }
              >
                <Download className="ms-1 h-4 w-4" /> المدفوعات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv("users.csv", [
                    ["الاسم", "اللقب", "البريد", "الهاتف", "المؤسسة", "الأدوار"],
                    ...profileList.map((p) => [
                      p.first_name,
                      p.last_name,
                      p.email,
                      p.phone ?? "",
                      (p.institutions as { name: string } | null)?.name ?? "",
                      (roleByUser.get(p.id) ?? []).join(" / "),
                    ]),
                  ])
                }
              >
                <Download className="ms-1 h-4 w-4" /> المستخدمون
              </Button>
            </div>
          </div>
          <div className="card-soft p-4 text-sm">
            <p className="font-semibold">📊 تقرير الإيرادات</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>إيرادات اليوم: {sumBy(today).toLocaleString("en-US")} دج</li>
              <li>إيرادات الشهر الجاري: {sumBy(month).toLocaleString("en-US")} دج</li>
              <li>إيرادات السنة الجارية: {sumBy(year).toLocaleString("en-US")} دج</li>
              <li>الإجمالي منذ الانطلاق: {revenue.toLocaleString("en-US")} دج</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-2">
          {(events.data ?? []).length === 0 && <EmptyState text="لا توجد عمليات مسجّلة." />}
          {(events.data ?? []).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}

      {tab === "support" && (
        <div className="space-y-3">
          {(support.data ?? []).length === 0 && <EmptyState text="لا توجد رسائل دعم." />}
          {(support.data ?? []).map((m) => (
            <div key={m.id} className="card-soft p-4 text-sm">
              <p className="font-semibold">
                {m.first_name} {m.last_name} — {m.institution_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.wilaya} / {m.commune} — {m.address}
              </p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {m.phone} · {m.email}
              </p>
              {m.message && <p className="mt-2 leading-7">{m.message}</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function FilterTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
            value === key
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AlertRow({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-soft flex w-full items-center gap-2 p-3 text-start text-sm hover:bg-secondary"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-foreground">{text}</span>
    </button>
  );
}

function EventRow({
  event,
}: {
  event: {
    id: string;
    status: string;
    note: string | null;
    created_at: string;
    contracts?: { contract_number: string | null } | null;
    institutions?: { name: string } | null;
  };
}) {
  return (
    <div className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
      <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-semibold">{event.institutions?.name ?? "—"}</span>
      <span className="text-muted-foreground">{event.note ?? event.status}</span>
      <span className="text-xs text-muted-foreground" dir="ltr">
        {event.contracts?.contract_number ?? ""}
      </span>
      <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
        {new Date(event.created_at).toLocaleString("fr-DZ")}
      </span>
    </div>
  );
}

function SignatureBox({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      {value ? (
        <img src={value} alt={title} className="mt-2 h-20 w-full object-contain" />
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">لم يتم الإمضاء بعد</p>
      )}
    </div>
  );
}

function ProofLink({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["proof", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!data) return null;
  return (
    <a
      href={data}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block text-sm font-semibold underline"
    >
      عرض إثبات الدفع
    </a>
  );
}
