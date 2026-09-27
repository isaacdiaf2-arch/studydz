import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
  serverLoader: async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("institutions").select("id").limit(1).maybeSingle();
      if (error) {
        return Response.json(
          { status: "degraded", database: "error", error: error.message },
          { status: 503 },
        );
      }
      return Response.json({ status: "ok", database: "connected" });
    } catch (err) {
      return Response.json(
        { status: "error", database: "unreachable" },
        { status: 503 },
      );
    }
  },
});
