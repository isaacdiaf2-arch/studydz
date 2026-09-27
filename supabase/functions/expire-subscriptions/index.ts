import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase.rpc("expire_subscriptions");

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expired = (data ?? []) as Array<{ institution_id: string; name: string }>;

    if (expired.length > 0) {
      for (const inst of expired) {
        await supabase.from("audit_logs").insert({
          actor_role: "system",
          institution_id: inst.institution_id,
          action: "subscription.expired",
          resource: "institutions",
          resource_id: inst.institution_id,
          result: "success",
          metadata: { cron: true },
        });
      }
    }

    return Response.json(
      { ok: true, expiredCount: expired.length },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
