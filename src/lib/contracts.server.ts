import type { ContractStatus } from "./contracts.shared";

export async function institutionAdminContext(context: { userId: string; supabase: any }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("institution_id")
    .eq("user_id", context.userId)
    .eq("role", "institution_admin")
    .maybeSingle();
  if (!data?.institution_id) throw new Error("غير مسموح: هذه العملية لمدير المؤسسة فقط.");
  return data.institution_id as string;
}

export async function requirePlatformAdmin(context: { userId: string; supabase: any }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!data) throw new Error("غير مسموح: مدير المنصة فقط.");
}

export function contractNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SDZ-${year}-${rand}`;
}

export async function logEvent(
  admin: any,
  contractId: string,
  institutionId: string,
  status: ContractStatus,
  note: string,
  actorId: string | null,
) {
  await admin.from("contract_events").insert({
    contract_id: contractId,
    institution_id: institutionId,
    status,
    note,
    actor_id: actorId,
  });
}

