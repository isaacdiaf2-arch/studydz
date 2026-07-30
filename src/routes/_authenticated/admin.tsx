import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  { key: "payments", label: "المدفوعات", icon: CreditCard },
  { key: "contracts", label: "العقود", icon: FileSignature },
  { key: "users", label: "المستخدمون", icon: Users },
  { key: "resets", label: "طلبات كلمة المرور", icon: KeyRound },
  { key: "support", label: "الدعم", icon: LifeBuoy },
];

const statusLabels: Record<string, string> = {
  pending: "🟡 قيد المراجعة",
  active: "🟢 نشطة",
  suspended: "🟠 موقوفة",
  expired: "🔴 منتهية",
};

function AdminDashboard() {
  const [tab, setTab] = useState("home");
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
  const revenue = pays
    .filter((p) => p.status === "accepted")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <DashboardShell title="لوحة التحكم الرئيسية" nav={nav} active={tab} onChange={setTab}>
      {tab === "home" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <StatCard label="إجمالي المستخدمين" value={profiles.data?.length ?? 0} icon={Users} />
            <StatCard
              label="طلبات الدفع المعلقة"
              value={pays.filter((p) => p.status === "pending").length}
              icon={CreditCard}
            />
            <StatCard
              label="الإيرادات الكلية"
              value={`${revenue.toLocaleString("en-US")} دج`}
              icon={Banknote}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="المديرون"
              value={roleList.filter((r) => r.role === "institution_admin").length}
              icon={Users}
            />
            <StatCard
              label="الأساتذة"
              value={roleList.filter((r) => r.role === "teacher").length}
              icon={Users}
            />
            <StatCard
              label="الطلاب"
              value={roleList.filter((r) => r.role === "student").length}
              icon={Users}
            />
            <StatCard
              label="اشتراكات مقبولة"
              value={pays.filter((p) => p.status === "accepted").length}
              icon={CheckCircle2}
            />
          </div>
        </div>
      )}

      {tab === "institutions" && (
        <div className="space-y-3">
          {list.length === 0 && <EmptyState text="لا توجد مؤسسات مسجلة بعد." />}
          {list.map((inst) => (
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
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs">
                  {statusLabels[inst.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    changeStatus.mutate({ institutionId: inst.id, status: "active" })
                  }
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
                  onClick={() =>
                    changeStatus.mutate({ institutionId: inst.id, status: "expired" })
                  }
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

      {tab === "payments" && (
        <div className="space-y-3">
          {pays.length === 0 && <EmptyState text="لا توجد طلبات دفع." />}
          {pays.map((p) => (
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
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs">
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
          {(contracts.data ?? []).length === 0 && <EmptyState text="لا توجد عقود بعد." />}
          {(contracts.data ?? []).map((c) => (
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
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs">
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
                    onClick={() =>
                      changeContract.mutate({ contractId: c.id, status: "cancelled" })
                    }
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
                الحالة: {r.status === "pending" ? "🟡 معلّق" : r.status === "resolved" ? "🟢 تمت المعالجة" : "🔴 مرفوض"}
                {r.temp_code ? ` · الرمز المؤقت: ${r.temp_code}` : ""}
              </p>
              {r.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      resolveReset.mutate({ requestId: r.id, action: "temp_code" })
                    }
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
          {(profiles.data ?? []).length === 0 && <EmptyState text="لا يوجد مستخدمون." />}
          {(profiles.data ?? []).map((p) => (
            <div key={p.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="font-semibold">
                {p.first_name} {p.last_name}
              </span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {p.email}
              </span>
              <span className="ms-auto rounded-md bg-secondary px-2 py-1 text-xs">
                {(p.institutions as { name: string } | null)?.name ?? "بدون مؤسسة"}
              </span>
            </div>
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
