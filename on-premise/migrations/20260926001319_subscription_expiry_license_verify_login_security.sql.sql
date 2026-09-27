-- ============ Subscription auto-expiry function ============
-- Called periodically to expire subscriptions past their end date.
-- Does NOT delete data — only changes status to 'expired'.

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS TABLE (institution_id uuid, name text, subscription_end date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.institutions
  SET status = 'expired'
  WHERE status = 'active'
    AND subscription_end IS NOT NULL
    AND subscription_end < CURRENT_DATE
  RETURNING id, name, subscription_end;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO authenticated, service_role;

-- ============ License verification function ============
-- Verifies a license key belongs to the given institution and is active.
-- Returns JSON with verification result.

CREATE OR REPLACE FUNCTION public.verify_license(
  _institution_id uuid,
  _license_key text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _license public.licenses%ROWTYPE;
BEGIN
  SELECT * INTO _license
  FROM public.licenses
  WHERE institution_id = _institution_id
    AND license_key = _license_key
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'license_not_found');
  END IF;

  IF _license.status = 'revoked' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'license_revoked');
  END IF;

  IF _license.status = 'suspended' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'license_suspended');
  END IF;

  IF _license.expires_on IS NOT NULL AND _license.expires_on < CURRENT_DATE THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'license_expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'license_id', _license.id,
    'deployment', _license.deployment,
    'starts_on', _license.starts_on,
    'expires_on', _license.expires_on,
    'installation_id', _license.installation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_license(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.verify_license(uuid, text) TO authenticated, service_role;

-- ============ Add rejection_reason + reference to payments ============
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference text;

-- ============ Login attempts tracking ============
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON public.login_attempts (identifier, created_at DESC);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
