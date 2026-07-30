import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function institutionAdminContext(context: { userId: string; supabase: any }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("institution_id")
    .eq("user_id", context.userId)
    .eq("role", "institution_admin")
    .maybeSingle();
  if (!data?.institution_id) throw new Error("غير مسموح: هذه العملية لمدير المؤسسة فقط.");
  return data.institution_id as string;
}

async function requirePlatformAdmin(context: { userId: string; supabase: any }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!data) throw new Error("غير مسموح: مدير المنصة فقط.");
}

function contractNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SDZ-${year}-${rand}`;
}

async function logEvent(
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

/** Stage 1 — institution admin creates the contract from stored data. */
export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ agreed: z.literal(true), commercialRegister: z.string().max(60).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const institutionId = await institutionAdminContext(context as any);

    const { data: open } = await supabaseAdmin
      .from("contracts")
      .select("id")
      .eq("institution_id", institutionId)
      .in("status", ["created", "awaiting_institution", "awaiting_platform", "approved", "renewed"])
      .maybeSingle();
    if (open) throw new Error("يوجد عقد ساري أو قيد المعالجة لهذه المؤسسة.");

    if (data.commercialRegister) {
      await supabaseAdmin
        .from("institutions")
        .update({ commercial_register: data.commercialRegister })
        .eq("id", institutionId);
    }

    const [{ data: institution }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("institutions").select("*").eq("id", institutionId).maybeSingle(),
      supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (!institution) throw new Error("لم يتم العثور على بيانات المؤسسة.");

    const snapshot = {
      institution_name: institution.name,
      institution_type: institution.type,
      wilaya: institution.wilaya,
      commune: institution.commune,
      address: institution.address ?? "",
      commercial_register: data.commercialRegister ?? institution.commercial_register ?? "",
      manager_name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
      manager_email: profile?.email ?? institution.email,
      manager_phone: profile?.phone ?? institution.phone,
      amount: CONTRACT_AMOUNT,
      duration_months: CONTRACT_MONTHS,
      created_on: new Date().toISOString(),
    };

    const number = contractNumber();
    const { data: created, error } = await supabaseAdmin
      .from("contracts")
      .insert({
        institution_id: institutionId,
        contract_number: number,
        status: "awaiting_institution",
        amount: CONTRACT_AMOUNT,
        duration_months: CONTRACT_MONTHS,
        snapshot,
        body: `عقد اشتراك سنوي رقم ${number} بين إدارة منصة Study DZ ومؤسسة «${institution.name}» ممثلة في مديرها ${snapshot.manager_name}، مدته ${CONTRACT_MONTHS} شهرًا بقيمة ${CONTRACT_AMOUNT} دج.`,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logEvent(supabaseAdmin, created.id, institutionId, "created", "تم إنشاء العقد", context.userId);
    await logEvent(
      supabaseAdmin,
      created.id,
      institutionId,
      "awaiting_institution",
      "بانتظار توقيع مدير المؤسسة",
      context.userId,
    );
    return { contractId: created.id, contractNumber: number };
  });

/** Stage 3 — institution admin signs. */
export const signContractAsInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        signature: z.string().startsWith("data:image/png;base64,").max(2_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const institutionId = await institutionAdminContext(context as any);

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id, institution_id, status, institution_signature")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract || contract.institution_id !== institutionId) throw new Error("غير مسموح.");
    if (contract.institution_signature) throw new Error("تم اعتماد التوقيع مسبقًا ولا يمكن تعديله.");

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        institution_signature: data.signature,
        institution_signed_at: new Date().toISOString(),
        status: "awaiting_platform",
      })
      .eq("id", contract.id);
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      contract.id,
      institutionId,
      "awaiting_platform",
      "وقّع مدير المؤسسة — بانتظار توقيع Study DZ",
      context.userId,
    );
    return { ok: true as const };
  });

/** Stage 5 + 6 — platform admin signs, contract is approved and the subscription activates. */
export const signContractAsPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        signature: z.string().startsWith("data:image/png;base64,").max(2_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(context as any);

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract) throw new Error("العقد غير موجود.");
    if (contract.platform_signature) throw new Error("تم اعتماد التوقيع مسبقًا.");
    if (!contract.institution_signature) throw new Error("لم يوقّع مدير المؤسسة بعد.");

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + (contract.duration_months ?? 12));
    const expiresAt = expires.toISOString().slice(0, 10);

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        platform_signature: data.signature,
        platform_signed_at: now.toISOString(),
        approved_at: now.toISOString(),
        signed_at: now.toISOString(),
        status: "approved",
        expires_at: expiresAt,
        qr_payload: `STUDYDZ|${contract.contract_number}|${contract.institution_id}|${now
          .toISOString()
          .slice(0, 10)}`,
      })
      .eq("id", contract.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("institutions")
      .update({ status: "active", subscription_end: expiresAt })
      .eq("id", contract.institution_id);

    await logEvent(
      supabaseAdmin,
      contract.id,
      contract.institution_id,
      "approved",
      "تم اعتماد العقد وتفعيل الاشتراك السنوي",
      context.userId,
    );
    return { ok: true as const };
  });

export const setContractStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        status: z.enum(["renewed", "expired", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(context as any);

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id, institution_id, duration_months")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract) throw new Error("العقد غير موجود.");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "renewed") {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + (contract.duration_months ?? 12));
      patch.expires_at = expires.toISOString().slice(0, 10);
      await supabaseAdmin
        .from("institutions")
        .update({ status: "active", subscription_end: patch.expires_at })
        .eq("id", contract.institution_id);
    }
    if (data.status === "expired" || data.status === "cancelled") {
      await supabaseAdmin
        .from("institutions")
        .update({ status: data.status === "expired" ? "expired" : "suspended" })
        .eq("id", contract.institution_id);
    }

    const { error } = await supabaseAdmin.from("contracts").update(patch).eq("id", contract.id);
    if (error) throw new Error(error.message);

    const notes: Record<string, string> = {
      renewed: "تم تجديد العقد",
      expired: "انتهت مدة العقد",
      cancelled: "تم إلغاء العقد",
    };
    await logEvent(
      supabaseAdmin,
      contract.id,
      contract.institution_id,
      data.status,
      notes[data.status],
      context.userId,
    );
    return { ok: true as const };
  });
