CREATE TABLE IF NOT EXISTS public.user_mfa (
  user_id uuid PRIMARY KEY,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  recovery_codes text[] NOT NULL DEFAULT '{}',
  last_used_step bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_mfa TO authenticated;
GRANT ALL ON public.user_mfa TO service_role;
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own mfa state" ON public.user_mfa
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER user_mfa_set_updated_at
  BEFORE UPDATE ON public.user_mfa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  kind text NOT NULL DEFAULT 'login',
  success boolean NOT NULL DEFAULT false,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_attempts_identifier_idx
  ON public.auth_attempts (lower(identifier), kind, created_at DESC);

GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins read auth attempts" ON public.auth_attempts
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());
GRANT SELECT ON public.auth_attempts TO authenticated;