
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialization_id uuid REFERENCES public.specializations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.academic_levels(id) ON DELETE SET NULL;

ALTER TABLE public.assessments ADD CONSTRAINT assessments_kind_check
  CHECK (kind IN ('quiz','test','exam','continuous','homework','activity','participation','project','oral','practical')) NOT VALID;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS assessments_group_idx ON public.assessments(group_id);
CREATE INDEX IF NOT EXISTS assessments_module_idx ON public.assessments(module_id);
CREATE INDEX IF NOT EXISTS assessments_teacher_idx ON public.assessments(teacher_id);
CREATE INDEX IF NOT EXISTS results_student_idx ON public.results(student_id);
CREATE INDEX IF NOT EXISTS gm_student_idx ON public.group_memberships(student_id);
CREATE INDEX IF NOT EXISTS gm_group_idx ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS modules_teacher_idx ON public.modules(teacher_id);
CREATE INDEX IF NOT EXISTS modules_level_idx ON public.modules(level_id);
CREATE INDEX IF NOT EXISTS groups_level_idx ON public.groups(level_id);

CREATE TABLE public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  content text,
  file_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  feedback text,
  graded_at timestamptz,
  graded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);
GRANT SELECT ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER homework_submissions_set_updated_at BEFORE UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Relationship helpers
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = _group_id AND student_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.teaches_group(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.modules m ON m.level_id = g.level_id AND m.institution_id = g.institution_id
    WHERE g.id = _group_id AND m.teacher_id = auth.uid() AND m.archived = false);
$$;

CREATE OR REPLACE FUNCTION public.student_has_module(_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _module_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.group_id
    JOIN public.modules m ON m.level_id = g.level_id AND m.institution_id = g.institution_id
    WHERE m.id = _module_id AND gm.student_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.teaches_module(_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _module_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.modules WHERE id = _module_id AND teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_access_assessment(_assessment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = _assessment_id AND (
      public.is_platform_admin() OR public.manages_institution(a.institution_id)
      OR a.teacher_id = auth.uid() OR public.teaches_module(a.module_id)
      OR (a.published AND public.is_group_member(a.group_id))
      OR (a.published AND a.kind = 'homework' AND public.is_group_member(a.group_id))));
$$;

CREATE OR REPLACE FUNCTION public.manages_assessment(_assessment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = _assessment_id AND (
      public.is_platform_admin() OR public.manages_institution(a.institution_id)
      OR a.teacher_id = auth.uid() OR public.teaches_module(a.module_id)));
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid), public.teaches_group(uuid), public.student_has_module(uuid),
  public.teaches_module(uuid), public.can_access_assessment(uuid), public.manages_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid), public.teaches_group(uuid), public.student_has_module(uuid),
  public.teaches_module(uuid), public.can_access_assessment(uuid), public.manages_assessment(uuid) TO authenticated, service_role;

-- Assessments
DROP POLICY IF EXISTS assessments_read ON public.assessments;
DROP POLICY IF EXISTS assessments_write ON public.assessments;
CREATE POLICY assessments_read ON public.assessments FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR public.manages_institution(institution_id)
  OR teacher_id = auth.uid() OR public.teaches_module(module_id)
  OR (published AND public.is_group_member(group_id)));
CREATE POLICY assessments_write ON public.assessments FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.manages_institution(institution_id)
    OR (institution_id = public.current_institution() AND (teacher_id = auth.uid() OR public.teaches_module(module_id))))
  WITH CHECK (public.is_platform_admin() OR public.manages_institution(institution_id)
    OR (institution_id = public.current_institution() AND teacher_id = auth.uid()
        AND (module_id IS NULL OR public.teaches_module(module_id))
        AND (group_id IS NULL OR public.teaches_group(group_id))));

-- Results
DROP POLICY IF EXISTS results_read ON public.results;
DROP POLICY IF EXISTS results_write ON public.results;
CREATE POLICY results_read ON public.results FOR SELECT TO authenticated USING (
  public.manages_assessment(assessment_id)
  OR (student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.published)));
CREATE POLICY results_write ON public.results FOR ALL TO authenticated
  USING (public.manages_assessment(assessment_id))
  WITH CHECK (public.manages_assessment(assessment_id));

-- Homework submissions (writes go through server functions)
CREATE POLICY hw_read ON public.homework_submissions FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.manages_assessment(assessment_id));

-- Groups / memberships / modules
DROP POLICY IF EXISTS groups_read ON public.groups;
CREATE POLICY groups_read ON public.groups FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR public.manages_institution(institution_id)
  OR public.teaches_group(id) OR public.is_group_member(id));
DROP POLICY IF EXISTS group_memberships_read ON public.group_memberships;
CREATE POLICY group_memberships_read ON public.group_memberships FOR SELECT TO authenticated USING (
  student_id = auth.uid() OR public.is_platform_admin() OR public.manages_institution(institution_id)
  OR public.teaches_group(group_id));
DROP POLICY IF EXISTS modules_read ON public.modules;
CREATE POLICY modules_read ON public.modules FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR public.manages_institution(institution_id)
  OR teacher_id = auth.uid() OR public.student_has_module(id));

-- Lessons / files / exams: group-scoped items only visible to that group
DROP POLICY IF EXISTS "read lessons" ON public.lessons;
CREATE POLICY "read lessons" ON public.lessons FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR teacher_id = auth.uid() OR public.manages_institution(institution_id)
  OR (institution_id = public.current_institution() AND published = true
      AND (group_id IS NULL OR public.is_group_member(group_id))
      AND (module_id IS NULL OR public.student_has_module(module_id) OR public.teaches_module(module_id))));
DROP POLICY IF EXISTS "read files" ON public.files;
CREATE POLICY "read files" ON public.files FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR owner_id = auth.uid() OR public.manages_institution(institution_id)
  OR (institution_id = public.current_institution()
      AND (group_id IS NULL OR public.is_group_member(group_id) OR public.teaches_group(group_id))
      AND (module_id IS NULL OR public.student_has_module(module_id) OR public.teaches_module(module_id))));
DROP POLICY IF EXISTS "read exams" ON public.exams;
CREATE POLICY "read exams" ON public.exams FOR SELECT TO authenticated USING (
  public.is_platform_admin() OR teacher_id = auth.uid() OR public.manages_institution(institution_id)
  OR (institution_id = public.current_institution() AND published = true
      AND (group_id IS NULL OR public.is_group_member(group_id))
      AND (module_id IS NULL OR public.student_has_module(module_id))));
