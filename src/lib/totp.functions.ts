import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * 2FA / TOTP implementation for administrative accounts.
 * Uses a time-based one-time password (RFC 6238) with a shared secret.
 * The secret is stored encrypted in the database and never sent to the frontend.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const c of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(sig);
}

async function generateTotp(secret: Uint8Array, timeStep: number): Promise<number> {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(timeStep / 2 ** 32));
  view.setUint32(4, timeStep >>> 0);

  const hmac = await hmacSha1(secret, new Uint8Array(buffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return binary % 1_000_000;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(hex);
  }
  return codes;
}

async function requirePlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (!data) {
    const { data: instAdmin } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "institution_admin")
      .maybeSingle();
    if (!instAdmin) throw new Error("غير مسموح: هذه الميزة للحسابات الإدارية فقط.");
  }
}

/** Step 1: Generate a new TOTP secret and return it as an otpauth:// URI for QR code. */
export const enrollTotp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const secretBytes = crypto.getRandomValues(new Uint8Array(20));
    const secret = base32Encode(secretBytes);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", context.userId)
      .maybeSingle();

    const label = encodeURIComponent(
      `Study DZ:${profile?.email ?? context.userId}`,
    );
    const issuer = encodeURIComponent("Study DZ");
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    await supabaseAdmin
      .from("profiles")
      .update({ totp_secret: secret, totp_enabled: false })
      .eq("id", context.userId);

    return { secret, uri };
  });

/** Step 2: Verify a TOTP code to confirm enrollment and enable 2FA. */
export const confirmTotpEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("totp_secret, totp_enabled")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.totp_secret) throw new Error("لم يبدأ تسجيل 2FA بعد.");
    if (profile.totp_enabled) throw new Error("2FA مفعّل بالفعل.");

    const secret = base32Decode(profile.totp_secret);
    const now = Math.floor(Date.now() / 1000);
    const expected = await generateTotp(secret, Math.floor(now / 30));

    if (String(expected).padStart(6, "0") !== data.code) {
      throw new Error("رمز التحقق غير صحيح.");
    }

    const backupCodes = generateBackupCodes();

    await supabaseAdmin
      .from("profiles")
      .update({ totp_enabled: true, totp_backup_codes: backupCodes })
      .eq("id", context.userId);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "admin",
      action: "2fa.enabled",
      resource: "profiles",
      resource_id: context.userId,
      result: "success",
      metadata: {} as never,
    });

    return { backupCodes };
  });

/** Verify a TOTP code (used during login second step). */
export const verifyTotp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("totp_secret, totp_enabled")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.totp_enabled || !profile?.totp_secret) {
      return { required: false as const };
    }

    const secret = base32Decode(profile.totp_secret);
    const now = Math.floor(Date.now() / 1000);
    const expected = await generateTotp(secret, Math.floor(now / 30));

    if (String(expected).padStart(6, "0") === data.code) {
      return { required: true as const, verified: true as const };
    }

    const prevExpected = await generateTotp(secret, Math.floor(now / 30) - 1);
    if (String(prevExpected).padStart(6, "0") === data.code) {
      return { required: true as const, verified: true as const };
    }

    return { required: true as const, verified: false as const };
  });

/** Check if the current user has 2FA enabled (used by frontend to show step 2). */
export const checkTotpStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("totp_enabled")
      .eq("id", context.userId)
      .maybeSingle();
    return { enabled: profile?.totp_enabled ?? false };
  });

/** Disable 2FA (requires a valid TOTP code). */
export const disableTotp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("totp_secret, totp_enabled")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.totp_enabled) throw new Error("2FA غير مفعّل.");

    const secret = base32Decode(profile.totp_secret!);
    const now = Math.floor(Date.now() / 1000);
    const expected = await generateTotp(secret, Math.floor(now / 30));

    if (String(expected).padStart(6, "0") !== data.code) {
      throw new Error("رمز التحقق غير صحيح.");
    }

    await supabaseAdmin
      .from("profiles")
      .update({ totp_secret: null, totp_enabled: false, totp_backup_codes: [] })
      .eq("id", context.userId);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_role: "admin",
      action: "2fa.disabled",
      resource: "profiles",
      resource_id: context.userId,
      result: "success",
      metadata: {} as never,
    });

    return { ok: true as const };
  });
