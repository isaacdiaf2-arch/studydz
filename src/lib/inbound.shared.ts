import { z } from "zod";

export const trialRequestSchema = z.object({
  institutionName: z.string().trim().min(2, "اسم المؤسسة مطلوب").max(150),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^0[5-7][0-9]{8}$/, "رقم هاتف جزائري غير صالح (مثال: 05XXXXXXXX)"),
  motivation: z.string().trim().min(20, "اشرح دافعك في 20 حرفًا على الأقل").max(1000),
});

export const supportMessageSchema = z.object({
  firstName: z.string().trim().min(2, "الاسم مطلوب").max(80),
  lastName: z.string().trim().min(2, "اللقب مطلوب").max(80),
  institutionName: z.string().trim().max(150).optional().or(z.literal("")),
  wilaya: z.string().trim().max(80).optional().or(z.literal("")),
  commune: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^0[5-7][0-9]{8}$/, "رقم هاتف جزائري غير صالح"),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا").max(2000),
});

export type TrialRequestInput = z.infer<typeof trialRequestSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

export const SUPPORT_EMAIL = "isaacdiaf2@gmail.com";
export const SUPPORT_PHONE = "0671153558";
export const TRIAL_HOURS = 24;
