/**
 * بنك المواد الجزائري — المنهاج الرسمي لكل الأطوار والشعب.
 * عند اختيار الطور/الشعبة تُقترح المواد تلقائياً، مع إمكانية الإضافة اليدوية.
 */

export interface CurriculumSubject {
  name: string;
  coefficient: number;
  hours?: number;
}

export interface CurriculumBranch {
  key: string;
  label: string;
  subjects: CurriculumSubject[];
}

export interface CurriculumStage {
  key: string;
  label: string;
  branches: CurriculumBranch[];
}

export const CURRICULUM: CurriculumStage[] = [
  {
    key: "primary_1_2",
    label: "السنة الأولى والثانية ابتدائي (الطور الأول)",
    branches: [
      {
        key: "general",
        label: "عام",
        subjects: [
          { name: "اللغة العربية", coefficient: 5, hours: 9 },
          { name: "الرياضيات", coefficient: 4, hours: 6 },
          { name: "التربية الإسلامية", coefficient: 2, hours: 2 },
          { name: "التربية البدنية والفنية", coefficient: 1, hours: 3 },
        ],
      },
    ],
  },
  {
    key: "primary_3",
    label: "السنة الثالثة ابتدائي",
    branches: [
      {
        key: "general",
        label: "عام",
        subjects: [
          { name: "اللغة العربية", coefficient: 5, hours: 8 },
          { name: "الرياضيات", coefficient: 4, hours: 6 },
          { name: "التربية الإسلامية", coefficient: 2, hours: 2 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "التربية العلمية والتكنولوجية", coefficient: 3, hours: 4 },
          { name: "التاريخ والجغرافيا", coefficient: 2, hours: 2 },
          { name: "التربية الفنية والموسيقية والبدنية", coefficient: 1, hours: 3 },
        ],
      },
    ],
  },
  {
    key: "primary_4_5",
    label: "السنة الرابعة والخامسة ابتدائي (الطور الثاني والثالث)",
    branches: [
      {
        key: "general",
        label: "عام",
        subjects: [
          { name: "اللغة العربية", coefficient: 5, hours: 8 },
          { name: "الرياضيات", coefficient: 4, hours: 6 },
          { name: "التربية الإسلامية", coefficient: 2, hours: 2 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 4 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "التربية العلمية والتكنولوجية", coefficient: 3, hours: 4 },
          { name: "التاريخ والجغرافيا", coefficient: 2, hours: 2 },
          { name: "التربية الفنية والموسيقية والبدنية", coefficient: 1, hours: 3 },
        ],
      },
    ],
  },
  {
    key: "middle",
    label: "الطور المتوسط (1-4)",
    branches: [
      {
        key: "general",
        label: "عام",
        subjects: [
          { name: "اللغة العربية", coefficient: 5, hours: 5 },
          { name: "الرياضيات", coefficient: 4, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 4 },
          { name: "اللغة الإنجليزية", coefficient: 3, hours: 3 },
          { name: "علوم الطبيعة والحياة", coefficient: 2, hours: 2 },
          { name: "العلوم الفيزيائية والتكنولوجيا", coefficient: 2, hours: 2 },
          { name: "التاريخ والجغرافيا", coefficient: 2, hours: 3 },
          { name: "التربية الإسلامية", coefficient: 2, hours: 1 },
          { name: "التربية المدنية", coefficient: 1, hours: 1 },
          { name: "المعلوماتية (الإعلام الآلي)", coefficient: 1, hours: 1 },
          { name: "التربية الفنية (تشكيلية أو موسيقية)", coefficient: 1, hours: 1 },
          { name: "التربية البدنية والرياضية", coefficient: 1, hours: 2 },
          { name: "اللغة الأمازيغية", coefficient: 2, hours: 2 },
        ],
      },
    ],
  },
  {
    key: "secondary",
    label: "الطور الثانوي",
    branches: [
      {
        key: "literature_philosophy",
        label: "شعبة آداب وفلسفة",
        subjects: [
          { name: "اللغة العربية", coefficient: 5, hours: 5 },
          { name: "الفلسفة", coefficient: 5, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 4 },
          { name: "اللغة الإنجليزية", coefficient: 3, hours: 4 },
          { name: "التاريخ والجغرافيا", coefficient: 3, hours: 4 },
          { name: "العلوم الإسلامية", coefficient: 2, hours: 2 },
          { name: "الرياضيات", coefficient: 2, hours: 2 },
        ],
      },
      {
        key: "foreign_languages",
        label: "شعبة لغات أجنبية",
        subjects: [
          { name: "اللغة العربية", coefficient: 4, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 5, hours: 5 },
          { name: "اللغة الإنجليزية", coefficient: 5, hours: 5 },
          { name: "لغة ثالثة (إسبانية/ألمانية/إيطالية)", coefficient: 4, hours: 4 },
          { name: "الفلسفة", coefficient: 3, hours: 3 },
          { name: "التاريخ والجغرافيا", coefficient: 2, hours: 3 },
          { name: "الرياضيات", coefficient: 2, hours: 2 },
        ],
      },
      {
        key: "experimental_sciences",
        label: "شعبة العلوم التجريبية",
        subjects: [
          { name: "العلوم الطبيعية", coefficient: 5, hours: 5 },
          { name: "الفيزياء", coefficient: 4, hours: 4 },
          { name: "الرياضيات", coefficient: 4, hours: 5 },
          { name: "اللغة العربية", coefficient: 3, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "الفلسفة", coefficient: 2, hours: 2 },
          { name: "التاريخ والجغرافيا", coefficient: 1, hours: 2 },
        ],
      },
      {
        key: "mathematics",
        label: "شعبة الرياضيات",
        subjects: [
          { name: "الرياضيات", coefficient: 7, hours: 7 },
          { name: "الفيزياء", coefficient: 5, hours: 5 },
          { name: "العلوم الطبيعية", coefficient: 4, hours: 4 },
          { name: "اللغة العربية", coefficient: 3, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "الفلسفة", coefficient: 2, hours: 2 },
          { name: "التاريخ والجغرافيا", coefficient: 1, hours: 2 },
        ],
      },
      {
        key: "engineering",
        label: "شعبة الهندسة (تقني رياضي)",
        subjects: [
          { name: "الرياضيات", coefficient: 5, hours: 6 },
          { name: "الفيزياء", coefficient: 5, hours: 5 },
          { name: "الهندسة (تكنولوجيا)", coefficient: 5, hours: 5 },
          { name: "اللغة العربية", coefficient: 3, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "الفلسفة", coefficient: 2, hours: 2 },
        ],
      },
      {
        key: "cs_ai",
        label: "شعبة المعلوماتية والذكاء الاصطناعي",
        subjects: [
          { name: "الرياضيات", coefficient: 5, hours: 6 },
          { name: "الفيزياء", coefficient: 4, hours: 4 },
          { name: "المعلوماتية والذكاء الاصطناعي", coefficient: 5, hours: 6 },
          { name: "اللغة العربية", coefficient: 3, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "الفلسفة", coefficient: 2, hours: 2 },
        ],
      },
      {
        key: "management_economics",
        label: "شعبة تسيير واقتصاد",
        subjects: [
          { name: "الاقتصاد والمناجمنت", coefficient: 5, hours: 6 },
          { name: "الرياضيات", coefficient: 4, hours: 5 },
          { name: "القانون", coefficient: 3, hours: 3 },
          { name: "اللغة العربية", coefficient: 3, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
          { name: "الفلسفة", coefficient: 2, hours: 2 },
          { name: "التاريخ والجغرافيا", coefficient: 2, hours: 2 },
        ],
      },
    ],
  },
  {
    key: "training_bt",
    label: "مراكز التكوين المهني — شهادة تقني BT (24 شهراً)",
    branches: [
      {
        key: "admin_techniques",
        label: "تقنيات الإدارة",
        subjects: [
          { name: "المحاسبة", coefficient: 4, hours: 6 },
          { name: "تسيير المخزونات", coefficient: 3, hours: 4 },
          { name: "الأمانة المكتبية والتوثيق والأرشيف", coefficient: 3, hours: 4 },
          { name: "المعلوماتية المكتبية", coefficient: 2, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 2, hours: 3 },
          { name: "اللغة العربية", coefficient: 2, hours: 2 },
          { name: "رياضيات التسيير", coefficient: 2, hours: 3 },
        ],
      },
      {
        key: "craft_commerce",
        label: "التقنيات الحرفية والتجارية",
        subjects: [
          { name: "بائع تجاري", coefficient: 4, hours: 6 },
          { name: "صيانة التجهيزات المعلوماتية", coefficient: 4, hours: 6 },
          { name: "البنوك", coefficient: 3, hours: 4 },
          { name: "التأمينات", coefficient: 3, hours: 4 },
          { name: "المعلوماتية", coefficient: 2, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 2, hours: 3 },
          { name: "اللغة العربية", coefficient: 2, hours: 2 },
        ],
      },
    ],
  },
  {
    key: "training_qualifying",
    label: "التكوين التأهيلي — شهادة كفاءة مهنية مخففة (3-6 أشهر)",
    branches: [
      {
        key: "beauty",
        label: "الحلاقة والتجميل",
        subjects: [
          { name: "حلاقة وتجميل النساء", coefficient: 5, hours: 8 },
          { name: "حلاقة الرجال", coefficient: 5, hours: 8 },
          { name: "الطلاء والتزيين", coefficient: 3, hours: 4 },
          { name: "الصحة والسلامة المهنية", coefficient: 2, hours: 2 },
        ],
      },
      {
        key: "construction",
        label: "البناء والتشطيب",
        subjects: [
          { name: "الطلاء والتركيب والجبس المعماري (BA13)", coefficient: 5, hours: 8 },
          { name: "الصحة والسلامة المهنية", coefficient: 2, hours: 2 },
          { name: "قراءة المخططات", coefficient: 2, hours: 3 },
        ],
      },
      {
        key: "agriculture",
        label: "الفلاحة وتربية الحيوانات",
        subjects: [
          { name: "تربية النحل", coefficient: 4, hours: 6 },
          { name: "تربية الدواجن", coefficient: 4, hours: 6 },
          { name: "الفلاحة البسيطة", coefficient: 3, hours: 4 },
          { name: "الصحة الحيوانية", coefficient: 2, hours: 3 },
        ],
      },
    ],
  },
  {
    key: "training_bts",
    label: "معاهد التكوين — شهادة تقني سامي BTS (30 شهراً)",
    branches: [
      {
        key: "it_digital",
        label: "الإعلام الآلي والرقمنة",
        subjects: [
          { name: "الأنظمة الرقمية (المعلوماتية والشبكات)", coefficient: 5, hours: 6 },
          { name: "الأمن السيبراني", coefficient: 4, hours: 5 },
          { name: "تطوير تطبيقات الويب", coefficient: 5, hours: 6 },
          { name: "قواعد البيانات", coefficient: 4, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 2, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
        ],
      },
      {
        key: "admin_management",
        label: "الإدارة والتسيير",
        subjects: [
          { name: "تسيير الموارد البشرية", coefficient: 4, hours: 5 },
          { name: "المحاسبة والمالية", coefficient: 5, hours: 6 },
          { name: "التجارة الدولية", coefficient: 4, hours: 5 },
          { name: "الأمانة والمديرية", coefficient: 3, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 2, hours: 3 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
        ],
      },
      {
        key: "industry_environment",
        label: "الصناعة والبيئة",
        subjects: [
          { name: "إلكترونيك الأنظمة المدمجة", coefficient: 5, hours: 6 },
          { name: "كفاءة الطاقة الصناعية", coefficient: 4, hours: 5 },
          { name: "تسيير النفايات الخطيرة", coefficient: 4, hours: 5 },
          { name: "نظافة وأمن وبيئة", coefficient: 3, hours: 4 },
          { name: "اللغة الفرنسية", coefficient: 2, hours: 3 },
        ],
      },
      {
        key: "services_tourism",
        label: "الخدمات والسياحة",
        subjects: [
          { name: "تسيير وإدارة الفنادق", coefficient: 5, hours: 6 },
          { name: "وكالات الأسفار", coefficient: 4, hours: 5 },
          { name: "مربية الطفولة الأولى", coefficient: 4, hours: 5 },
          { name: "اللغة الفرنسية", coefficient: 3, hours: 4 },
          { name: "اللغة الإنجليزية", coefficient: 2, hours: 3 },
        ],
      },
    ],
  },
  {
    key: "private_centers",
    label: "المراكز الخاصة (دروس الدعم وتعليم اللغات)",
    branches: [
      {
        key: "support",
        label: "دروس الدعم",
        subjects: [
          { name: "دعم اللغة العربية", coefficient: 1, hours: 2 },
          { name: "دعم الرياضيات", coefficient: 1, hours: 2 },
          { name: "دعم اللغة الفرنسية", coefficient: 1, hours: 2 },
          { name: "دعم اللغة الإنجليزية", coefficient: 1, hours: 2 },
          { name: "دعم الفيزياء", coefficient: 1, hours: 2 },
          { name: "دعم علوم الطبيعة", coefficient: 1, hours: 2 },
        ],
      },
      {
        key: "languages",
        label: "تعليم اللغات الأجنبية",
        subjects: [
          { name: "اللغة الإنجليزية", coefficient: 1, hours: 3 },
          { name: "اللغة الفرنسية", coefficient: 1, hours: 3 },
          { name: "اللغة الألمانية", coefficient: 1, hours: 3 },
          { name: "اللغة الإسبانية", coefficient: 1, hours: 3 },
          { name: "اللغة التركية", coefficient: 1, hours: 3 },
        ],
      },
    ],
  },
];

export function findStage(key: string): CurriculumStage | undefined {
  return CURRICULUM.find((s) => s.key === key);
}

export function findBranch(
  stageKey: string,
  branchKey: string,
): CurriculumBranch | undefined {
  return findStage(stageKey)?.branches.find((b) => b.key === branchKey);
}
