import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, StatCard } from "@/components/dashboard/DashboardShell";
import { WeekScheduleGrid } from "@/components/dashboard/ScheduleViews";
import {
  DAYS,
  DEFAULT_STUDY_DAYS,
  OPTIONAL_STUDY_DAYS,
  PERIODS,
  hhmm,
  periodByIndex,
  type ScheduleRow,
} from "@/lib/schedule";
import { CalendarDays, Clock, DoorOpen, Percent } from "lucide-react";

interface Person {
  id: string;
  first_name: string;
  last_name: string;
}

const emptyForm = {
  id: "" as string,
  classId: "",
  subjectId: "",
  teacherId: "",
  roomId: "",
  day: "0",
  period: "1",
  start: PERIODS[0].start,
  end: PERIODS[0].end,
};

export function SchedulesManager({
  institutionId,
  classes,
  subjects,
  teachers,
  onDone,
}: {
  institutionId: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string; teacher_id: string | null; class_id?: string | null }[];
  teachers: Person[];
  onDone: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");

  const teacherNames = useMemo(
    () => Object.fromEntries(teachers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])),
    [teachers],
  );

  const rooms = useQuery({
    queryKey: ["institution", "rooms", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("institution_id", institutionId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const schedules = useQuery({
    queryKey: ["institution", "schedules-full", institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, classes(name), subjects(name), rooms(name)")
        .eq("institution_id", institutionId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data as unknown as ScheduleRow[];
    },
  });

  const rows = schedules.data ?? [];
  const visible = rows.filter((r) => {
    if (r.archived !== showArchived) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [
      r.subjects?.name,
      r.classes?.name,
      r.rooms?.name,
      r.teacher_id ? teacherNames[r.teacher_id] : "",
      DAYS[r.day_of_week],
      hhmm(r.start_time),
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const activeRows = rows.filter((r) => !r.archived);
  const hours = activeRows.reduce((sum, r) => {
    if (!r.end_time) return sum + 1;
    const [sh, sm] = hhmm(r.start_time).split(":").map(Number);
    const [eh, em] = hhmm(r.end_time).split(":").map(Number);
    return sum + Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }, 0);
  const usedRooms = new Set(activeRows.map((r) => r.room_id).filter(Boolean)).size;
  const roomsTotal = (rooms.data ?? []).length;
  const occupancy = roomsTotal ? Math.round((usedRooms / roomsTotal) * 100) : 0;

  function refresh() {
    schedules.refetch();
    rooms.refetch();
    onDone();
  }

  async function notify(message: string) {
    await supabase.from("announcements").insert({
      institution_id: institutionId,
      author_id: (await supabase.auth.getUser()).data.user?.id ?? "",
      title: "📢 تعديل على الجدول الدراسي",
      body: message,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const period = periodByIndex(Number(form.period));
    const payload = {
      institution_id: institutionId,
      class_id: form.classId,
      subject_id: form.subjectId || null,
      teacher_id: form.teacherId || null,
      room_id: form.roomId || null,
      day_of_week: Number(form.day),
      period_index: Number(form.period),
      start_time: form.start || period?.start || "08:00",
      end_time: form.end || period?.end || null,
      archived: false,
    };

    // منع التعارض قبل الإرسال (الأستاذ / القاعة / القسم في نفس اليوم والتوقيت)
    const clash = rows.find(
      (r) =>
        !r.archived &&
        r.id !== form.id &&
        r.day_of_week === payload.day_of_week &&
        hhmm(r.start_time) === hhmm(payload.start_time) &&
        ((payload.teacher_id && r.teacher_id === payload.teacher_id) ||
          (payload.room_id && r.room_id === payload.room_id) ||
          r.class_id === payload.class_id),
    );
    if (clash) {
      toast.error("تعارض: الأستاذ أو القاعة أو القسم محجوز في نفس اليوم والتوقيت.");
      return;
    }

    const res = form.id
      ? await supabase.from("schedules").update(payload).eq("id", form.id)
      : await supabase.from("schedules").insert(payload);
    if (res.error) {
      toast.error(
        res.error.code === "23505"
          ? "تعارض في الحصص: هذا التوقيت محجوز مسبقًا."
          : res.error.message,
      );
      return;
    }
    const klass = classes.find((c) => c.id === form.classId)?.name ?? "";
    await notify(
      `${form.id ? "تم تعديل" : "تمت إضافة"} حصة للقسم ${klass} يوم ${DAYS[Number(form.day)]} على الساعة ${form.start}.`,
    );
    toast.success(form.id ? "تم تعديل الحصة وإشعار الجميع." : "تمت إضافة الحصة وإشعار الجميع.");
    setForm(emptyForm);
    refresh();
  }

  async function copySchedule() {
    if (!copyFrom || !copyTo || copyFrom === copyTo) {
      toast.error("اختر قسم المصدر وقسم الوجهة (مختلفين).");
      return;
    }
    const source = rows.filter((r) => !r.archived && r.class_id === copyFrom);
    if (source.length === 0) {
      toast.error("جدول القسم المصدر فارغ.");
      return;
    }
    const { error } = await supabase.from("schedules").insert(
      source.map((r) => ({
        institution_id: institutionId,
        class_id: copyTo,
        subject_id: r.subject_id,
        teacher_id: r.teacher_id,
        room_id: r.room_id,
        day_of_week: r.day_of_week,
        period_index: r.period_index,
        start_time: r.start_time,
        end_time: r.end_time,
        archived: false,
      })),
    );
    if (error) {
      toast.error(
        error.code === "23505"
          ? "تعذّر النسخ: توجد حصص متعارضة (نفس الأستاذ أو القاعة في نفس التوقيت)."
          : error.message,
      );
      return;
    }
    toast.success("تم نسخ الجدول.");
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="عدد الحصص" value={activeRows.length} icon={CalendarDays} />
        <StatCard label="عدد الساعات" value={Math.round(hours)} icon={Clock} />
        <StatCard label="القاعات المستعملة" value={`${usedRooms}/${roomsTotal}`} icon={DoorOpen} />
        <StatCard label="نسبة إشغال القاعات" value={`${occupancy}%`} icon={Percent} />
      </div>

      <form className="card-soft space-y-4 p-4 print:hidden" onSubmit={submit}>
        <h2 className="text-lg">{form.id ? "تعديل حصة" : "+ إضافة حصة إلى الجدول"}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>القسم</Label>
            <select
              required
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">اختر</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>المادة</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.subjectId}
              onChange={(e) => {
                const s = subjects.find((x) => x.id === e.target.value);
                setForm({
                  ...form,
                  subjectId: e.target.value,
                  teacherId: s?.teacher_id ?? form.teacherId,
                });
              }}
            >
              <option value="">اختر</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
              <option value="">بدون</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>القاعة</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
            >
              <option value="">بدون</option>
              {(rooms.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>اليوم</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            >
              {[...DEFAULT_STUDY_DAYS, ...OPTIONAL_STUDY_DAYS].map((i) => (
                <option key={i} value={i}>
                  {DAYS[i]}
                  {OPTIONAL_STUDY_DAYS.includes(i) ? " (اختياري)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>الحصة</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.period}
              onChange={(e) => {
                const p = periodByIndex(Number(e.target.value));
                setForm({
                  ...form,
                  period: e.target.value,
                  start: p?.start ?? form.start,
                  end: p?.end ?? form.end,
                });
              }}
            >
              {PERIODS.map((p) => (
                <option key={p.index} value={p.index}>
                  {p.label} ({p.start} - {p.end})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>البداية</Label>
            <Input
              type="time"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>النهاية</Label>
            <Input
              type="time"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Plus className="ms-1 h-4 w-4" />
            {form.id ? "حفظ التعديل" : "إضافة الحصة"}
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
              إلغاء
            </Button>
          )}
        </div>
      </form>

      <div className="card-soft space-y-3 p-4 print:hidden">
        <h2 className="text-lg">نسخ جدول قسم كامل</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>من القسم</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
            >
              <option value="">اختر</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>إلى القسم</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={copyTo}
              onChange={(e) => setCopyTo(e.target.value)}
            >
              <option value="">اختر</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={copySchedule}>
              <Copy className="ms-1 h-4 w-4" />
              نسخ الجدول
            </Button>
          </div>
        </div>
      </div>

      <RoomsSection institutionId={institutionId} rooms={rooms.data ?? []} onDone={refresh} />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input
          className="max-w-xs"
          placeholder="بحث سريع داخل الجداول…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "عرض الجداول الحالية" : "عرض الأرشيف"}
        </Button>
      </div>

      {showArchived ? (
        <div className="space-y-2">
          {visible.length === 0 && <EmptyState text="الأرشيف فارغ." />}
          {visible.map((r) => (
            <div key={r.id} className="card-soft flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="font-semibold">
                {DAYS[r.day_of_week]} {hhmm(r.start_time)}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.subjects?.name ?? "—"} · {r.classes?.name ?? "—"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ms-auto"
                onClick={async () => {
                  const { error } = await supabase
                    .from("schedules")
                    .update({ archived: false })
                    .eq("id", r.id);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("تمت الاستعادة.");
                    refresh();
                  }
                }}
              >
                <ArchiveRestore className="ms-1 h-4 w-4" />
                استعادة
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <WeekScheduleGrid
          rows={visible}
          role="admin"
          teacherNames={teacherNames}
          title="📅 الجدول الأسبوعي للمؤسسة"
          renderActions={(r) => (
            <>
              <Button
                size="icon"
                variant="ghost"
                aria-label="تعديل"
                onClick={() =>
                  setForm({
                    id: r.id,
                    classId: r.class_id,
                    subjectId: r.subject_id ?? "",
                    teacherId: r.teacher_id ?? "",
                    roomId: r.room_id ?? "",
                    day: String(r.day_of_week),
                    period: String(r.period_index),
                    start: hhmm(r.start_time),
                    end: r.end_time ? hhmm(r.end_time) : "",
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="أرشفة"
                onClick={async () => {
                  const { error } = await supabase
                    .from("schedules")
                    .update({ archived: true })
                    .eq("id", r.id);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("تمت الأرشفة.");
                    refresh();
                  }
                }}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="حذف"
                onClick={async () => {
                  const { error } = await supabase.from("schedules").delete().eq("id", r.id);
                  if (error) toast.error(error.message);
                  else {
                    await notify(
                      `تم حذف حصة ${r.subjects?.name ?? ""} من جدول ${r.classes?.name ?? ""} يوم ${DAYS[r.day_of_week]}.`,
                    );
                    toast.success("تم الحذف وإشعار الجميع.");
                    refresh();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        />
      )}
    </div>
  );
}

function RoomsSection({
  institutionId,
  rooms,
  onDone,
}: {
  institutionId: string;
  rooms: { id: string; name: string; capacity: number | null }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="card-soft space-y-3 p-4 print:hidden">
      <h2 className="text-lg">🏫 القاعات</h2>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const payload = {
            institution_id: institutionId,
            name: name.trim(),
            capacity: capacity ? Number(capacity) : null,
          };
          const res = editing
            ? await supabase.from("rooms").update(payload).eq("id", editing)
            : await supabase.from("rooms").insert(payload);
          if (res.error) {
            toast.error(
              res.error.code === "23505" ? "توجد قاعة بنفس الاسم." : res.error.message,
            );
            return;
          }
          toast.success(editing ? "تم تعديل القاعة." : "تمت إضافة القاعة.");
          setName("");
          setCapacity("");
          setEditing(null);
          onDone();
        }}
      >
        <Input required placeholder="اسم القاعة (مثال: A5)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="number"
          min={1}
          placeholder="الطاقة الاستيعابية"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <Button type="submit">{editing ? "حفظ" : "إضافة"}</Button>
      </form>
      <div className="grid gap-2 sm:grid-cols-2">
        {rooms.length === 0 && <EmptyState text="لا توجد قاعات." />}
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
            <span className="font-semibold">{r.name}</span>
            <span className="text-xs text-muted-foreground">
              {r.capacity ? `${r.capacity} مقعد` : "بدون طاقة محددة"}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="تعديل القاعة"
              className="ms-auto"
              onClick={() => {
                setEditing(r.id);
                setName(r.name);
                setCapacity(r.capacity ? String(r.capacity) : "");
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="حذف القاعة"
              onClick={async () => {
                const { error } = await supabase.from("rooms").delete().eq("id", r.id);
                if (error) toast.error(error.message);
                else {
                  toast.success("تم حذف القاعة.");
                  onDone();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
