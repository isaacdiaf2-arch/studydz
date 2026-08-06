import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Reserved entry point.
 *
 * No credential exists in this file: the expected identifier and passcode live
 * only in encrypted server-side environment secrets and are compared with a
 * constant-time digest comparison inside the handler (never shipped to the
 * browser bundle).
 */
export const openReservedConsole = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        identifier: z.string().trim().min(1).max(255),
        passcode: z.string().min(1).max(255),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
    const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

    const expectedId = process.env["SDZ_VAULT_IDENTIFIER"] ?? "";
    const expectedPass = process.env["SDZ_VAULT_PASSCODE"] ?? "";
    const accountEmail = process.env["SDZ_VAULT_EMAIL"] ?? "";
    if (!expectedId || !expectedPass || !accountEmail) {
      return { ok: false as const };
    }

    const okId = same(data.identifier.toLowerCase(), expectedId.toLowerCase());
    const okPass = same(data.passcode, expectedPass);
    if (!okId || !okPass) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure the backing account exists, is confirmed, and holds the role.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = (list?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === accountEmail.toLowerCase(),
    );

    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: accountEmail,
        password: expectedPass,
        email_confirm: true,
        user_metadata: { first_name: "مدير", last_name: "المنصة" },
      });
      if (error || !created.user) return { ok: false as const };
      user = created.user;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: expectedPass,
        email_confirm: true,
      });
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "platform_admin" }, { onConflict: "user_id,role" });

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: signed, error: signInError } = await client.auth.signInWithPassword({
      email: accountEmail,
      password: expectedPass,
    });
    if (signInError || !signed.session) return { ok: false as const };

    return {
      ok: true as const,
      accessToken: signed.session.access_token,
      refreshToken: signed.session.refresh_token,
    };
  });
