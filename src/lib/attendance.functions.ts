import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Attendance, absences and lateness.
 *
 * The tenant (institution_id) is always derived server-side from the caller's
 * role row — never accepted from the client — and RLS enforces the same rule at
 * the database level, so a tampered request cannot reach another institution.
 */

type Ctx = { supabase: any; userId: string };

async function requireStaff(context: Ctx) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("institution_id, role")
    .eq("user_id", context.userId)
    .in("role", ["institution_admin", "teacher"]);
  const row = (data ?? []).find((r: any) => r.institution_id);
  if (!row?.institution_id) {
    throw new Error("غير مسموح: هذه العملية مخصصة للأستاذ أو مدير المؤسسة.");
  }
  return { institutionId: row.institution_id as string, role: row.role as string };
}

async function assertOwned(context: Ctx, table: string, id: string | null | undefined, institutionId: string) {
  if (!id) return;
  const { data } = await context.supabase.from(table).select("institution_id").eq("id", id).maybeSingle();
  if (!data || data.institution_id !== institutionId) {
    throw new Error("المورد المطلوب لا ينتمي إلى مؤسستك.");
  }
}

const StatusEnum = z.enum(["present", "absent", "late", "excused"]);

/** Roster of a class plus already-recorded attendance for a given date/period. */
export const getAttendanceRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classId: z.string().uuid(),
        sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodIndex: z.number().int().min(1).max(12).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    await assertOwned(context as Ctx, "classes", data.classId, institutionId);

    const { data: enrollments, error } = await context.supabase
      .from("enrollments")
      .select("student_id")
      .eq("institution_id", institutionId)
      .eq("class_id", data.classId);
    if (error) throw new Error(error.message);

    const ids = (enrollments ?? []).map((e: any) => e.student_id);
    if (ids.length === 0) return { students: [], records: [] };

    const [{ data: profiles }, { data: records }] = await Promise.all([
      context.supabase.from("profiles").select("id, first_name, last_name").in("id", ids),
      context.supabase
        .from("attendance_records")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("session_date", data.sessionDate)
        .eq("period_index", data.periodIndex)
        .in("student_id", ids),
    ]);

    return { students: profiles ?? [], records: records ?? [] };
  });

/** Bulk save (upsert) of a session's attendance sheet. */
export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classId: z.string().uuid(),
        subjectId: z.string().uuid().nullable().optional(),
        sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodIndex: z.number().int().min(1).max(12).default(1),
        entries: z
          .array(
            z.object({
              studentId: z.string().uuid(),
              status: StatusEnum,
              minutesLate: z.number().int().min(0).max(600).default(0),
              reason: z.string().trim().max(300).optional().nullable(),
            }),
          )
          .min(1)
          .max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    await assertOwned(context as Ctx, "classes", data.classId, institutionId);
    await assertOwned(context as Ctx, "subjects", data.subjectId ?? null, institutionId);

    // Only students actually enrolled in this class may be recorded.
    const { data: enrollments } = await context.supabase
      .from("enrollments")
      .select("student_id")
      .eq("institution_id", institutionId)
      .eq("class_id", data.classId);
    const allowed = new Set((enrollments ?? []).map((e: any) => e.student_id));
    const rows = data.entries
      .filter((e) => allowed.has(e.studentId))
      .map((e) => ({
        institution_id: institutionId,
        student_id: e.studentId,
        class_id: data.classId,
        subject_id: data.subjectId ?? null,
        session_date: data.sessionDate,
        period_index: data.periodIndex,
        status: e.status,
        minutes_late: e.status === "late" ? e.minutesLate : 0,
        reason: e.reason?.trim() ? e.reason.trim() : null,
        recorded_by: context.userId,
      }));
    if (rows.length === 0) throw new Error("لا يوجد طلاب مسجلون في هذا القسم.");

    const { error } = await context.supabase
      .from("attendance_records")
      .upsert(rows, { onConflict: "institution_id,student_id,session_date,period_index" });
    if (error) throw new Error(error.message);

    return { saved: rows.length };
  });

/** Institution-wide attendance / absence / lateness statistics for a period. */
export const getAttendanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);

    const { data: records, error } = await context.supabase
      .from("attendance_records")
      .select("student_id, status, minutes_late, session_date, class_id")
      .eq("institution_id", institutionId)
      .gte("session_date", data.from)
      .lte("session_date", data.to)
      .order("session_date", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const list = records ?? [];
    const byStudent = new Map<string, { absent: number; late: number; present: number; minutes: number }>();
    for (const r of list) {
      const s = byStudent.get(r.student_id) ?? { absent: 0, late: 0, present: 0, minutes: 0 };
      if (r.status === "absent") s.absent += 1;
      else if (r.status === "late") {
        s.late += 1;
        s.minutes += r.minutes_late ?? 0;
      } else s.present += 1;
      byStudent.set(r.student_id, s);
    }

    const ids = [...byStudent.keys()];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", ids);
      names = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]),
      );
    }

    return {
      totals: {
        sessions: list.length,
        absent: list.filter((r: any) => r.status === "absent").length,
        late: list.filter((r: any) => r.status === "late").length,
        excused: list.filter((r: any) => r.status === "excused").length,
        minutesLate: list.reduce((sum: number, r: any) => sum + (r.minutes_late ?? 0), 0),
      },
      perStudent: ids
        .map((id) => ({ studentId: id, name: names[id] ?? "—", ...byStudent.get(id)! }))
        .sort((a, b) => b.absent + b.late - (a.absent + a.late)),
    };
  });

/** Detailed lateness log (item 9 — سجل التأخرات). */
export const getLatenessLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { institutionId } = await requireStaff(context as Ctx);
    const { data: rows, error } = await context.supabase
      .from("attendance_records")
      .select("*, classes(name), subjects(name)")
      .eq("institution_id", institutionId)
      .eq("status", "late")
      .order("session_date", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).flatMap((r: any) => [r.student_id, r.recorded_by].filter(Boolean)))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", ids);
      names = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()]),
      );
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      student_name: names[r.student_id] ?? "—",
      recorder_name: r.recorded_by ? (names[r.recorded_by] ?? "—") : "—",
    }));
  });
