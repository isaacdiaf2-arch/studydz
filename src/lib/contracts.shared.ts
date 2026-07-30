export const CONTRACT_AMOUNT = 7000;
export const CONTRACT_MONTHS = 12;

export type ContractStatus =
  | "created"
  | "awaiting_institution"
  | "awaiting_platform"
  | "approved"
  | "renewed"
  | "expired"
  | "cancelled";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  created: "قيد الإنشاء",
  awaiting_institution: "بانتظار توقيع المؤسسة",
  awaiting_platform: "بانتظار توقيع المنصة",
  approved: "معتمد ومفعّل",
  renewed: "مجدَّد",
  expired: "منتهي",
  cancelled: "ملغى",
};
