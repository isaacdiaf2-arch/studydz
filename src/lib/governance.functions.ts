import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

async function assertPlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!data) throw new Error("غير مسموح: مدير المنصة فقط.");
}

export async function writeAudit(
  db: Admin,
  entry: {
    actorId?: string | null;
    actorRole?: string | null;
    institutionId?: string | null;
    action: string;
    resource?: string | null;
    resourceId?: string | null;
    result?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.from("audit_logs").insert({
    actor_id: entry.actorId ?? null,
    actor_role: entry.actorRole ?? null,
    institution_id: entry.institutionId ?? null,
    action: entry.action,
    resource: entry.resource ?? null,
    resource_id: entry.resourceId ?? null,
    result: entry.result ?? "success",
    metadata: (entry.metadata ?? {}) as never,
  });
}

export async function notify(
  db: Admin,
  entry: {
    recipientId: string;
    institutionId?: string | null;
    senderId?: string | null;
    type?: string;
    title: string;
    body?: string;
    link?: string | null;
  },
) {
  await db.from("notifications").insert({
    recipient_id: entry.recipientId,
    institution_id: entry.institutionId ?? null,
    sender_id: entry.senderId ?? null,
    type: entry.type ?? "system",
    title: entry.title,
    body: entry.body ?? "",
    link: entry.link ?? null,
  });
}

/** مراجعة طلب تسجيل المؤسسة: قبول / رفض / تعليق / أرشفة */
export const reviewInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        decision: z.enum(["approved", "active", "suspended", "archived", "rejected"]),
        reason: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context as never);
    const db = await admin();

    const nowIso = new Date().toISOString();
    const status = data.decision === "rejected" ? "pending" : data.decision;

    const { data: inst, error } = await db
      .from("institutions")
      .update({
        status: status as never,
        reviewed_by: context.userId,
        reviewed_at: nowIso,
        rejection_reason: data.decision === "rejected" ? (data.reason ?? "") : null,
        archived_at: data.decision === "archived" ? nowIso : null,
      })
      .eq("id", data.institutionId)
      .select("id, name, owner_id")
      .single();
    if (error) throw new Error(error.message);

    const labels: Record<string, string> = {
      approved: "تمت الموافقة على مؤسستك",
      active: "تم تفعيل مؤسستك",
      suspended: "تم تعليق حساب مؤسستك",
      archived: "تمت أرشفة مؤسستك",
      rejected: "تم رفض طلب تسجيل مؤسستك",
    };

    if (inst.owner_id) {
      await notify(db, {
        recipientId: inst.owner_id,
        institutionId: inst.id,
        senderId: context.userId,
        type: "institution",
        title: labels[data.decision],
        body: data.reason ?? "",
      });
    }

    await writeAudit(db, {
      actorId: context.userId,
      actorRole: "platform_admin",
      institutionId: inst.id,
      action: `institution.${data.decision}`,
      resource: "institutions",
      resourceId: inst.id,
      metadata: { reason: data.reason ?? null },
    });

    return { ok: true };
  });

/** إصدار فاتورة رسمية لدفعة مقبولة */
export const issueInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ paymentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context as never);
    const db = await admin();

    const { data: payment, error } = await db
      .from("payments")
      .select("id, institution_id, amount, method, status, paid_at, expires_at")
      .eq("id", data.paymentId)
      .single();
    if (error) throw new Error(error.message);
    if (payment.status !== "accepted") throw new Error("لا يمكن إصدار فاتورة لدفعة غير مقبولة.");

    const { data: existing } = await db
      .from("invoices")
      .select("id, number")
      .eq("payment_id", payment.id)
      .maybeSingle();
    if (existing) return { ok: true, number: existing.number };

    const year = new Date().getFullYear();
    const { count } = await db.from("invoices").select("id", { count: "exact", head: true });
    const number = `SDZ-${year}-${String((count ?? 0) + 1).padStart(5, "0")}`;

    const { error: insErr } = await db.from("invoices").insert({
      number,
      institution_id: payment.institution_id,
      payment_id: payment.id,
      amount: payment.amount,
      method: payment.method,
      status: "paid",
      period_start: payment.paid_at ? payment.paid_at.slice(0, 10) : null,
      period_end: payment.expires_at,
    });
    if (insErr) throw new Error(insErr.message);

    await writeAudit(db, {
      actorId: context.userId,
      actorRole: "platform_admin",
      institutionId: payment.institution_id,
      action: "invoice.issued",
      resource: "invoices",
      resourceId: number,
      metadata: { amount: payment.amount },
    });

    return { ok: true, number };
  });

