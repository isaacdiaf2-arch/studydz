import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OFFICIAL_VERSION, OFFICIAL_CLAUSES, OFFICIAL_NOTE, PREAMBLE, contractFieldsSchema, providerSchema, signatureSchema } from "./official-contract.shared";
import { sha256, canonicalContract } from "./contract-integrity";
import { institutionAdminContext, requirePlatformAdmin } from "./contracts.server";

const legalText = [PREAMBLE, ...OFFICIAL_CLAUSES.map(c => `${c.title}\n${c.text}`), OFFICIAL_NOTE].join("\n\n");

export const listOfficialContracts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  // RLS independently scopes reads; no privileged client used for lists.
  const { data, error } = await context.supabase.from("official_contracts").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("تعذر جلب العقود.");
  return data;
});

export const getContractDefaults = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [{ data: settings }, { data: profile }] = await Promise.all([
    context.supabase.from("contract_provider_settings").select("details").eq("id", true).maybeSingle(),
    context.supabase.from("profiles").select("first_name,last_name,institution_id").eq("id", context.userId).maybeSingle(),
  ]);
  const institution = profile?.institution_id ? await context.supabase.from("institutions").select("name,address,commercial_register,legal_representative").eq("id", profile.institution_id).maybeSingle() : null;
  return { provider: settings?.details ?? null, fields: { institution_name: institution?.data?.name ?? "", address: institution?.data?.address ?? "", commercial_register: institution?.data?.commercial_register ?? "", manager_name: institution?.data?.legal_representative || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() } };
});

export const saveProviderDetails = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => providerSchema.parse(input)).handler(async ({ context, data }) => {
  await requirePlatformAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("contract_provider_settings").upsert({ id: true, details: data, updated_by: context.userId, updated_at: new Date().toISOString() });
  if (error) throw new Error("تعذر حفظ بيانات مزود الخدمة.");
  const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({ actor_id: context.userId, actor_role: "platform_admin", action: "provider_details_saved", resource: "contract_provider_settings", result: "success" });
  if (auditError) throw new Error("تعذر توثيق حفظ البيانات.");
  return { ok: true };
});

