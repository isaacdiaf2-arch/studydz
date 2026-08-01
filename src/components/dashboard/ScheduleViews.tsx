import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import {
  BREAK_AFTER_PERIOD,
  BREAK_LABEL,
  DAYS,
  PERIODS,
  hhmm,
  printSchedule,
  subjectColor,
  todayIndex,
  type ScheduleRow,
} from "@/lib/schedule";

export type ViewerRole = "teacher" | "student" | "admin";

function lineFor(row: ScheduleRow, role: ViewerRole, teacherNames: Record<string, string>) {
  const room = row.rooms?.name ? `القاعة: ${row.rooms.name}` : null;
  const klass = row.classes?.name ? `القسم: ${row.classes.name}` : null;
  const teacher = row.teacher_id ? `الأستاذ: ${teacherNames[row.teacher_id] ?? "—"}` : null;
  if (role === "teacher") return [klass, room].filter(Boolean).join(" · ");
  if (role === "student") return [teacher, room].filter(Boolean).join(" · ");
  return [klass, teacher, room].filter(Boolean).join(" · ");
}

export function SessionCard({
  row,
  role,
  teacherNames,
  actions,
}: {
  row: ScheduleRow;
  role: ViewerRole;
  teacherNames: Record<string, string>;
  actions?: React.ReactNode;
}) {
  const title = row.subjects?.name ?? row.label ?? "حصة";
  return (
    <div className={`rounded-lg border p-3 text-sm ${subjectColor(row.subjects?.name ?? row.label)}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs">
            {hhmm(row.start_time)}
            {row.end_time ? ` - ${hhmm(row.end_time)}` : ""}
          </p>
          <p className="mt-1 font-semibold">{title}</p>
          <p className="mt-0.5 text-xs opacity-80">{lineFor(row, role, teacherNames)}</p>
        </div>
        {actions && <div className="ms-auto flex shrink-0 gap-1 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

export function TodayScheduleCard({
  rows,
  role,
  teacherNames,
  offlineAt,
}: {
  rows: ScheduleRow[];
  role: ViewerRole;
  teacherNames: Record<string, string>;
  offlineAt?: number | null;
}) {
  const day = todayIndex();
  const today = rows
    .filter((r) => !r.archived && r.day_of_week === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const now = new Date().toTimeString().slice(0, 5);
  const next = today.find((r) => hhmm(r.start_time) >= now);

  return (
    <section className="card-soft p-4 print-area">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">📅 جدولي اليوم — {DAYS[day]}</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs">
          {today.length} حصة
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ms-auto print:hidden"
          onClick={printSchedule}
        >
          <Printer className="ms-1 h-4 w-4" />
          طباعة
        </Button>
      </div>
      {offlineAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          نسخة محفوظة للعرض دون اتصال (آخر مزامنة:{" "}
          {new Date(offlineAt).toLocaleString("ar-DZ")}).
        </p>
      )}
      {next && (
        <p className="mt-2 text-xs text-muted-foreground">
          الحصة القادمة: {next.subjects?.name ?? next.label ?? "حصة"} على الساعة{" "}
          {hhmm(next.start_time)}
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {today.length === 0 && <EmptyState text="لا توجد حصص اليوم." />}
        {today.map((r) => (
          <SessionCard key={r.id} row={r} role={role} teacherNames={teacherNames} />
        ))}
      </div>
    </section>
  );
}

export function WeekScheduleGrid({
  rows,
  role,
  teacherNames,
  title = "📅 جدولي الأسبوعي",
  renderActions,
}: {
  rows: ScheduleRow[];
  role: ViewerRole;
  teacherNames: Record<string, string>;
  title?: string;
  renderActions?: (row: ScheduleRow) => React.ReactNode;
}) {
  const active = rows.filter((r) => !r.archived);
  const days = Array.from(new Set(active.map((r) => r.day_of_week))).sort();

  return (
    <section className="space-y-3 print-area">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">{title}</h2>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs">
          {active.length} حصة أسبوعيًا
        </span>
        <Button size="sm" variant="outline" className="ms-auto print:hidden" onClick={printSchedule}>
          <Printer className="ms-1 h-4 w-4" />
          طباعة PDF
        </Button>
      </div>
      {active.length === 0 && <EmptyState text="الجدول فارغ." />}
      {days.map((d) => {
        const list = active
          .filter((r) => r.day_of_week === d)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return (
          <div key={d} className="card-soft p-3">
            <p className="font-display font-extrabold">{DAYS[d]}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r, i) => (
                <div key={r.id}>
                  <SessionCard
                    row={r}
                    role={role}
                    teacherNames={teacherNames}
                    actions={renderActions?.(r)}
                  />
                  {r.period_index === BREAK_AFTER_PERIOD &&
                    list[i + 1] &&
                    list[i + 1].period_index > BREAK_AFTER_PERIOD && (
                      <p className="mt-1 text-center text-[11px] text-muted-foreground">
                        ☕ {BREAK_LABEL}
                      </p>
                    )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground print:hidden">
        الحصص المعتمدة: {PERIODS.map((p) => `${p.label} (${p.start})`).join(" · ")}
      </p>
    </section>
  );
}
