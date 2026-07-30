-- 1. payments & contracts: admin-only reads
DROP POLICY IF EXISTS "institution reads own payments" ON public.payments;
CREATE POLICY "institution admin reads own payments" ON public.payments
FOR SELECT TO authenticated
USING ((institution_id = public.current_institution() AND public.is_institution_admin()) OR public.is_platform_admin());

DROP POLICY IF EXISTS "read contracts" ON public.contracts;
CREATE POLICY "admins read contracts" ON public.contracts
FOR SELECT TO authenticated
USING ((institution_id = public.current_institution() AND public.is_institution_admin()) OR public.is_platform_admin());

-- 2. profiles: block self-assigning institution_id
CREATE OR REPLACE FUNCTION public.guard_profile_institution_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'institution_id can only be changed by platform administrators';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_institution_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_institution_change ON public.profiles;
CREATE TRIGGER guard_profile_institution_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_institution_change();

-- 3. attempts: students may only create attempts; scores set server-side
DROP POLICY IF EXISTS "student writes own attempt" ON public.attempts;
CREATE POLICY "student creates own attempt" ON public.attempts
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND institution_id = public.current_institution() AND score IS NULL AND max_score IS NULL AND submitted_at IS NULL);
CREATE POLICY "teacher or admin updates attempt" ON public.attempts
FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR (institution_id = public.current_institution() AND (public.is_institution_admin() OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = attempts.exam_id AND e.teacher_id = auth.uid()))))
WITH CHECK (public.is_platform_admin() OR (institution_id = public.current_institution() AND (public.is_institution_admin() OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = attempts.exam_id AND e.teacher_id = auth.uid()))));

-- 4. attempt_answers: no student-controlled grading columns
DROP POLICY IF EXISTS "student writes own answers" ON public.attempt_answers;
CREATE POLICY "student submits own answers" ON public.attempt_answers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_answers.attempt_id AND a.student_id = auth.uid() AND a.submitted_at IS NULL)
  AND is_correct IS NULL AND awarded = 0
);
CREATE POLICY "teacher or admin grades answers" ON public.attempt_answers
FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR (institution_id = public.current_institution() AND (public.is_institution_admin() OR EXISTS (
  SELECT 1 FROM public.attempts a JOIN public.exams e ON e.id = a.exam_id WHERE a.id = attempt_answers.attempt_id AND e.teacher_id = auth.uid()))))
WITH CHECK (public.is_platform_admin() OR (institution_id = public.current_institution() AND (public.is_institution_admin() OR EXISTS (
  SELECT 1 FROM public.attempts a JOIN public.exams e ON e.id = a.exam_id WHERE a.id = attempt_answers.attempt_id AND e.teacher_id = auth.uid()))));

-- 5. options: hide answer keys from students
DROP POLICY IF EXISTS "read options" ON public.options;
CREATE POLICY "staff read options" ON public.options
FOR SELECT TO authenticated
USING (public.is_platform_admin() OR (institution_id = public.current_institution() AND (public.is_institution_admin() OR EXISTS (
  SELECT 1 FROM public.questions q JOIN public.exams e ON e.id = q.exam_id WHERE q.id = options.question_id AND e.teacher_id = auth.uid()))));

-- 6. lock down SECURITY DEFINER helpers from anonymous/public execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_institution() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_institution_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_admin() TO authenticated;