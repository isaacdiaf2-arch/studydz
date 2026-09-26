-- ============ Apply drizzle migration 0001: core platform governance ============
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS legal_representative text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.manages_institution(_institution_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _institution_id IS NOT NULL
     AND public.has_role(auth.uid(), 'institution_admin')
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.institution_id = _institution_id
     );
$$;
REVOKE ALL ON FUNCTION public.manages_institution(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.manages_institution(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  sender_id uuid,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own_select ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY notif_own_update ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  institution_id uuid,
  action text NOT NULL,
  resource text,
  resource_id text,
  result text NOT NULL DEFAULT 'success',
  ip text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_admin_select ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.manages_institution(institution_id));

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'ccp',
  status text NOT NULL DEFAULT 'paid',
  issued_at timestamptz NOT NULL DEFAULT now(),
  period_start date,
  period_end date
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_select ON public.invoices FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.manages_institution(institution_id));

CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  target text NOT NULL DEFAULT 'profile',
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.change_requests TO authenticated;
GRANT ALL ON public.change_requests TO service_role;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_select ON public.change_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_platform_admin() OR public.manages_institution(institution_id));
CREATE POLICY cr_insert ON public.change_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');
