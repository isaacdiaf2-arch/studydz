-- Fix verify_license to accept an optional _installation_id parameter
-- The app now passes installation_id for binding validation

CREATE OR REPLACE FUNCTION public.verify_license(
  _institution_id uuid,
  _license_key text,
  _installation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license licenses%ROWTYPE;
BEGIN
  SELECT * INTO v_license
  FROM licenses
  WHERE institution_id = _institution_id
    AND license_key = _license_key
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_license.status IN ('revoked', 'suspended') THEN
    RETURN jsonb_build_object('valid', false, 'reason', v_license.status);
  END IF;

  IF v_license.expires_on IS NOT NULL AND v_license.expires_on < CURRENT_DATE THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  -- Installation ID binding check (only for local/hybrid, when both are non-null)
  IF _installation_id IS NOT NULL
     AND v_license.installation_id IS NOT NULL
     AND v_license.installation_id <> _installation_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'installation_mismatch');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'deployment', v_license.deployment,
    'expires_on', v_license.expires_on
  );
END;
$$;

-- Revoke anon execute (service_role uses it via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_license(uuid, text, text) FROM authenticated;
