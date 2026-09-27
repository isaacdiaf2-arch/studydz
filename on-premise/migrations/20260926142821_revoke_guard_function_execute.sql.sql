-- Revoke EXECUTE from anon on guard functions (they're trigger helpers, not meant to be called via REST)
REVOKE EXECUTE ON FUNCTION public.guard_contract_signature_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_institution_billing_change() FROM anon, authenticated;

-- Restrict expire_subscriptions and verify_license to service_role only
-- (they're called from server-side code with the service role key, not from the browser)
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text) FROM authenticated;

-- The helper functions (current_institution, is_institution_admin, is_platform_admin,
-- manages_institution, institution_access_valid) are used in RLS policies and need
-- to be callable by authenticated. They are safe: they only read data the caller
-- already has access to and return scalar values. Keeping EXECUTE on authenticated.
