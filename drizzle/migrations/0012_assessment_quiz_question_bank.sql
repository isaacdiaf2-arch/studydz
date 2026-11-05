ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS assessments_exam_id_idx ON public.assessments(exam_id);