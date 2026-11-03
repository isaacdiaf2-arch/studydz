CREATE OR REPLACE FUNCTION public.audit_official_contract_draft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.state <> 'draft' OR NEW.institution_evidence IS NOT NULL OR NEW.platform_evidence IS NOT NULL THEN RAISE EXCEPTION 'Contract must start unsigned'; END IF;
  IF NEW.replaces_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.official_contracts c WHERE c.id=NEW.replaces_id AND c.institution_id=NEW.institution_id AND c.state='returned') THEN RAISE EXCEPTION 'Invalid correction revision'; END IF;
  INSERT INTO public.audit_logs(actor_id,actor_role,institution_id,action,resource,resource_id,result,metadata) VALUES (NEW.created_by,'institution_admin',NEW.institution_id,'contract_created','official_contract',NEW.id::text,'success',jsonb_build_object('content_hash',NEW.content_hash,'replaces_id',NEW.replaces_id));
 ELSIF OLD.state='draft' AND NEW.state='draft' AND NEW.fields IS DISTINCT FROM OLD.fields THEN
  INSERT INTO public.audit_logs(actor_id,actor_role,institution_id,action,resource,resource_id,result,metadata) VALUES (NEW.created_by,'institution_admin',NEW.institution_id,'contract_fields_updated','official_contract',NEW.id::text,'success',jsonb_build_object('content_hash',NEW.content_hash));
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER official_contract_draft_audit AFTER INSERT OR UPDATE ON public.official_contracts FOR EACH ROW EXECUTE FUNCTION public.audit_official_contract_draft();
REVOKE ALL ON FUNCTION public.audit_official_contract_draft() FROM PUBLIC,anon,authenticated;