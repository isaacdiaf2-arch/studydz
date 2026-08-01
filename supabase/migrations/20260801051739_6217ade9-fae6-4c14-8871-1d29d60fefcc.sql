CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read rooms" ON public.rooms FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());

CREATE POLICY "admin manages rooms" ON public.rooms FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());

CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX rooms_unique_name ON public.rooms (institution_id, lower(name));

ALTER TABLE public.schedules
  ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN period_index smallint NOT NULL DEFAULT 1,
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN label text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER schedules_set_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX schedules_no_class_conflict
  ON public.schedules (institution_id, class_id, day_of_week, start_time)
  WHERE archived = false;

CREATE UNIQUE INDEX schedules_no_teacher_conflict
  ON public.schedules (institution_id, teacher_id, day_of_week, start_time)
  WHERE archived = false AND teacher_id IS NOT NULL;

CREATE UNIQUE INDEX schedules_no_room_conflict
  ON public.schedules (institution_id, room_id, day_of_week, start_time)
  WHERE archived = false AND room_id IS NOT NULL;