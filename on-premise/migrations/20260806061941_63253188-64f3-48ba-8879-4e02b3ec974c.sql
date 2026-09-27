CREATE OR REPLACE FUNCTION public.guard_contract_signature_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.institution_signature IS NOT NULL
     AND NEW.institution_signature IS DISTINCT FROM OLD.institution_signature THEN
    RAISE EXCEPTION 'institution signature cannot be modified once signed';
  END IF;

  IF NEW.platform_signature IS DISTINCT FROM OLD.platform_signature
     OR NEW.platform_signed_at IS DISTINCT FROM OLD.platform_signed_at
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.qr_payload IS DISTINCT FROM OLD.qr_payload
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
     OR NEW.contract_number IS DISTINCT FROM OLD.contract_number
     OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.body IS DISTINCT FROM OLD.body THEN
    RAISE EXCEPTION 'only platform administrators can modify contract terms or approval fields';
  END IF;

  IF OLD.status IN ('approved','renewed','expired','cancelled')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'contract status can only be changed by platform administrators';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_contract_signature_change ON public.contracts;
CREATE TRIGGER guard_contract_signature_change
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_signature_change();

CREATE OR REPLACE FUNCTION public.guard_institution_billing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.is_trial IS DISTINCT FROM OLD.is_trial
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'subscription and ownership fields can only be changed by platform administrators';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_institution_billing_change ON public.institutions;
CREATE TRIGGER guard_institution_billing_change
BEFORE UPDATE ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.guard_institution_billing_change();

REVOKE EXECUTE ON FUNCTION public.guard_contract_signature_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_institution_billing_change() FROM anon, authenticated;