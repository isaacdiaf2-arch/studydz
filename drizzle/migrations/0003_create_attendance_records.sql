CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  period_index smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'present',
  minutes_late integer NOT NULL DEFAULT 0,
  reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_status_check CHECK (status IN ('present','absent','late','excused')),
  CONSTRAINT attendance_minutes_check CHECK (minutes_late >= 0 AND minutes_late <= 600),
  CONSTRAINT attendance_unique_slot UNIQUE (institution_id, student_id, session_date, period_index)
);

CREATE INDEX attendance_institution_date_idx ON public.attendance_records (institution_id, session_date DESC);
CREATE INDEX attendance_student_idx ON public.attendance_records (student_id, session_date DESC);
CREATE INDEX attendance_status_idx ON public.attendance_records (institution_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance readable inside institution"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR (
    institution_id = public.current_institution()
    AND (
      student_id = auth.uid()
      OR public.has_role(auth.uid(), 'teacher')
      OR public.manages_institution(institution_id)
    )
  )
);

CREATE POLICY "attendance writable by staff"
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (
  institution_id = public.current_institution()
  AND (public.has_role(auth.uid(), 'teacher') OR public.manages_institution(institution_id))
);

CREATE POLICY "attendance updatable by staff"
ON public.attendance_records FOR UPDATE TO authenticated
USING (
  institution_id = public.current_institution()
  AND (public.has_role(auth.uid(), 'teacher') OR public.manages_institution(institution_id))
)
WITH CHECK (
  institution_id = public.current_institution()
  AND (public.has_role(auth.uid(), 'teacher') OR public.manages_institution(institution_id))
);

CREATE POLICY "attendance deletable by managers"
ON public.attendance_records FOR DELETE TO authenticated
USING (public.manages_institution(institution_id));

CREATE TRIGGER attendance_set_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();