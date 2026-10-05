import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import {
  bulkRecordResults,
  createAssessment,
  getGradebook,
  getTeachingScope,
  gradeSubmission,
  listAssessments,
  updateAssessment,
} from "@/lib/assessment.functions";

const KINDS: { v: string; l: string }[] = [
  { v: "quiz", l: "فرض" },
  { v: "test", l: "اختبار" },
  { v: "exam", l: "امتحان" },
  { v: "continuous", l: "تقييم مستمر" },
  { v: "homework", l: "واجب" },
  { v: "activity", l: "نشاط" },
  { v: "participation", l: "مشاركة" },
];
const kindLabel = (k: string) => KINDS.find((x) => x.v === k)?.l ?? k;
const sel = "h-10 rounded-md border border-input bg-background px-3 text-sm";

export function TeacherAssessmentsPanel() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "create">("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const scopeFn = useServerFn(getTeachingScope);
  const listFn = useServerFn(listAssessments);
  const createFn = useServerFn(createAssessment);
  const updateFn = useServerFn(updateAssessment);

  const scope = useQuery({ queryKey: ["t-assess", "scope"], queryFn: () => scopeFn() });
  const list = useQuery({
    queryKey: ["t-assess", "list"],
    queryFn: () => listFn({ data: { limit: 100, offset: 0 } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["t-assess"] });

  const [form, setForm] = useState({ title: "", kind: "quiz", groupId: "", moduleId: "", maxScore: 20, weight: 1, heldOn: "", dueAt: "", description: "" });
  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: form.title, kind: form.kind as never, groupId: form.groupId, moduleId: form.moduleId,
          maxScore: Number(form.maxScore), weight: Number(form.weight),
          heldOn: form.heldOn || null, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
          description: form.description || null,
        },
      }),
    onSuccess: () => { toast.success("تم إنشاء التقييم."); setView("list"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const publish = useMutation({
    mutationFn: (v: { id: string; published?: boolean; resultsPublished?: boolean }) => updateFn({ data: v }),
    onSuccess: () => { toast.success("تم التحديث."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = scope.data?.groups ?? [];
  const modules = scope.data?.modules ?? [];
  const items = (list.data?.items ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>التقييمات والواجبات</Button>
        <Button size="sm" variant={view === "create" ? "default" : "outline"} onClick={() => setView("create")}>إنشاء تقييم/واجب</Button>
      </div>

      {view === "create" && (
        groups.length === 0 || modules.length === 0 ? (
          <EmptyState text="لا توجد مواد أو أفواج مسندة إليك بعد." />
        ) : (
          <form className="card-soft grid gap-3 p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="grid gap-2 sm:col-span-2"><Label>العنوان</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid gap-2"><Label>النوع</Label>
              <select className={sel} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
              </select></div>
            <div className="grid gap-2"><Label>المادة</Label>
              <select required className={sel} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
                <option value="">—</option>
                {modules.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>
            <div className="grid gap-2"><Label>الفوج</Label>
              <select required className={sel} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">—</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}{g.levelName ? ` · ${g.levelName}` : ""}</option>)}
              </select></div>
            <div className="grid gap-2"><Label>العلامة القصوى</Label>
              <Input type="number" min={1} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} /></div>
            <div className="grid gap-2"><Label>المعامل</Label>
              <Input type="number" min={0} step={0.5} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} /></div>
            <div className="grid gap-2"><Label>التاريخ</Label>
              <Input type="date" value={form.heldOn} onChange={(e) => setForm({ ...form, heldOn: e.target.value })} /></div>
            {form.kind === "homework" && (
              <div className="grid gap-2"><Label>آخر أجل للتسليم</Label>
                <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
            )}
            <div className="grid gap-2 sm:col-span-2"><Label>التعليمات</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button type="submit" disabled={create.isPending} className="sm:col-span-2">{create.isPending ? "جارٍ…" : "إنشاء"}</Button>
          </form>
        )
      )}

      {view === "list" && (
        <div className="space-y-2">
          {items.length === 0 && <EmptyState text="لا توجد تقييمات بعد." />}
          {items.map((a) => (
            <div key={a.id} className="card-soft space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {kindLabel(a.kind)} · {a.modules?.name ?? "—"} · {a.groups?.name ?? "—"} · /{a.max_score}
                  </p>
                </div>
                <div className="ms-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                    {openId === a.id ? "إغلاق" : "العلامات والتصحيح"}
                  </Button>
                  <Button size="sm" variant={a.published ? "outline" : "default"} disabled={publish.isPending}
                    onClick={() => publish.mutate({ id: a.id, published: !a.published })}>
                    {a.published ? "إلغاء النشر" : "نشر للطلاب"}
                  </Button>
                  <Button size="sm" variant={a.results_published ? "outline" : "default"} disabled={publish.isPending || !a.published}
                    onClick={() => publish.mutate({ id: a.id, resultsPublished: !a.results_published })}>
                    {a.results_published ? "إخفاء النتائج" : "نشر النتائج"}
                  </Button>
                </div>
              </div>
              {openId === a.id && <Gradebook assessmentId={a.id} onSaved={refresh} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Gradebook({ assessmentId, onSaved }: { assessmentId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const gbFn = useServerFn(getGradebook);
  const bulkFn = useServerFn(bulkRecordResults);
  const gradeFn = useServerFn(gradeSubmission);
  const gb = useQuery({ queryKey: ["t-assess", "gb", assessmentId], queryFn: () => gbFn({ data: { assessmentId } }) });
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const isHw = gb.data?.assessment?.kind === "homework";
  const done = () => { setScores({}); qc.invalidateQueries({ queryKey: ["t-assess", "gb", assessmentId] }); onSaved(); };

  const bulk = useMutation({
    mutationFn: (entries: { studentId: string; score: number }[]) => bulkFn({ data: { assessmentId, entries } }),
    onSuccess: (r) => { toast.success(`تم تسجيل ${r.saved} علامة.`); done(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const grade = useMutation({
    mutationFn: (v: { studentId: string; score: number; feedback: string }) => gradeFn({ data: { assessmentId, ...v } }),
    onSuccess: () => { toast.success("تم التصحيح."); done(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (gb.isLoading) return <p className="text-xs text-muted-foreground">جارٍ التحميل…</p>;
  if (gb.error) return <p className="text-xs text-destructive">{(gb.error as Error).message}</p>;
  const rows = gb.data?.rows ?? [];
  if (!rows.length) return <EmptyState text="لا يوجد طلاب في هذا الفوج." />;

  return (
    <div className="space-y-2 border-t pt-2">
      {rows.map((r: any) => (
        <div key={r.studentId} className="flex flex-wrap items-start gap-2">
          <span className="min-w-[140px] font-semibold">{r.name}</span>
          <Input type="number" dir="ltr" className="w-24" min={0} placeholder={r.score != null ? String(r.score) : "—"}
            value={scores[r.studentId] ?? ""} onChange={(e) => setScores({ ...scores, [r.studentId]: e.target.value })} />
          {isHw && (
            <div className="min-w-0 flex-1 space-y-1">
              {r.submission ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    سُلّم {new Date(r.submission.submitted_at).toLocaleString("ar-DZ")}{r.submission.graded_at ? " · مصحَّح" : ""}
                  </p>
                  {r.submission.content && <p className="whitespace-pre-wrap text-xs">{r.submission.content}</p>}
                  {r.submission.file_url && <a className="text-xs underline" href={r.submission.file_url} target="_blank" rel="noreferrer">الملف المرفق</a>}
                  <Input placeholder="ملاحظات التصحيح" defaultValue={r.submission.feedback ?? ""}
                    onChange={(e) => setFeedback({ ...feedback, [r.studentId]: e.target.value })} />
                  <Button size="sm" variant="outline" disabled={grade.isPending || !scores[r.studentId]}
                    onClick={() => grade.mutate({ studentId: r.studentId, score: Number(scores[r.studentId]), feedback: feedback[r.studentId] ?? r.submission.feedback ?? "" })}>
                    تصحيح
                  </Button>
                </>
              ) : <p className="text-xs text-muted-foreground">لم يسلّم بعد</p>}
            </div>
          )}
        </div>
      ))}
      <Button size="sm" disabled={bulk.isPending} onClick={() => {
        const entries = Object.entries(scores).filter(([, v]) => v !== "").map(([studentId, v]) => ({ studentId, score: Number(v) }));
        if (!entries.length) { toast.error("أدخل علامة واحدة على الأقل."); return; }
        bulk.mutate(entries);
      }}>{bulk.isPending ? "جارٍ…" : "حفظ العلامات"}</Button>
    </div>
  );
}
