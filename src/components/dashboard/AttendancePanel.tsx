import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Clock, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard, EmptyState } from "@/components/dashboard/DashboardShell";
import {
  getAttendanceRoster,
  getAttendanceSummary,
  getLatenessLog,
  saveAttendance,
} from "@/lib/attendance.functions";

type Status = "present" | "absent" | "late" | "excused";

const STATUS_LABEL: Record<Status, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "بعذر",
};

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

export function AttendancePanel({ institutionId }: { institutionId?: string }) {
  const queryClient = useQueryClient();
  const roster = useServerFn(getAttendanceRoster);
  const save = useServerFn(saveAttendance);
  const summaryFn = useServerFn(getAttendanceSummary);
  const latenessFn = useServerFn(getLatenessLog);

  const [classId, setClassId] = useState("");
  const [sessionDate, setSessionDate] = useState(today());
  const [periodIndex, setPeriodIndex] = useState(1);
  const [draft, setDraft] = useState<Record<string, { status: Status; minutesLate: number; reason: string }>>({});
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());

  const classes = useQuery({
    queryKey: ["attendance", "classes", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("institution_id", institutionId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const sheet = useQuery({
    queryKey: ["attendance", "sheet", classId, sessionDate, periodIndex],
    enabled: !!classId,
    queryFn: async () => {
      const res = await roster({ data: { classId, sessionDate, periodIndex } });
      const initial: Record<string, { status: Status; minutesLate: number; reason: string }> = {};
      for (const s of res.students as any[]) {
        const existing = (res.records as any[]).find((r) => r.student_id === s.id);
        initial[s.id] = {
          status: (existing?.status as Status) ?? "present",
          minutesLate: existing?.minutes_late ?? 0,
          reason: existing?.reason ?? "",
        };
      }
      setDraft(initial);
      return res;
    },
  });

  const summary = useQuery({
    queryKey: ["attendance", "summary", institutionId, from, to],
    enabled: !!institutionId,
    queryFn: () => summaryFn({ data: { from, to } }),
  });

  const lateness = useQuery({
    queryKey: ["attendance", "lateness", institutionId],
    enabled: !!institutionId,
    queryFn: () => latenessFn({ data: { limit: 100 } }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(draft).map(([studentId, v]) => ({
        studentId,
        status: v.status,
        minutesLate: v.minutesLate,
        reason: v.reason || null,
      }));
      return save({ data: { classId, sessionDate, periodIndex, entries } });
    },
    onSuccess: (res) => {
      toast.success(`تم حفظ الحضور لـ ${res.saved} طالبًا.`);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر حفظ الحضور."),
  });

  const students = (sheet.data?.students ?? []) as any[];
  const totals = summary.data?.totals;

  const counts = useMemo(() => {
    const values = Object.values(draft);
    return {
      absent: values.filter((v) => v.status === "absent").length,
      late: values.filter((v) => v.status === "late").length,
    };
  }, [draft]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="حصص مسجّلة" value={totals?.sessions ?? 0} icon={CalendarClock} />
        <StatCard label="غيابات" value={totals?.absent ?? 0} icon={UserX} tone="destructive" />
        <StatCard label="تأخرات" value={totals?.late ?? 0} icon={Clock} tone="warning" />
        <StatCard label="دقائق التأخر" value={totals?.minutesLate ?? 0} icon={CheckCircle2} tone="info" />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="mb-4 text-base font-semibold">تسجيل الحضور والتأخر</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>القسم</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">اختر القسم…</option>
              {(classes.data ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>الحصة</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={periodIndex}
              onChange={(e) => setPeriodIndex(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!classId || students.length === 0 || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              حفظ الورقة
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {!classId ? (
            <EmptyState text="اختر قسمًا لعرض قائمة الطلاب وتسجيل الحضور." />
          ) : sheet.isLoading ? (
            <EmptyState text="جارٍ تحميل القائمة…" />
          ) : students.length === 0 ? (
            <EmptyState text="لا يوجد طلاب مسجلون في هذا القسم بعد." />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                غيابات: {counts.absent} — تأخرات: {counts.late} من أصل {students.length} طالبًا.
              </p>
              {students.map((s) => {
                const value = draft[s.id] ?? { status: "present" as Status, minutesLate: 0, reason: "" };
                return (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border p-3 sm:flex sm:items-center sm:gap-3"
                  >
                    <span className="block flex-1 text-sm font-medium">
                      {s.first_name} {s.last_name}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-0">
                      {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                        <Button
                          key={st}
                          type="button"
                          size="sm"
                          variant={value.status === st ? "default" : "outline"}
                          onClick={() => setDraft((d) => ({ ...d, [s.id]: { ...value, status: st } }))}
                        >
                          {STATUS_LABEL[st]}
                        </Button>
                      ))}
                    </div>
                    {value.status === "late" && (
                      <div className="mt-2 flex gap-2 sm:mt-0 sm:w-64">
                        <Input
                          type="number"
                          min={0}
                          max={600}
                          placeholder="دقائق"
                          value={value.minutesLate}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [s.id]: { ...value, minutesLate: Number(e.target.value) || 0 },
                            }))
                          }
                        />
                        <Input
                          placeholder="السبب"
                          value={value.reason}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [s.id]: { ...value, reason: e.target.value } }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h3 className="flex-1 text-base font-semibold">تقرير الحضور</h3>
          <div className="space-y-1.5">
            <Label>من</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>إلى</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(summary.data?.perStudent?.length ?? 0) === 0 ? (
          <EmptyState text="لا توجد سجلات حضور في هذه الفترة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2 font-medium">الطالب</th>
                  <th className="p-2 font-medium">حضور</th>
                  <th className="p-2 font-medium">غياب</th>
                  <th className="p-2 font-medium">تأخر</th>
                  <th className="p-2 font-medium">دقائق</th>
                </tr>
              </thead>
              <tbody>
                {(summary.data?.perStudent ?? []).map((r: any) => (
                  <tr key={r.studentId} className="border-t border-border">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.present}</td>
                    <td className="p-2">{r.absent}</td>
                    <td className="p-2">{r.late}</td>
                    <td className="p-2">{r.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="mb-4 text-base font-semibold">سجل التأخرات</h3>
        {(lateness.data?.length ?? 0) === 0 ? (
          <EmptyState text="لا توجد تأخرات مسجّلة." />
        ) : (
          <div className="space-y-2">
            {(lateness.data ?? []).map((r: any) => (
              <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{r.student_name}</span>
                  <span className="text-muted-foreground">
                    {r.session_date} — الحصة {r.period_index} — {r.minutes_late} دقيقة
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {r.classes?.name ?? "—"} {r.subjects?.name ? `• ${r.subjects.name}` : ""} • سجّلها:{" "}
                  {r.recorder_name}
                  {r.reason ? ` • السبب: ${r.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
