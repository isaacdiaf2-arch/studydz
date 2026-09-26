-- ============ Apply drizzle migration 0002: academic structure and licenses ============
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  kind text NOT NULL DEFAULT 'program',
  description text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);
CREATE INDEX IF NOT EXISTS programs_institution_idx ON public.programs(institution_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY programs_read ON public.programs FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY programs_write ON public.programs FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TABLE public.specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  kind text NOT NULL DEFAULT 'specialization',
  description text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, program_id, name)
);
CREATE INDEX IF NOT EXISTS specializations_institution_idx ON public.specializations(institution_id);
CREATE INDEX IF NOT EXISTS specializations_program_idx ON public.specializations(program_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specializations TO authenticated;
GRANT ALL ON public.specializations TO service_role;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
CREATE POLICY specializations_read ON public.specializations FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY specializations_write ON public.specializations FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TABLE public.academic_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  specialization_id uuid REFERENCES public.specializations(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 1,
  duration_months integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS academic_levels_institution_idx ON public.academic_levels(institution_id);
CREATE INDEX IF NOT EXISTS academic_levels_specialization_idx ON public.academic_levels(specialization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_levels TO authenticated;
GRANT ALL ON public.academic_levels TO service_role;
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_levels_read ON public.academic_levels FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY academic_levels_write ON public.academic_levels FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  level_id uuid REFERENCES public.academic_levels(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  name text NOT NULL,
  capacity integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groups_institution_idx ON public.groups(institution_id);
CREATE INDEX IF NOT EXISTS groups_level_idx ON public.groups(level_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_read ON public.groups FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY groups_write ON public.groups FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  level_id uuid REFERENCES public.academic_levels(id) ON DELETE CASCADE,
  specialization_id uuid REFERENCES public.specializations(id) ON DELETE CASCADE,
  teacher_id uuid,
  name text NOT NULL,
  code text,
  coefficient numeric NOT NULL DEFAULT 1,
  hours integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS modules_institution_idx ON public.modules(institution_id);
CREATE INDEX IF NOT EXISTS modules_level_idx ON public.modules(level_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY modules_read ON public.modules FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY modules_write ON public.modules FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skills_module_idx ON public.skills(module_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY skills_read ON public.skills FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY skills_write ON public.skills FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin()
         OR public.has_role(auth.uid(), 'teacher') AND institution_id = public.current_institution())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin()
         OR public.has_role(auth.uid(), 'teacher') AND institution_id = public.current_institution());

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  teacher_id uuid,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'exam',
  max_score numeric NOT NULL DEFAULT 20,
  weight numeric NOT NULL DEFAULT 1,
  held_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessments_institution_idx ON public.assessments(institution_id);
CREATE INDEX IF NOT EXISTS assessments_module_idx ON public.assessments(module_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_read ON public.assessments FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY assessments_write ON public.assessments FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin()
         OR (teacher_id = auth.uid() AND institution_id = public.current_institution()))
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin()
         OR (teacher_id = auth.uid() AND institution_id = public.current_institution()));

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  score numeric NOT NULL,
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);
CREATE INDEX IF NOT EXISTS results_student_idx ON public.results(student_id);
CREATE INDEX IF NOT EXISTS results_assessment_idx ON public.results(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_read ON public.results FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_platform_admin()
    OR (institution_id = public.current_institution()
        AND (public.is_institution_admin() OR public.has_role(auth.uid(), 'teacher')))
  );
CREATE POLICY results_write ON public.results FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR (institution_id = public.current_institution()
        AND (public.is_institution_admin() OR public.has_role(auth.uid(), 'teacher')))
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (institution_id = public.current_institution()
        AND (public.is_institution_admin() OR public.has_role(auth.uid(), 'teacher')))
  );

CREATE TABLE public.group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);
CREATE INDEX IF NOT EXISTS group_memberships_student_idx ON public.group_memberships(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;
GRANT ALL ON public.group_memberships TO service_role;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_memberships_read ON public.group_memberships FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY group_memberships_write ON public.group_memberships FOR ALL TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin())
  WITH CHECK (public.manages_institution(institution_id) OR public.is_platform_admin());

-- ============ Institution licenses ============
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  license_key text NOT NULL UNIQUE,
  installation_id text,
  deployment text NOT NULL DEFAULT 'cloud',
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL DEFAULT 9000,
  issued_at timestamptz NOT NULL DEFAULT now(),
  starts_on date,
  expires_on date,
  revoked_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS licenses_institution_idx ON public.licenses(institution_id);
GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY licenses_read ON public.licenses FOR SELECT TO authenticated
  USING (public.manages_institution(institution_id) OR public.is_platform_admin());

CREATE TRIGGER programs_set_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER specializations_set_updated_at BEFORE UPDATE ON public.specializations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER academic_levels_set_updated_at BEFORE UPDATE ON public.academic_levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER groups_set_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER modules_set_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assessments_set_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER results_set_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER licenses_set_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
