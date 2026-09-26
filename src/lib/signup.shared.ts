import { z } from "zod";

export const INSTITUTION_TYPES = [
  "مدرسة خاصة",
  "مركز دعم",
  "معهد",
  "مركز تكوين مهني",
  "مؤسسة عامة",
  "روضة أطفال",
  "مدرسة لغات",
];

export const WILAYAS = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة",
  "تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة",
  "سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة",
  "وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة",
  "سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون",
  "برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة",
];

const dzPhone = z
  .string()
  .trim()
  .regex(/^0[5-7][0-9]{8}$/, "رقم هاتف جزائري غير صالح (مثال: 05XXXXXXXX)");

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

const optionalUrl = z
  .string()
  .trim()
  .max(400)
  .url("الرابط غير صالح")
  .optional()
  .or(z.literal(""))
  .transform((v) => v || null);

export const institutionSignupSchema = z
  .object({
    // معلومات المؤسسة
    name: z.string().trim().min(2, "اسم المؤسسة بالعربية مطلوب").max(150),
    nameFr: optionalText(150),
    type: z.string().trim().min(2, "نوع المؤسسة مطلوب").max(80),
    accreditationNumber: optionalText(80),
    commercialRegister: optionalText(80),
    accreditationAuthority: optionalText(150),
    foundedOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح")
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),
    // الموقع
    wilaya: z.string().trim().min(1, "الولاية مطلوبة").max(80),
    commune: z.string().trim().min(1, "البلدية مطلوبة").max(80),
    address: z.string().trim().min(3, "العنوان مطلوب").max(250),
    mapsUrl: optionalUrl,
    // التواصل
    phone: dzPhone,
    email: z.string().trim().email("بريد المؤسسة غير صالح").max(255),
    website: optionalUrl,
    facebookUrl: optionalUrl,
    instagramUrl: optionalUrl,
    // المدير
    firstName: z.string().trim().min(2, "الاسم مطلوب").max(80),
    lastName: z.string().trim().min(2, "اللقب مطلوب").max(80),
    managerPhone: dzPhone,
    managerEmail: z.string().trim().email("بريد المدير غير صالح").max(255),
    password: z
      .string()
      .min(10, "كلمة المرور 10 أحرف على الأقل")
      .max(72)
      .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
      .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type InstitutionSignupInput = z.input<typeof institutionSignupSchema>;
export type InstitutionSignupPayload = z.output<typeof institutionSignupSchema>;
