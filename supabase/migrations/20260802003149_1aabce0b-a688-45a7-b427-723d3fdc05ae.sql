-- 1) Restrict full profile reads (PII) to self + institution admin + platform admin
DROP POLICY IF EXISTS "read profiles in institution" ON public.profiles;
CREATE POLICY "read profiles self or admins"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_platform_admin()
  OR (public.is_institution_admin() AND institution_id IS NOT NULL AND institution_id = public.current_institution())
);

-- Name-only directory for regular members of the same institution
CREATE OR REPLACE VIEW public.institution_directory AS
SELECT p.id, p.institution_id, p.first_name, p.last_name
FROM public.profiles p
WHERE p.institution_id IS NOT NULL
  AND p.institution_id = public.current_institution();

GRANT SELECT ON public.institution_directory TO authenticated;

-- 2) Prevent self-service institution moves via the update policy
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.is_platform_admin()
  OR (public.is_institution_admin() AND institution_id = public.current_institution())
)
WITH CHECK (
  public.is_platform_admin()
  OR (public.is_institution_admin() AND institution_id = public.current_institution())
  OR (id = auth.uid() AND institution_id IS NOT DISTINCT FROM public.current_institution())
);

-- 3) Least privilege on helper/trigger functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_institution_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_institution() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_institution_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;