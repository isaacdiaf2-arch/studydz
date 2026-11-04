CREATE OR REPLACE FUNCTION public.log_table_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; inst uuid;
BEGIN
  r := to_jsonb(COALESCE(NEW, OLD));
  BEGIN inst := NULLIF(r->>'institution_id','')::uuid; EXCEPTION WHEN others THEN inst := NULL; END;
  IF TG_TABLE_NAME = 'institutions' THEN inst := (r->>'id')::uuid; END IF;
  INSERT INTO public.audit_logs(actor_id, institution_id, action, resource, resource_id, result, metadata)
  VALUES (auth.uid(), inst, lower(TG_OP), TG_TABLE_NAME, r->>'id', 'success', jsonb_build_object('source','db_trigger'));
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_table_activity() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['institutions','payments','user_roles','classes','groups','programs','specializations','academic_levels','modules','subjects','lessons','files','assessments','results','exams','schedules','rooms','announcements','enrollments','group_memberships','licenses','official_contracts','trial_requests','change_requests','password_reset_requests','homework_submissions','profiles']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_activity_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.log_table_activity()', t);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);