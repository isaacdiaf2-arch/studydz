import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import { createAssessment, listAssessments, bulkRecordResults, getResults } from "@/lib/assessment.functions";

export function AssessmentsPanel({ institutionId }: { institutionId: string }) {
  const [tab, setTab] = useState<"list" | "create" | "results">("list");
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assessments"] });

  const modules = useQuery({
    queryKey: ["assessments", "modules", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("id, name").eq("institution_id", institutionId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const groups = useQuery({
    queryKey: ["assessments", "groups", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, name").eq("institution_id", institutionId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const listFn = useServerFn(listAssessments);
  const createFn = useServerFn(createAssessment);
  const resultsFn = useServerFn(getResults);
  const bulkFn = useServerFn(bulkRecordResults);

  const assessments = useQuery({
    queryKey: ["assessments", "list", institutionId],
    enabled: !!institutionId && tab === "list",
    queryFn: async () => listFn({ data: { limit: 100, offset: 0 } }),
  });

  const createMut = useMutation({
    mutationFn: (vars: Record<string, unknown>) => createFn({ data: vars as never }),
    onSuccess: () => {
      toast.success("تم إنشاء التقييم.");
      setTab("list");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = assessments.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "list" ? "default" : "outline"} onClick={() => setTab("list")}>
          <ClipboardList className="ms-1 h-4 w-4" /> التقييمات
        </Button>
        <Button size="sm" variant={tab === "create" ? "default" : "outline"} onClick={() => setTab("create")}>
          <Plus className="ms-1 h-4 w-4" /> إنشاء تقييم
        </Button>
        <Button size="sm" variant={tab === "results" ? "default" : "outline"} onClick={() => setTab("results")}>
          <Table2 className="ms-1 h-4 w-4" /> النتائج
        </Button>
      </div>

      {tab === "list" && (
        <div className="space-y-2">
          {items.length === 0 && <EmptyState text="لا توجد تقييمات بعد." />}
          {items.map((a: any) => (
            <div key={a.id} className="card-soft p-3 text-sm">
              <p className="font-semibold">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.kind} · العلامة القصوى {a.max_score} · {a.held_on ?? "—"}
                {(a.modules as { name: string } | null)?.name ? ` · ${a.modules.name}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "create" && (
        <CreateAssessmentForm
          modules={modules.data ?? []}
          groups={groups.data ?? []}
          onCreate={(v) => createMut.mutate(v)}
          busy={createMut.isPending}
        />
      )}

      {tab === "results" && (
        <ResultsPanel institutionId={institutionId} assessments={items} resultsFn={resultsFn} bulkFn={bulkFn} onDone={invalidate} />
      )}
    </div>
  );
}

function CreateAssessmentForm({
  modules,
  groups,
  onCreate,
  busy,
}: {
  modules: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  onCreate: (v: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    kind: "exam" as string,
    maxScore: 20,
    weight: 1,
    heldOn: "",
    moduleId: "",
    groupId: "",
  });

  return (
    <form
      className="card-soft space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({
          title: form.title,
          kind: form.kind,
          maxScore: Number(form.maxScore),
          weight: Number(form.weight),
          heldOn: form.heldOn || null,
          moduleId: form.moduleId || null,
          groupId: form.groupId || null,
        });
      }}
    >
      <h2 className="text-lg">إنشاء تقييم</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>العنوان</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>النوع</Label>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="exam">امتحان</option>
            <option value="quiz">فرض</option>
            <option value="homework">واجب</option>
            <option value="project">مشروع</option>
            <option value="oral">شفوي</option>
            <option value="practical">تطبيقي</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label>العلامة القصوى</Label>
          <Input type="number" min={1} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label>المعامل</Label>
          <Input type="number" step={0.5} min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
        </div>
        <div className="grid gap-2">
          <Label>التاريخ</Label>
          <Input type="date" value={form.heldOn} onChange={(e) => setForm({ ...form, heldOn: e.target.value })} />
        </div>
        {modules.length > 0 && (
          <div className="grid gap-2">
            <Label>الوحدة</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.moduleId}
              onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
              <option value="">—</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        {groups.length > 0 && (
          <div className="grid gap-2">
            <Label>المجموعة</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">—</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <Button type="submit" disabled={busy}>{busy ? "جارٍ…" : "إنشاء"}</Button>
    </form>
  );
}

function ResultsPanel({
  institutionId,
  assessments,
  resultsFn,
  bulkFn,
  onDone,
}: {
  institutionId: string;
  assessments: any[];
  resultsFn: any;
  bulkFn: any;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState("");
  const queryClient = useQueryClient();

  const students = useQuery({
    queryKey: ["assessments", "students", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("institution_id", institutionId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useQuery({
    queryKey: ["assessments", "results", selected],
    enabled: !!selected,
    queryFn: async () => resultsFn({ data: { assessmentId: selected, limit: 300 } }),
  });

  const [scores, setScores] = useState<Record<string, string>>({});

  const bulkMut = useMutation({
    mutationFn: (vars: { assessmentId: string; entries: { studentId: string; score: number }[] }) =>
      bulkFn({ data: vars }),
    onSuccess: (res: any) => {
      toast.success(`تم تسجيل ${res.saved} نتيجة.`);
      setScores({});
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const existing = new Map((results.data?.items ?? []).map((r: any) => [r.student_id, r.score]));

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>اختر التقييم</Label>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selected}
          onChange={(e) => { setSelected(e.target.value); setScores({}); }}>
          <option value="">—</option>
          {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>

      {selected && (students.data ?? []).length > 0 && (
        <div className="card-soft space-y-2 p-4">
          <div className="space-y-2">
            {(students.data ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-[120px] font-semibold">{s.first_name} {s.last_name}</span>
                <Input
                  type="number"
                  dir="ltr"
                  className="w-24"
                  placeholder={String(existing.get(s.id) ?? "")}
                  value={scores[s.id] ?? ""}
                  onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              const entries = Object.entries(scores)
                .filter(([, v]) => v !== "")
                .map(([studentId, v]) => ({ studentId, score: Number(v) }));
              if (entries.length === 0) { toast.error("أدخل نتيجة واحدة على الأقل."); return; }
              bulkMut.mutate({ assessmentId: selected, entries });
            }}
            disabled={bulkMut.isPending}
          >
            {bulkMut.isPending ? "جارٍ…" : "حفظ النتائج"}
          </Button>
        </div>
      )}

      {selected && (students.data ?? []).length === 0 && <EmptyState text="لا يوجد طلاب مسجلون." />}
      {!selected && <EmptyState text="اختر تقييمًا لتسجيل النتائج." />}
    </div>
  );
}
