CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS TABLE (institution_id uuid, name text, subscription_end date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY UPDATE public.institutions i SET status = 'expired'
  WHERE i.status = 'active' AND i.subscription_end IS NOT NULL AND i.subscription_end < CURRENT_DATE
  RETURNING i.id, i.name, i.subscription_end;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_license(_institution_id uuid, _license_key text, _installation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_license licenses%ROWTYPE;
BEGIN
  SELECT * INTO v_license FROM licenses WHERE institution_id = _institution_id AND license_key = _license_key ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  IF v_license.status::text IN ('revoked','suspended') THEN RETURN jsonb_build_object('valid', false, 'reason', v_license.status::text); END IF;
  IF v_license.expires_on IS NOT NULL AND v_license.expires_on < CURRENT_DATE THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;
  IF _installation_id IS NOT NULL AND v_license.installation_id IS NOT NULL AND v_license.installation_id <> _installation_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'installation_mismatch'); END IF;
  RETURN jsonb_build_object('valid', true, 'deployment', v_license.deployment, 'expires_on', v_license.expires_on);
END; $$;

CREATE OR REPLACE FUNCTION public.generate_installation_id()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'SDZ-' || upper(replace(gen_random_uuid()::text, '-', ''));
$$;

REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_license(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_installation_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_license(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_installation_id() TO service_role;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference text;

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON public.login_attempts (identifier, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes text[] DEFAULT '{}';