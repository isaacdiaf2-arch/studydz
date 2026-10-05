import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, FileText, Megaphone, Table2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardShell, StatCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { useAccount } from "@/lib/account";
import { useScheduleView } from "@/lib/useScheduleView";
import { TodayScheduleCard, WeekScheduleGrid } from "@/components/dashboard/ScheduleViews";
import { getExamForStudent, submitExam } from "@/lib/exam.functions";
import { listStudentAssessments, submitHomework } from "@/lib/assessment.functions";


export const Route = createFileRoute("/_authenticated/student")({
  component: StudentDashboard,
});

const nav = [
  { key: "home", label: "الرئيسية", icon: BarChart3 },
  { key: "schedule", label: "جدولي", icon: CalendarDays },
  { key: "subjects", label: "موادي", icon: BookOpen },
  { key: "lessons", label: "دروسي", icon: FileText },
  { key: "exams", label: "الاختبارات", icon: ClipboardList },
  { key: "assessments", label: "التقييمات والواجبات", icon: ClipboardCheck },
  { key: "results", label: "نتائجي", icon: Table2 },
  { key: "announcements", label: "الإعلانات", icon: Megaphone },
];

function StudentDashboard() {
  const [tab, setTab] = useState("home");
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const account = useAccount();
  const queryClient = useQueryClient();
  const userId = account.data?.user?.id;
  const institutionId = account.data?.profile?.institution_id as string | undefined;

  const enrollments = useQuery({
    queryKey: ["student", "enrollments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const classIds = (enrollments.data ?? []).map((e) => e.class_id);
  const schedule = useScheduleView({
    institutionId,
    classIds,
    cacheKey: `student_${userId ?? "anon"}`,
  });

  const subjects = useQuery({
    queryKey: ["student", "subjects", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*, classes(name)");
      if (error) throw error;
      return data;
    },
  });

  const lessons = useQuery({
    queryKey: ["student", "lessons", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(name)")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exams = useQuery({
    queryKey: ["student", "exams", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["student", "attempts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("*, exams(title, subjects(name))")
        .eq("student_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const announcements = useQuery({
    queryKey: ["student", "announcements", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (activeExam) {
    return (
      <ExamRunner
        examId={activeExam}

        onDone={() => {
          setActiveExam(null);
          queryClient.invalidateQueries({ queryKey: ["student"] });
        }}
      />
    );
  }

  const done = new Set((attempts.data ?? []).map((a) => a.exam_id));

  return (
    <DashboardShell title="لوحة الطالب" nav={nav} active={tab} onChange={setTab}>
      {tab === "home" && (
        <div className="space-y-4">
          <p className="text-lg">مرحبًا، {account.data?.profile?.first_name} 👋</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="المؤسسة" value={account.data?.institution?.name ?? "—"} icon={BookOpen} />
            <StatCard label="المواد" value={subjects.data?.length ?? 0} icon={BookOpen} />
            <StatCard label="الدروس" value={lessons.data?.length ?? 0} icon={FileText} />
            <StatCard
              label="اختبارات قادمة"
              value={(exams.data ?? []).filter((e) => !done.has(e.id)).length}
              icon={ClipboardList}
            />
          </div>
          <TodayScheduleCard
            rows={schedule.rows}
            role="student"
            teacherNames={schedule.teacherNames}
            offlineAt={schedule.offlineAt}
          />
        </div>
      )}

      {tab === "schedule" && (
        <WeekScheduleGrid
          rows={schedule.rows}
          role="student"
          teacherNames={schedule.teacherNames}
          title="📅 جدولي الدراسي"
        />
      )}

      {tab === "subjects" && (
        <div className="space-y-2">
          {(subjects.data ?? []).length === 0 && <EmptyState text="لا توجد مواد." />}
          {(subjects.data ?? []).map((s) => (
            <div key={s.id} className="card-soft p-3 text-sm">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {(s.classes as { name: string } | null)?.name ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "lessons" && (
        <div className="space-y-2">
          {(lessons.data ?? []).length === 0 && <EmptyState text="لا توجد دروس منشورة." />}
          {(lessons.data ?? []).map((l) => (
            <div key={l.id} className="card-soft p-4 text-sm">
              <p className="font-semibold">{l.title}</p>
              <p className="text-xs text-muted-foreground">
                {(l.subjects as { name: string } | null)?.name ?? "—"}
              </p>
              {l.content && <p className="mt-2 leading-7">{l.content}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {l.pdf_url && (
                  <a className="text-sm underline" href={l.pdf_url} target="_blank" rel="noreferrer">
                    تحميل ملف PDF
                  </a>
                )}
                {l.video_url && (
                  <a className="text-sm underline" href={l.video_url} target="_blank" rel="noreferrer">
                    مشاهدة الفيديو
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="ms-auto"
                  onClick={async () => {
                    const { error } = await supabase.from("lesson_completions").upsert(
                      { institution_id: institutionId!, lesson_id: l.id, student_id: userId! },
                      { onConflict: "lesson_id,student_id" },
                    );
                    if (error) toast.error(error.message);
                    else toast.success("تم تحديد الدرس كمكتمل ✓");
                  }}
                >
                  ✓ تحديد كمكتمل
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "exams" && (
        <div className="space-y-2">
          {(exams.data ?? []).length === 0 && <EmptyState text="لا توجد اختبارات." />}
          {(exams.data ?? []).map((e) => (
            <div key={e.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(e.subjects as { name: string } | null)?.name ?? "—"} · {e.duration_minutes} دقيقة
                </p>
              </div>
              <Button
                size="sm"
                className="ms-auto"
                disabled={done.has(e.id)}
                onClick={() => setActiveExam(e.id)}
              >
                {done.has(e.id) ? "تم الاجتياز" : "ابدأ الاختبار"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "assessments" && <StudentAssessments />}

      {tab === "results" && (
        <div className="space-y-2">
          {(attempts.data ?? []).length === 0 && <EmptyState text="لا توجد نتائج بعد." />}
          {(attempts.data ?? []).map((a) => (
            <div key={a.id} className="card-soft flex items-center gap-2 p-3 text-sm">
              <span className="font-semibold">{(a.exams as { title: string } | null)?.title}</span>
              <span className="ms-auto rounded-md bg-secondary px-2 py-1 text-xs">
                {a.score}/{a.max_score}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-2">
          {(announcements.data ?? []).length === 0 && <EmptyState text="لا توجد إعلانات." />}
          {(announcements.data ?? []).map((a) => (
            <div key={a.id} className="card-soft p-3 text-sm">
              <p className="font-semibold">🔔 {a.title}</p>
              <p className="mt-1 leading-7 text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function StudentAssessments() {
  const learnFn = useServerFn(listStudentAssessments);
  const submitFn = useServerFn(submitHomework);
  const [hwForm, setHwForm] = useState<Record<string, { content: string; fileUrl: string }>>({});

  const learn = useQuery({
    queryKey: ["student", "assessments"],
    queryFn: () => learnFn(),
  });

  const submitMut = useMutation({
    mutationFn: (v: { assessmentId: string; content: string; fileUrl: string }) =>
      submitFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(r.late ? "تم التسليم (متأخرًا)." : "تم تسليم الواجب.");
      learn.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (learn.data?.assessments ?? []) as any[];
  const kindLabel: Record<string, string> = {
    quiz: "فرض", test: "اختبار", exam: "امتحان", continuous: "تقييم مستمر",
    homework: "واجب", activity: "نشاط", participation: "مشاركة", project: "مشروع",
    oral: "شفوي", practical: "تطبيقي",
  };

  if (learn.isLoading) return <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>;
  if (learn.error) return <p className="text-sm text-destructive">{(learn.error as Error).message}</p>;
  if (!items.length) return <EmptyState text="لا توجد تقييمات أو واجبات منشورة بعد." />;

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const isHw = a.kind === "homework";
        const result = a.result;
        const submission = a.submission;
        const form = hwForm[a.id] ?? { content: "", fileUrl: "" };
        const graded = submission?.graded;

        return (
          <div key={a.id} className="card-soft space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{a.title}</p>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{kindLabel[a.kind] ?? a.kind}</span>
              <span className="text-xs text-muted-foreground">
                {a.modules?.name ?? "—"} · /{a.max_score}
                {a.held_on ? ` · ${a.held_on}` : ""}
                {a.due_at ? ` · أجل: ${new Date(a.due_at).toLocaleString("ar-DZ")}` : ""}
              </span>
            </div>

            {a.description && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{a.description}</p>}

            {isHw && !graded && (
              <div className="space-y-2 border-t pt-2">
                <Input
                  placeholder="نص الإجابة"
                  value={form.content}
                  onChange={(e) => setHwForm({ ...hwForm, [a.id]: { ...form, content: e.target.value } })}
                />
                <Input
                  dir="ltr"
                  placeholder="أو رابط ملف (https://…)"
                  value={form.fileUrl}
                  onChange={(e) => setHwForm({ ...hwForm, [a.id]: { ...form, fileUrl: e.target.value } })}
                />
                <Button
                  size="sm"
                  disabled={submitMut.isPending || (!form.content.trim() && !form.fileUrl.trim())}
                  onClick={() =>
                    submitMut.mutate({
                      assessmentId: a.id,
                      content: form.content.trim() || "",
                      fileUrl: form.fileUrl.trim() || "",
                    })
                  }
                >
                  {submitMut.isPending ? "جارٍ…" : "تسليم الواجب"}
                </Button>
              </div>
            )}

            {isHw && submission && (
              <div className="border-t pt-2 text-xs">
                <p className="text-muted-foreground">
                  سُلّم في {new Date(submission.submitted_at).toLocaleString("ar-DZ")}
                  {graded ? " · مصحَّح" : " · بانتظار التصحيح"}
                </p>
                {graded && result && (
                  <p className="mt-1 font-semibold">
                    العلامة: {result.score}/{a.max_score}
                    {result.note ? ` — ${result.note}` : ""}
                  </p>
                )}
                {graded && submission.feedback && (
                  <p className="mt-1 text-muted-foreground">ملاحظة الأستاذ: {submission.feedback}</p>
                )}
              </div>
            )}

            {!isHw && result && (
              <div className="border-t pt-2 text-xs">
                <p className="font-semibold">النتيجة: {result.score}/{a.max_score}</p>
                {result.note && <p className="text-muted-foreground">{result.note}</p>}
              </div>
            )}

            {!isHw && !result && (
              <p className="border-t pt-2 text-xs text-muted-foreground">لم تُنشر النتائج بعد.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExamRunner({
  examId,
  onDone,
}: {
  examId: string;
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const loadExam = useServerFn(getExamForStudent);
  const sendSubmit = useServerFn(submitExam);

  const exam = useQuery({
    queryKey: ["student", "exam", examId],
    queryFn: () => loadExam({ data: { examId } }),
  });

  const questions = exam.data?.questions ?? [];

  async function submit() {
    setBusy(true);
    try {
      const result = await sendSubmit({ data: { examId, answers } });
      toast.success(`تم تسليم الاختبار — نتيجتك ${result.score}/${result.maxScore}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسليم الاختبار.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl">{exam.data?.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        المدة: {exam.data?.duration_minutes} دقيقة — أجب عن كل الأسئلة ثم سلّم.
      </p>
      <div className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="card-soft p-4">
            <p className="font-semibold">
              {i + 1}. {q.text}
            </p>
            <div className="mt-3 grid gap-2">
              {q.options
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === o.id}
                      onChange={() => setAnswers({ ...answers, [q.id]: o.id })}
                    />
                    {o.text}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? "جارٍ التسليم…" : "تسليم الاختبار"}
        </Button>
        <Button variant="outline" onClick={onDone}>
          رجوع
        </Button>
      </div>
    </div>
  );
}