/** طلب تعديل بيانات حساسة (يُراجَع من مدير المنصة) */
export const submitChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        target: z.enum(["profile", "institution", "institution_settings"]),
        institutionId: z.string().uuid().nullable().optional(),
        newValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();

    let oldValues: Record<string, unknown> = {};
    if (data.target === "profile") {
      const { data: p } = await db.from("profiles").select("*").eq("id", context.userId).maybeSingle();
      oldValues = (p ?? {}) as Record<string, unknown>;
    } else if (data.institutionId) {
      const { data: i } = await db
        .from("institutions")
        .select("*")
        .eq("id", data.institutionId)
        .maybeSingle();
      oldValues = (i ?? {}) as Record<string, unknown>;
    }

    const filteredOld: Record<string, unknown> = {};
    for (const key of Object.keys(data.newValues)) filteredOld[key] = oldValues[key] ?? null;

    const { error } = await db.from("change_requests").insert({
      requester_id: context.userId,
      institution_id: data.institutionId ?? null,
      target: data.target,
      old_values: filteredOld as never,
      new_values: data.newValues as never,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    await writeAudit(db, {
      actorId: context.userId,
      institutionId: data.institutionId ?? null,
      action: "change_request.created",
      resource: "change_requests",
      metadata: { target: data.target },
    });

    return { ok: true };
  });

/** قرار مدير المنصة على طلب التعديل */
export const reviewChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context as never);
    const db = await admin();

    const { data: req, error } = await db
      .from("change_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (error) throw new Error(error.message);
    if (req.status !== "pending") throw new Error("تمت معالجة هذا الطلب مسبقاً.");

    if (data.decision === "approved") {
      const values = req.new_values as Record<string, unknown>;
      if (req.target === "profile") {
        const allowed = ["first_name", "last_name", "phone", "email", "avatar_url"];
        const patch: Record<string, unknown> = {};
        for (const k of allowed) if (k in values) patch[k] = values[k];
        if (Object.keys(patch).length)
          await db.from("profiles").update(patch as never).eq("id", req.requester_id);
      } else if (req.institution_id) {
        const allowed = [
          "name",
          "name_fr",
          "type",
          "address",
          "wilaya",
          "commune",
          "phone",
          "email",
          "website",
          "logo_url",
          "cover_url",
          "primary_color",
          "facebook_url",
          "instagram_url",
          "maps_url",
          "accreditation_number",
          "accreditation_authority",
          "commercial_register",
          "legal_representative",
        ];
        const patch: Record<string, unknown> = {};
        for (const k of allowed) if (k in values) patch[k] = values[k];
        if (Object.keys(patch).length)
          await db.from("institutions").update(patch as never).eq("id", req.institution_id);
      }
    }

    await db
      .from("change_requests")
      .update({
        status: data.decision,
        reviewer_id: context.userId,
        reviewed_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", req.id);

    await notify(db, {
      recipientId: req.requester_id,
      institutionId: req.institution_id,
      senderId: context.userId,
      type: "change_request",
      title: data.decision === "approved" ? "تمت الموافقة على طلب التعديل" : "تم رفض طلب التعديل",
      body: data.note ?? "",
    });

    await writeAudit(db, {
      actorId: context.userId,
      actorRole: "platform_admin",
      institutionId: req.institution_id,
      action: `change_request.${data.decision}`,
      resource: "change_requests",
      resourceId: req.id,
    });

    return { ok: true };
  });
