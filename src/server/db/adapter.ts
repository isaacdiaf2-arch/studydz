/**
 * Data adapter: the only place the quiz service layer touches the database
 * provider. Repositories receive this client and never import the provider.
 * Server-only — load inside handlers after the caller is authenticated.
 */
export type DbClient = any;

export async function getServiceDb(): Promise<DbClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
