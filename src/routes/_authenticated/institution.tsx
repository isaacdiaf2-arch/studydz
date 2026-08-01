import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FileSignature,
  GraduationCap,
  Megaphone,
  Settings,
  Users,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardShell, StatCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { SignaturePad } from "@/components/dashboard/SignaturePad";
import { useAccount } from "@/lib/account";
import { SchedulesManager } from "@/components/dashboard/SchedulesManager";
import { createMember, deleteMember, transferStudent } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/institution")({
  component: InstitutionDashboard,
});

const nav = [
  { key: "home", label: "الرئيسية", icon: BarChart3 },
  { key: "teachers", label: "الأساتذة", icon: Users },
  { key: "students", label: "الطلاب", icon: GraduationCap },
  { key: "classes", label: "الأقسام", icon: Building2 },
  { key: "subjects", label: "المواد", icon: BookOpen },
  { key: "schedule", label: "الجدول", icon: CalendarDays },
  { key: "announcements", label: "الإعلانات", icon: Megaphone },
  { key: "subscription", label: "الاشتراك", icon: CreditCard },
  { key: "contract", label: "العقد", icon: FileSignature },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

function InstitutionDashboard() {
  const [tab, setTab] = useState("home");
  const queryClient = useQueryClient();
  const account = useAccount();
  const institutionId = account.data?.profile?.institution_id as string | undefined;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["institution"] });

  const members = useQuery({
    queryKey: ["institution", "members", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("institution_id", institutionId!);
      if (error) throw error;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("institution_id", institutionId!);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const classes = useQuery({
    queryKey: ["institution", "classes", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("institution_id", institutionId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const subjects = useQuery({
    queryKey: ["institution", "subjects", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, classes(name)")
        .eq("institution_id", institutionId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const announcements = useQuery({
    queryKey: ["institution", "announcements", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("institution_id", institutionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const payments = useQuery({
    queryKey: ["institution", "payments", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("institution_id", institutionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const contract = useQuery({
    queryKey: ["institution", "contract", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("institution_id", institutionId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createMemberFn = useServerFn(createMember);
  const deleteMemberFn = useServerFn(deleteMember);
  const transferFn = useServerFn(transferStudent);

  const addMember = useMutation({
    mutationFn: (vars: Parameters<typeof createMember>[0] extends never ? never : Record<string, unknown>) =>
      createMemberFn({ data: vars as never }),
    onSuccess: () => {
      toast.success("تمت إضافة الحساب.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => deleteMemberFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("تم حذف الحساب.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: (vars: { studentId: string; targetInstitutionId: string }) =>
      transferFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحويل الطالب.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const teachers = (members.data ?? []).filter((m) => m.role === "teacher");
  const students = (members.data ?? []).filter((m) => m.role === "student");
  const institution = account.data?.institution;

  return (
    <DashboardShell
      title={institution?.name ?? "لوحة مدير المؤسسة"}
      nav={nav}
      active={tab}
      onChange={setTab}
    >
      {tab === "home" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="الأساتذة" value={teachers.length} icon={Users} />
            <StatCard label="الطلاب" value={students.length} icon={GraduationCap} />
            <StatCard label="الأقسام" value={classes.data?.length ?? 0} icon={Building2} />
            <StatCard label="المواد" value={subjects.data?.length ?? 0} icon={BookOpen} />
          </div>
          <div className="card-soft p-4 text-sm">
            <p className="font-semibold">حالة الاشتراك</p>
            <p className="mt-1 text-muted-foreground">
              {institution?.status === "active"
                ? `نشط — ينتهي في ${institution?.subscription_end ?? "—"}`
                : institution?.status === "pending"
                  ? "🟡 حسابك قيد المراجعة — أرسل إثبات الدفع من تبويب الاشتراك."
                  : institution?.status === "suspended"
                    ? "🟠 الحساب موقوف مؤقتًا. جدّد الاشتراك للعودة، ولن تُحذف أي بيانات."
                    : "🔴 الاشتراك منتهٍ. البيانات محفوظة، جدّد للعودة."}
            </p>
          </div>
        </div>
      )}

      {tab === "teachers" && (
        <MemberSection
          title="إضافة أستاذ"
          role="teacher"
          list={teachers}
          classes={[]}
          onAdd={(v) => addMember.mutate(v)}
          onDelete={(id) => removeMember.mutate(id)}
        />
      )}

      {tab === "students" && (
        <div className="space-y-6">
          <MemberSection
            title="إضافة طالب"
            role="student"
            list={students}
            classes={classes.data ?? []}
            onAdd={(v) => addMember.mutate(v)}
            onDelete={(id) => removeMember.mutate(id)}
          />
          <TransferSection
            students={students}
            onTransfer={(studentId, targetInstitutionId) =>
              transfer.mutate({ studentId, targetInstitutionId })
            }
          />
        </div>
      )}

      {tab === "classes" && institutionId && (
        <ClassesSection institutionId={institutionId} classes={classes.data ?? []} onDone={invalidate} />
      )}

      {tab === "subjects" && institutionId && (
        <SubjectsSection
          institutionId={institutionId}
          classes={classes.data ?? []}
          teachers={teachers}
          subjects={subjects.data ?? []}
          onDone={invalidate}
        />
      )}

      {tab === "schedule" && institutionId && (
        <SchedulesManager
          institutionId={institutionId}
          classes={classes.data ?? []}
          subjects={subjects.data ?? []}
          teachers={teachers}
          onDone={invalidate}
        />
      )}


      {tab === "announcements" && institutionId && (
        <AnnouncementsSection
          institutionId={institutionId}
          classes={classes.data ?? []}
          announcements={announcements.data ?? []}
          onDone={invalidate}
        />
      )}

      {tab === "subscription" && institutionId && (
        <SubscriptionSection
          institutionId={institutionId}
          payments={payments.data ?? []}
          onDone={invalidate}
        />
      )}

      {tab === "contract" && (
        <div className="space-y-3">
          {!contract.data && <EmptyState text="لا يوجد عقد بعد." />}
          {contract.data && (
            <div className="card-soft p-4">
              <h2 className="text-lg">العقد الرقمي</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{contract.data.body}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SignaturePad
                  label="إمضاء مدير المؤسسة"
                  value={contract.data.institution_signature}
                  onSave={async (dataUrl) => {
                    const payload = `STUDYDZ-${contract.data!.id}`;
                    const { error } = await supabase
                      .from("contracts")
                      .update({
                        institution_signature: dataUrl,
                        qr_payload: payload,
                        signed_at: new Date().toISOString(),
                      })
                      .eq("id", contract.data!.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("تم حفظ الإمضاء.");
                      invalidate();
                    }
                  }}
                />
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">كود QR مكان الختم</p>
                  {contract.data.qr_payload ? (
                    <img
                      className="mt-2 h-28 w-28"
                      alt="كود QR للعقد"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(contract.data.qr_payload)}`}
                    />
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">يظهر بعد الإمضاء</p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                تُحفظ نسخة من العقد لدى مدير المؤسسة ونسخة لدى مدير المنصة.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "settings" && institution && (
        <SettingsSection institution={institution} onDone={() => account.refetch()} />
      )}
    </DashboardShell>
  );
}

type Member = { id: string; first_name: string; last_name: string; email: string; phone: string | null };

function MemberSection({
  title,
  role,
  list,
  classes,
  onAdd,
  onDelete,
}: {
  title: string;
  role: "teacher" | "student";
  list: Member[];
  classes: { id: string; name: string }[];
  onAdd: (v: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    classId: "",
  });

  return (
    <div className="space-y-4">
      <form
        className="card-soft space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd({
            ...form,
            role,
            classId: form.classId || null,
          });
          setForm({ firstName: "", lastName: "", email: "", phone: "", password: "", classId: "" });
        }}
      >
        <h2 className="text-lg">{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Field label="اللقب" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
          <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field label="رقم الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          <Field label="كلمة المرور (8 أحرف على الأقل)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          {classes.length > 0 && (
            <div className="grid gap-2">
              <Label>القسم</Label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                <option value="">بدون قسم</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Button type="submit">إضافة</Button>
      </form>

      <div className="space-y-2">
        {list.length === 0 && <EmptyState text="لا توجد حسابات بعد." />}
        {list.map((m) => (
          <div key={m.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="font-semibold">
              {m.first_name} {m.last_name}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {m.email} · {m.phone}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="ms-auto"
              aria-label="حذف"
              onClick={() => onDelete(m.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransferSection({
  students,
  onTransfer,
}: {
  students: Member[];
  onTransfer: (studentId: string, targetInstitutionId: string) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [target, setTarget] = useState("");
  return (
    <form
      className="card-soft space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onTransfer(studentId, target);
      }}
    >
      <h2 className="text-lg">تحويل طالب إلى مؤسسة أخرى</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>الطالب</Label>
          <select
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">اختر الطالب</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="معرّف المؤسسة الجديدة"
          value={target}
          onChange={setTarget}
          required
        />
      </div>
      <Button type="submit" variant="outline">
        تحويل
      </Button>
    </form>
  );
}

function ClassesSection({
  institutionId,
  classes,
  onDone,
}: {
  institutionId: string;
  classes: { id: string; name: string; stage: string | null; stream: string | null; specialty: string | null }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({ name: "", stage: "", stream: "", specialty: "" });
  return (
    <div className="space-y-4">
      <form
        className="card-soft space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("classes").insert({
            institution_id: institutionId,
            name: form.name,
            stage: form.stage || null,
            stream: form.stream || null,
            specialty: form.specialty || null,
          });
          if (error) toast.error(error.message);
          else {
            toast.success("تمت إضافة القسم.");
            setForm({ name: "", stage: "", stream: "", specialty: "" });
            onDone();
          }
        }}
      >
        <h2 className="text-lg">إضافة قسم</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم القسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="الطور (ابتدائي / متوسط / ثانوي / تكوين)" value={form.stage} onChange={(v) => setForm({ ...form, stage: v })} />
          <Field label="الشعبة" value={form.stream} onChange={(v) => setForm({ ...form, stream: v })} />
          <Field label="التخصص" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} />
        </div>
        <Button type="submit">إضافة القسم</Button>
      </form>
      <div className="space-y-2">
        {classes.length === 0 && <EmptyState text="لا توجد أقسام." />}
        {classes.map((c) => (
          <div key={c.id} className="card-soft p-3 text-sm">
            <p className="font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {[c.stage, c.stream, c.specialty].filter(Boolean).join(" — ") || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectsSection({
  institutionId,
  classes,
  teachers,
  subjects,
  onDone,
}: {
  institutionId: string;
  classes: { id: string; name: string }[];
  teachers: Member[];
  subjects: { id: string; name: string; teacher_id: string | null; classes: { name: string } | null }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({ name: "", classId: "", teacherId: "" });
  return (
    <div className="space-y-4">
      <form
        className="card-soft space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("subjects").insert({
            institution_id: institutionId,
            name: form.name,
            class_id: form.classId || null,
            teacher_id: form.teacherId || null,
          });
          if (error) toast.error(error.message);
          else {
            toast.success("تمت إضافة المادة وربطها بالأستاذ.");
            setForm({ name: "", classId: "", teacherId: "" });
            onDone();
          }
        }}
      >
        <h2 className="text-lg">إضافة مادة وربطها بأستاذ</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="اسم المادة" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <div className="grid gap-2">
            <Label>القسم</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">بدون قسم</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>الأستاذ</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            >
              <option value="">بدون أستاذ</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit">إضافة المادة</Button>
      </form>
      <div className="space-y-2">
        {subjects.length === 0 && <EmptyState text="لا توجد مواد." />}
        {subjects.map((s) => (
          <div key={s.id} className="card-soft p-3 text-sm">
            <p className="font-semibold">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.classes?.name ?? "بدون قسم"} —{" "}
              {teachers.find((t) => t.id === s.teacher_id)
                ? `${teachers.find((t) => t.id === s.teacher_id)!.first_name} ${teachers.find((t) => t.id === s.teacher_id)!.last_name}`
                : "بدون أستاذ"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsSection({
  institutionId,
  classes,
  announcements,
  onDone,
}: {
  institutionId: string;
  classes: { id: string; name: string }[];
  announcements: { id: string; title: string; body: string; created_at: string }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({ title: "", body: "", classId: "" });
  return (
    <div className="space-y-4">
      <form
        className="card-soft space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { data: userData } = await supabase.auth.getUser();
          const { error } = await supabase.from("announcements").insert({
            institution_id: institutionId,
            author_id: userData.user!.id,
            class_id: form.classId || null,
            title: form.title,
            body: form.body,
          });
          if (error) toast.error(error.message);
          else {
            toast.success("تم نشر الإعلان.");
            setForm({ title: "", body: "", classId: "" });
            onDone();
          }
        }}
      >
        <h2 className="text-lg">إعلان جديد</h2>
        <Field label="العنوان" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
        <div className="grid gap-2">
          <Label>المحتوى</Label>
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        </div>
        <div className="grid gap-2">
          <Label>إرسال إلى</Label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
          >
            <option value="">كل المؤسسة</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">نشر الإعلان</Button>
      </form>
      <div className="space-y-2">
        {announcements.length === 0 && <EmptyState text="لا توجد إعلانات." />}
        {announcements.map((a) => (
          <div key={a.id} className="card-soft p-3 text-sm">
            <p className="font-semibold">{a.title}</p>
            <p className="mt-1 leading-7 text-muted-foreground">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionSection({
  institutionId,
  payments,
  onDone,
}: {
  institutionId: string;
  payments: { id: string; amount: number; paid_at: string; status: string; expires_at: string | null }[];
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="card-soft p-4 text-sm">
        <h2 className="text-lg">معلومات الدفع عبر CCP</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">المستفيد</dt>
            <dd dir="ltr" className="font-semibold">ishak diaf</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">N° CCP</dt>
            <dd dir="ltr" className="font-semibold">0042451103</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Clé</dt>
            <dd dir="ltr" className="font-semibold">65</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          تنبيه هام: بعد إتمام الدفع (Versement) لدى مكتب البريد، اكتب اسم مؤسستك على الوصل، ثم
          صوّره وارفعه هنا لتأكيد المعاملة وتفعيل الحساب خلال 24 ساعة.
        </p>
      </div>

      <form
        className="card-soft space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setBusy(true);
          const { data: userData } = await supabase.auth.getUser();
          const path = `${userData.user!.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("payment-proofs")
            .upload(path, file);
          if (upErr) {
            setBusy(false);
            toast.error(upErr.message);
            return;
          }
          const { error } = await supabase.from("payments").insert({
            institution_id: institutionId,
            amount: 8000,
            method: "CCP",
            paid_at: paidAt,
            proof_url: path,
          });
          setBusy(false);
          if (error) toast.error(error.message);
          else {
            toast.success("🟡 تم إرسال الطلب وهو قيد المراجعة.");
            setFile(null);
            onDone();
          }
        }}
      >
        <h2 className="text-lg">رفع وصل الدفع (8,000 دج)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="paid-at">تاريخ الدفع</Label>
            <Input id="paid-at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proof">إثبات الدفع (صورة أو PDF)</Label>
            <Input
              id="proof"
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "جارٍ الإرسال…" : "إرسال إثبات الدفع"}
        </Button>
      </form>

      <div className="space-y-2">
        {payments.length === 0 && <EmptyState text="لا توجد طلبات دفع." />}
        {payments.map((p) => (
          <div key={p.id} className="card-soft p-3 text-sm">
            <p className="font-semibold">
              {Number(p.amount).toLocaleString("en-US")} دج — {p.paid_at}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.status === "pending" && "🟡 قيد المراجعة"}
              {p.status === "accepted" && `🟢 مقبول — ينتهي في ${p.expires_at}`}
              {p.status === "rejected" && "🔴 مرفوض"}
              {p.status === "suspended" && "🟠 موقوف"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSection({
  institution,
  onDone,
}: {
  institution: { id: string; name: string; logo_url: string | null; primary_color: string | null };
  onDone: () => void;
}) {
  const [name, setName] = useState(institution.name);
  const [logo, setLogo] = useState(institution.logo_url ?? "");
  const [color, setColor] = useState(institution.primary_color ?? "");
  return (
    <form
      className="card-soft space-y-4 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase
          .from("institutions")
          .update({ name, logo_url: logo || null, primary_color: color || null })
          .eq("id", institution.id);
        if (error) toast.error(error.message);
        else {
          toast.success("تم حفظ إعدادات المؤسسة.");
          onDone();
        }
      }}
    >
      <h2 className="text-lg">إعدادات المؤسسة</h2>
      <Field label="اسم المؤسسة" value={name} onChange={setName} required />
      <Field label="رابط الشعار" value={logo} onChange={setLogo} />
      <Field label="اللون الأساسي (مثال: #111111)" value={color} onChange={setColor} />
      {logo && <img src={logo} alt="شعار المؤسسة" className="h-16 w-16 rounded-md object-contain" />}
      <Button type="submit">حفظ</Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        dir={type === "email" ? "ltr" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
