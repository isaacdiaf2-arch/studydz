
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS results_published boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS results_read ON public.results;
CREATE POLICY results_read ON public.results FOR SELECT TO authenticated USING (
  public.manages_assessment(assessment_id)
  OR (student_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.published AND a.results_published)));