export const saveOfficialContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ fields: contractFieldsSchema, id: z.string().uuid().optional(), replaces_id: z.string().uuid().optional() }).strict().parse(input)).handler(async ({ context, data }) => {
  const institutionId = await institutionAdminContext(context);
  const { data: profile } = await context.supabase.from("profiles").select("institution_id").eq("id", context.userId).single();
  if (profile?.institution_id !== institutionId) throw new Error("403 — غير مسموح.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("contract_provider_settings").select("details").eq("id", true).maybeSingle();
  if (!settings) throw new Error("لم يستكمل مدير المنصة معلومات مزود الخدمة بعد.");
  const provider = providerSchema.parse(settings.details);
  let existing = null;
  if (data.id) {
    const result = await context.supabase.from("official_contracts").select("*").eq("id", data.id).maybeSingle();
    existing = result.data;
    if (!existing || existing.institution_id !== institutionId) throw new Error("403 — غير مسموح.");
    if (existing.state !== "draft") throw new Error("لا يمكن تعديل العقد بعد التوقيع.");
  }
  if (data.replaces_id) {
    const { data: old } = await context.supabase.from("official_contracts").select("institution_id,state").eq("id", data.replaces_id).maybeSingle();
    if (!old || old.institution_id !== institutionId || old.state !== "returned") throw new Error("403 — التصحيح يتطلب إعادة رسمية للعقد.");
  }
  const number = existing?.number ?? `SDZ-${new Date().getUTCFullYear()}-${crypto.randomUUID()}`;
  const record = { number, version: OFFICIAL_VERSION, legal_text: legalText, fields: data.fields, provider: existing?.provider ?? provider };
  const content_hash = await sha256(canonicalContract(record));
  const result = existing
    ? await supabaseAdmin.from("official_contracts").update({ fields: data.fields, content_hash }).eq("id", existing.id).eq("state", "draft").select("id").single()
    : await supabaseAdmin.from("official_contracts").insert({ ...record, institution_id: institutionId, content_hash, created_by: context.userId, replaces_id: data.replaces_id ?? null }).select("id").single();
  if (result.error) throw new Error("تعذر الحفظ؛ تحقق من عدم وجود عقد آخر قيد المعالجة.");
  const { error } = await supabaseAdmin.from("audit_logs").insert({ actor_id: context.userId, institution_id: institutionId, actor_role: "institution_admin", action: existing ? "contract_fields_updated" : "contract_created", resource: "official_contract", resource_id: result.data.id, result: "success", metadata: { content_hash, replaces_id: data.replaces_id ?? null } });
  if (error) throw new Error("تعذر توثيق العقد.");
  return { id: result.data.id };
});

export const signOfficialContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => signatureSchema.parse(input)).handler(async ({ context, data }) => {
  const { data: record } = await context.supabase.from("official_contracts").select("*").eq("id", data.id).maybeSingle();
  if (!record) throw new Error("403 — غير مسموح بالوصول إلى العقد.");
  const isPlatform = record.state === "awaiting_platform";
  if (isPlatform) await requirePlatformAdmin(context);
  else {
    const institutionId = await institutionAdminContext(context);
    if (institutionId !== record.institution_id) throw new Error("403 — غير مسموح.");
  }
  if (!['draft', 'awaiting_platform'].includes(record.state)) throw new Error("لا يمكن إعادة توقيع العقد.");
  if (record.content_hash !== data.expected_hash || await sha256(canonicalContract(record)) !== record.content_hash) throw new Error("تغير محتوى العقد؛ أعد مراجعته قبل التوقيع.");
  contractFieldsSchema.parse(record.fields); providerSchema.parse(record.provider);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // A separate auth client never replaces service identity with the signer's session.
  const { data: userResult } = await context.supabase.auth.getUser();
  const email = userResult.user?.email;
  if (!email) throw new Error("تعذر التحقق من هوية الحساب.");
  const { count } = await supabaseAdmin.from("audit_logs").select("id", { count: "exact", head: true }).eq("actor_id", context.userId).eq("action", "contract_reauth_failed").gte("created_at", new Date(Date.now()-15*60_000).toISOString());
  if ((count ?? 0) >= 5) throw new Error("تجاوزت محاولات التحقق؛ حاول بعد 15 دقيقة.");
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error("تعذر التحقق من الحساب حالياً.");
  const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const verified = await authClient.auth.signInWithPassword({ email, password: data.password });
  if (verified.error || verified.data.user?.id !== context.userId) {
    await supabaseAdmin.from("audit_logs").insert({ actor_id: context.userId, institution_id: record.institution_id, action: "contract_reauth_failed", resource: "official_contract", resource_id: record.id, result: "denied" });
    throw new Error("كلمة مرور الحساب غير صحيحة.");
  }
  const { data: profile } = await context.supabase.from("profiles").select("first_name,last_name").eq("id", context.userId).maybeSingle();
  const evidence = { actor_id: context.userId, name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || email, email, role: isPlatform ? "platform_admin" : "institution_admin", consent: true as const, signed_at: new Date().toISOString(), content_hash: record.content_hash, signature: data.signature, authentication: "password_reverified" };
  let pdf: string | undefined; let pdfHash: string | undefined;
  if (isPlatform) {
    const { buildContractPdf } = await import("./contract-pdf.server");
    const bytes = await buildContractPdf(record, evidence, new URL(getRequest().url).origin);
    pdf = Buffer.from(bytes).toString("base64"); pdfHash = await sha256(bytes);
  }
  const { error } = await supabaseAdmin.rpc("transition_official_contract", { _id: record.id, _actor: context.userId, _action: isPlatform ? "platform_sign" : "institution_sign", _hash: data.expected_hash, _evidence: evidence, _pdf: pdf, _pdf_hash: pdfHash });
  if (error) throw new Error("تعذر اعتماد التوقيع؛ أعد فتح العقد للتحقق من حالته.");
  return { ok: true };
});

export const returnOfficialContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), note: z.string().trim().min(5).max(1500), expected_hash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(input)).handler(async ({ context, data }) => {
  await requirePlatformAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("transition_official_contract", { _id: data.id, _actor: context.userId, _action: "return", _hash: data.expected_hash, _note: data.note });
  if (error) throw new Error("تعذرت إعادة العقد للتصحيح.");
  return { ok: true };
});

export const downloadOfficialContract = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input)).handler(async ({ context, data }) => {
  const { data: artifact } = await context.supabase.from("contract_artifacts").select("pdf_base64,sha256").eq("contract_id", data.id).maybeSingle();
  if (!artifact) throw new Error("403 — النسخة النهائية غير متاحة.");
  if (await sha256(new Uint8Array(Buffer.from(artifact.pdf_base64, "base64"))) !== artifact.sha256) throw new Error("فشل التحقق من سلامة النسخة؛ تم منع التنزيل.");
  return artifact;
});