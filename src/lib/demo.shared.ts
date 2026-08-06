export const DEMO_INSTITUTION_EMAIL = "demo@studydz.dz";

export type DemoRoleKey = "institution_admin" | "teacher" | "student";

export const DEMO_ACCOUNTS: Record<
  DemoRoleKey,
  { email: string; password: string; firstName: string; lastName: string; label: string; description: string }
> = {
  institution_admin: {
    email: "demo.admin@studydz.dz",
    password: "Demo@2026",
    firstName: "مدير",
    lastName: "تجريبي",
    label: "مدير مؤسسة",
    description: "إدارة الأقسام والأساتذة والطلاب والجداول والعقود.",
  },
  teacher: {
    email: "demo.teacher@studydz.dz",
    password: "Demo@2026",
    firstName: "أستاذ",
    lastName: "تجريبي",
    label: "أستاذ",
    description: "إنشاء الدروس والاختبارات ومتابعة نتائج الطلاب.",
  },
  student: {
    email: "demo.student@studydz.dz",
    password: "Demo@2026",
    firstName: "طالب",
    lastName: "تجريبي",
    label: "طالب",
    description: "متابعة الدروس واجتياز الاختبارات ومطالعة النتائج.",
  },
};
