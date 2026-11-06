CREATE TABLE public.personal_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_schedule_owner_idx ON public.personal_schedule_entries(owner_id, day_of_week);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_schedule_entries TO authenticated;
GRANT ALL ON public.personal_schedule_entries TO service_role;
ALTER TABLE public.personal_schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads personal schedule" ON public.personal_schedule_entries FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner inserts personal schedule" ON public.personal_schedule_entries FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND (institution_id IS NULL OR institution_id = public.current_institution()));
CREATE POLICY "owner updates personal schedule" ON public.personal_schedule_entries FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes personal schedule" ON public.personal_schedule_entries FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER personal_schedule_updated_at BEFORE UPDATE ON public.personal_schedule_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();