-- 1) trial requests
CREATE TABLE public.trial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  motivation text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_requests TO authenticated;
GRANT ALL ON public.trial_requests TO service_role;

ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read trial requests"
  ON public.trial_requests FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins update trial requests"
  ON public.trial_requests FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins delete trial requests"
  ON public.trial_requests FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE TRIGGER trg_trial_requests_updated_at
  BEFORE UPDATE ON public.trial_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) trial window on institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.institution_access_valid(_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = _institution_id
      AND i.status = 'active'
      AND (i.is_trial = false OR (i.trial_ends_at IS NOT NULL AND i.trial_ends_at > now()))
  );
$$;

REVOKE ALL ON FUNCTION public.institution_access_valid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.institution_access_valid(uuid) TO authenticated, service_role;
