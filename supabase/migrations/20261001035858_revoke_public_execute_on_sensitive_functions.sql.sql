-- Supabase auto-grants EXECUTE to PUBLIC on new/replaced functions.
-- Revoke from both PUBLIC and the specific roles to prevent anon access.

REVOKE EXECUTE ON FUNCTION public.generate_installation_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_installation_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_installation_id() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.institution_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.institution_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.institution_active(uuid) FROM authenticated;

-- verify_license is now 3-arg (with default), revoke old 2-arg version if it still exists
DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text) FROM PUBLIC';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text, text) FROM authenticated;
