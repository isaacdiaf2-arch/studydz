-- Revoke EXECUTE from anon on generate_installation_id and institution_active
-- These are service-role only functions
REVOKE EXECUTE ON FUNCTION public.generate_installation_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.institution_active(uuid) FROM anon;
