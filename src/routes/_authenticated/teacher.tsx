import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, BookOpen, ClipboardList, FileText, Megaphone, Table2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardShell, StatCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { useAccount } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/teacher")({
  component: TeacherDashboard,
});

const nav = [
  { key: "home", label: "الرئيسية", icon: BarChart3 },
  { key: "subjects", label: "موادي", icon: BookOpen },
  { key: "lessons", label: "الدروس", icon: FileText },
  { key: "exams", label: "الاختبارات", icon: ClipboardList },
  { key: "results", label: "النتائج", icon: Table2 },
  { key: "announcements", label: "الإعلانات", icon: Megaphone },
];

type NewQuestion = { text: string; options: string[]; correct: number };

function TeacherDashboard() {
  const [tab, setTab] = useState("home");
  const account = useAccount();
  const queryClient = useQueryClient();
  const userId = account.data?.user?.id;
  const institutionId = account.data?.profile?.institution_id as string | undefined;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["teacher"] });

  const subjects = useQuery({
    queryKey: ["teacher", "subjects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, classes(id, name)")
        .eq("teacher_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const lessons = useQuery({
    queryKey: ["teacher", "lessons", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(name)")
        .eq("teacher_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exams = useQuery({
    queryKey: ["teacher", "exams", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name), classes(name)")
        .eq("teacher_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["teacher", "attempts", userId],
    enabled: !!userId && (exams.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (exams.data ?? []).map((e) => e.id);
      const { data, error } = await supabase
        .from("attempts")
        .select("*, exams(title), profiles:student_id(first_name, last_name)")
        .in("exam_id", ids);
      if (error) throw error;
      return data;
    },
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    pdfUrl: "",
    subjectId: "",
  });

  const [examForm, setExamForm] = useState({ title: "", description: "", duration: 30, subjectId: "" });
  const [questions, setQuestions] = useState<NewQuestion[]>([
    { text: "", options: ["", "", ""], correct: 0 },
  ]);

  return (
    <DashboardShell title="لوحة الأستاذ" nav={nav} active={tab} onChange={setTab}>
      {tab === "home" && (
        <div className="space-y-4">
          <p className="text-lg">
            مرحبًا، أستاذ {account.data?.profile?.first_name} 👋
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="موادي" value={subjects.data?.length ?? 0} icon={BookOpen} />
            <StatCard label="دروس منشورة" value={(lessons.data ?? []).filter((l) => l.published).length} icon={FileText} />
            <StatCard label="اختبارات" value={exams.data?.length ?? 0} icon={ClipboardList} />
            <StatCard label="محاولات الطلاب" value={attempts.data?.length ?? 0} icon={Table2} />
          </div>
        </div>
      )}

      {tab === "subjects" && (
        <div className="space-y-2">
          {(subjects.data ?? []).length === 0 && (
            <EmptyState text="لم يربط مدير المؤسسة أي مادة بحسابك بعد." />
          )}
          {(subjects.data ?? []).map((s) => (
            <div key={s.id} className="card-soft p-3 text-sm">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {(s.classes as { name: string } | null)?.name ?? "بدون قسم"}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "lessons" && (
        <div className="space-y-4">
          <form
            className="card-soft space-y-4 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const subject = (subjects.data ?? []).find((s) => s.id === lessonForm.subjectId);
              const { error } = await supabase.from("lessons").insert({
                institution_id: institutionId!,
                teacher_id: userId!,
                subject_id: lessonForm.subjectId || null,
                class_id: (subject?.classes as { id: string } | null)?.id ?? null,
                title: lessonForm.title,
                description: lessonForm.description,
                content: lessonForm.content,
                video_url: lessonForm.videoUrl || null,
                pdf_url: lessonForm.pdfUrl || null,
                published: true,
              });
              if (error) toast.error(error.message);
              else {
                toast.success("تم نشر الدرس.");
                setLessonForm({ title: "", description: "", content: "", videoUrl: "", pdfUrl: "", subjectId: "" });
                invalidate();
              }
            }}
          >
            <h2 className="text-lg">+ إنشاء درس</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>عنوان الدرس</Label>
                <Input required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>المادة</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={lessonForm.subjectId}
                  onChange={(e) => setLessonForm({ ...lessonForm, subjectId: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>الوصف</Label>
              <Input value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>نص الدرس</Label>
              <Textarea rows={5} value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>رابط الفيديو</Label>
                <Input dir="ltr" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>رابط ملف PDF</Label>
                <Input dir="ltr" value={lessonForm.pdfUrl} onChange={(e) => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })} />
              </div>
            </div>
            <Button type="submit">نشر الدرس</Button>
          </form>
          <div className="space-y-2">
            {(lessons.data ?? []).length === 0 && <EmptyState text="لا توجد دروس." />}
            {(lessons.data ?? []).map((l) => (
              <div key={l.id} className="card-soft p-3 text-sm">
                <p className="font-semibold">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(l.subjects as { name: string } | null)?.name ?? "—"} ·{" "}
                  {l.published ? "🟢 منشور" : "🟡 مسودة"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "exams" && (
        <div className="space-y-4">
          <form
            className="card-soft space-y-4 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const subject = (subjects.data ?? []).find((s) => s.id === examForm.subjectId);
              const { data: exam, error } = await supabase
                .from("exams")
                .insert({
                  institution_id: institutionId!,
                  teacher_id: userId!,
                  subject_id: examForm.subjectId || null,
                  class_id: (subject?.classes as { id: string } | null)?.id ?? null,
                  title: examForm.title,
                  description: examForm.description,
                  duration_minutes: examForm.duration,
                  published: true,
                })
                .select("id")
                .single();
              if (error || !exam) {
                toast.error(error?.message ?? "خطأ");
                return;
              }
              for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const { data: question, error: qErr } = await supabase
                  .from("questions")
                  .insert({
                    institution_id: institutionId!,
                    exam_id: exam.id,
                    text: q.text,
                    type: "mcq",
                    points: 1,
                    order_index: i,
                  })
                  .select("id")
                  .single();
                if (qErr || !question) continue;
                await supabase.from("options").insert(
                  q.options.map((text, idx) => ({
                    institution_id: institutionId!,
                    question_id: question.id,
                    text,
                    is_correct: idx === q.correct,
                    order_index: idx,
                  })),
                );
              }
              toast.success("تم إنشاء الاختبار ونشره للطلاب.");
              setExamForm({ title: "", description: "", duration: 30, subjectId: "" });
              setQuestions([{ text: "", options: ["", "", ""], correct: 0 }]);
              invalidate();
            }}
          >
            <h2 className="text-lg">+ إنشاء اختبار (اختيار من متعدد)</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>عنوان الاختبار</Label>
                <Input required value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>المادة</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={examForm.subjectId}
                  onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>المدة (دقيقة)</Label>
                <Input
                  type="number"
                  min={1}
                  value={examForm.duration}
                  onChange={(e) => setExamForm({ ...examForm, duration: Number(e.target.value) })}
                />
              </div>
            </div>

            {questions.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-border p-3">
                <div className="grid gap-2">
                  <Label>السؤال {qi + 1}</Label>
                  <Input
                    required
                    value={q.text}
                    onChange={(e) => {
                      const next = [...questions];
                      next[qi] = { ...q, text: e.target.value };
                      setQuestions(next);
                    }}
                  />
                </div>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correct === oi}
                        onChange={() => {
                          const next = [...questions];
                          next[qi] = { ...q, correct: oi };
                          setQuestions(next);
                        }}
                      />
                      <Input
                        required
                        placeholder={`الاقتراح ${oi + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...questions];
                          const opts = [...q.options];
                          opts[oi] = e.target.value;
                          next[qi] = { ...q, options: opts };
                          setQuestions(next);
                        }}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  حدّد الدائرة أمام الإجابة الصحيحة (ثلاث حالات، واحدة صحيحة).
                </p>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestions([...questions, { text: "", options: ["", "", ""], correct: 0 }])}
              >
                + إضافة سؤال
              </Button>
              <Button type="submit">حفظ ونشر الاختبار</Button>
            </div>
          </form>

          <div className="space-y-2">
            {(exams.data ?? []).length === 0 && <EmptyState text="لا توجد اختبارات." />}
            {(exams.data ?? []).map((ex) => (
              <div key={ex.id} className="card-soft p-3 text-sm">
                <p className="font-semibold">{ex.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(ex.subjects as { name: string } | null)?.name ?? "—"} ·{" "}
                  {(ex.classes as { name: string } | null)?.name ?? "—"} · {ex.duration_minutes} دقيقة
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-2">
          {(attempts.data ?? []).length === 0 && <EmptyState text="لا توجد نتائج بعد." />}
          {(attempts.data ?? []).map((a) => {
            const student = a.profiles as { first_name: string; last_name: string } | null;
            return (
              <div key={a.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-semibold">
                  {student?.first_name} {student?.last_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(a.exams as { title: string } | null)?.title}
                </span>
                <span className="ms-auto rounded-md bg-secondary px-2 py-1 text-xs">
                  {a.submitted_at ? `${a.score}/${a.max_score}` : "لم يُسلَّم"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "announcements" && institutionId && (
        <TeacherAnnouncements institutionId={institutionId} userId={userId!} />
      )}
    </DashboardShell>
  );
}

function TeacherAnnouncements({ institutionId, userId }: { institutionId: string; userId: string }) {
  const [form, setForm] = useState({ title: "", body: "" });
  const list = useQuery({
    queryKey: ["teacher", "announcements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="card-soft space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("announcements").insert({
            institution_id: institutionId,
            author_id: userId,
            title: form.title,
            body: form.body,
          });
          if (error) toast.error(error.message);
          else {
            toast.success("تم نشر الإعلان.");
            setForm({ title: "", body: "" });
            list.refetch();
          }
        }}
      >
        <h2 className="text-lg">إعلان جديد</h2>
        <div className="grid gap-2">
          <Label>العنوان</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>المحتوى</Label>
          <Textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <Button type="submit">نشر الإعلان</Button>
      </form>
      <div className="space-y-2">
        {(list.data ?? []).length === 0 && <EmptyState text="لا توجد إعلانات." />}
        {(list.data ?? []).map((a) => (
          <div key={a.id} className="card-soft p-3 text-sm">
            <p className="font-semibold">{a.title}</p>
            <p className="mt-1 leading-7 text-muted-foreground">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
