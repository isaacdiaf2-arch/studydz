-- 1. Institutions: commercial register
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS commercial_register text;

-- 2. Unique email / phone across profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx ON public.profiles (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx ON public.profiles (phone) WHERE phone IS NOT NULL AND phone <> '';

-- 3. Contract status enum + columns
DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('created','awaiting_institution','awaiting_platform','approved','renewed','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_number text,
  ADD COLUMN IF NOT EXISTS status public.contract_status NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 7000,
  ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS institution_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS contracts_number_unique_idx ON public.contracts (contract_number) WHERE contract_number IS NOT NULL;

UPDATE public.contracts SET contract_number = 'SDZ-' || upper(substr(replace(id::text,'-',''),1,8)) WHERE contract_number IS NULL;

-- 4. Contract events log
CREATE TABLE IF NOT EXISTS public.contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  status public.contract_status NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contract_events TO authenticated;
GRANT ALL ON public.contract_events TO service_role;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract events readable by admins" ON public.contract_events;
CREATE POLICY "contract events readable by admins" ON public.contract_events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (public.is_institution_admin() AND institution_id = public.current_institution()));

-- 5. Password reset requests
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  full_name text,
  role public.app_role,
  institution_id uuid,
  target text NOT NULL DEFAULT 'institution_admin',
  status text NOT NULL DEFAULT 'pending',
  temp_code text,
  note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reset requests visible to responsible admin" ON public.password_reset_requests;
CREATE POLICY "reset requests visible to responsible admin" ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (
    (target = 'platform_admin' AND public.is_platform_admin())
    OR (target = 'institution_admin' AND public.is_institution_admin() AND institution_id = public.current_institution())
  );

-- 6. updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public;

DROP TRIGGER IF EXISTS contracts_set_updated_at ON public.contracts;
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reset_requests_set_updated_at ON public.password_reset_requests;
CREATE TRIGGER reset_requests_set_updated_at BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. keep profile institution guard trigger active
DROP TRIGGER IF EXISTS profiles_guard_institution ON public.profiles;
CREATE TRIGGER profiles_guard_institution BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_institution_change();