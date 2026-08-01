export const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

/** أيام الدراسة الافتراضية في الجزائر (الجمعة والسبت اختياريان). */
export const DEFAULT_STUDY_DAYS = [0, 1, 2, 3, 4];
export const OPTIONAL_STUDY_DAYS = [5, 6];

export interface Period {
  index: number;
  label: string;
  start: string;
  end: string;
}

export const PERIODS: Period[] = [
  { index: 1, label: "الحصة الأولى", start: "08:00", end: "09:00" },
  { index: 2, label: "الحصة الثانية", start: "09:00", end: "10:00" },
  { index: 3, label: "الحصة الثالثة", start: "10:15", end: "11:15" },
  { index: 4, label: "الحصة الرابعة", start: "11:15", end: "12:15" },
  { index: 5, label: "الحصة الخامسة", start: "13:00", end: "14:00" },
  { index: 6, label: "الحصة السادسة", start: "14:00", end: "15:00" },
];

/** الاستراحة بين الحصة الثانية والثالثة. */
export const BREAK_AFTER_PERIOD = 2;
export const BREAK_LABEL = "الاستراحة (10:00 - 10:15)";

export function periodByIndex(index: number): Period | undefined {
  return PERIODS.find((p) => p.index === index);
}

export function hhmm(value?: string | null): string {
  return value ? value.slice(0, 5) : "—";
}

/** لون ثابت لكل مادة (تلوين الحصص حسب المادة). */
const SUBJECT_COLORS = [
  "bg-emerald-100 text-emerald-900 border-emerald-300",
  "bg-sky-100 text-sky-900 border-sky-300",
  "bg-amber-100 text-amber-900 border-amber-300",
  "bg-violet-100 text-violet-900 border-violet-300",
  "bg-rose-100 text-rose-900 border-rose-300",
  "bg-teal-100 text-teal-900 border-teal-300",
  "bg-indigo-100 text-indigo-900 border-indigo-300",
  "bg-lime-100 text-lime-900 border-lime-300",
];

export function subjectColor(name?: string | null): string {
  if (!name) return "bg-secondary text-foreground border-border";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export interface ScheduleRow {
  id: string;
  institution_id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  day_of_week: number;
  period_index: number;
  start_time: string;
  end_time: string | null;
  label: string | null;
  archived: boolean;
  updated_at?: string | null;
  created_at?: string | null;
  classes?: { name: string } | null;
  subjects?: { name: string } | null;
  rooms?: { name: string } | null;
}

export function todayIndex(): number {
  return new Date().getDay();
}

/** وضع عدم الاتصال: تخزين نسخة للعرض فقط صالحة 24 ساعة. */
const OFFLINE_TTL = 24 * 60 * 60 * 1000;

export function cacheSchedules(key: string, rows: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `sdz_schedule_${key}`,
      JSON.stringify({ at: Date.now(), rows }),
    );
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

export function readCachedSchedules<T>(key: string): { rows: T; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`sdz_schedule_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; rows: T };
    if (Date.now() - parsed.at > OFFLINE_TTL) return null;
    return { rows: parsed.rows, at: parsed.at };
  } catch {
    return null;
  }
}

export function printSchedule() {
  if (typeof window !== "undefined") window.print();
}
