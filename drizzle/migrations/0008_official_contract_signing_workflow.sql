CREATE TABLE public.contract_provider_settings (id boolean PRIMARY KEY DEFAULT true CHECK (id), details jsonb NOT NULL, updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.contract_provider_settings TO authenticated;
GRANT ALL ON public.contract_provider_settings TO service_role;
ALTER TABLE public.contract_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_read ON public.contract_provider_settings FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.is_institution_admin());

CREATE TABLE public.official_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institution_id uuid NOT NULL REFERENCES public.institutions(id), number text NOT NULL UNIQUE,
 version text NOT NULL, legal_text text NOT NULL, fields jsonb NOT NULL, provider jsonb NOT NULL, content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','awaiting_platform','final','returned')),
 replaces_id uuid REFERENCES public.official_contracts(id), correction_note text,
 institution_evidence jsonb, platform_evidence jsonb,
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.official_contracts TO authenticated;
GRANT ALL ON public.official_contracts TO service_role;
ALTER TABLE public.official_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY official_contract_read ON public.official_contracts FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.manages_institution(institution_id));
CREATE UNIQUE INDEX official_contract_open_unique ON public.official_contracts(institution_id) WHERE state IN ('draft','awaiting_platform');

CREATE TABLE public.contract_artifacts (
 contract_id uuid PRIMARY KEY REFERENCES public.official_contracts(id), pdf_base64 text NOT NULL,
 sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_artifacts TO authenticated;
GRANT ALL ON public.contract_artifacts TO service_role;
ALTER TABLE public.contract_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_artifact_read ON public.contract_artifacts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.official_contracts c WHERE c.id = contract_id AND (public.is_platform_admin() OR public.manages_institution(c.institution_id))));

CREATE OR REPLACE FUNCTION public.guard_official_contract() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Official contract records cannot be deleted'; END IF;
 IF OLD.state IN ('final','returned') THEN RAISE EXCEPTION 'Contract revision is immutable'; END IF;
 IF NEW.institution_id IS DISTINCT FROM OLD.institution_id OR NEW.number IS DISTINCT FROM OLD.number OR NEW.version IS DISTINCT FROM OLD.version OR NEW.legal_text IS DISTINCT FROM OLD.legal_text OR NEW.provider IS DISTINCT FROM OLD.provider OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.replaces_id IS DISTINCT FROM OLD.replaces_id THEN RAISE EXCEPTION 'Fixed contract content cannot change'; END IF;
 IF OLD.institution_evidence IS NOT NULL AND (NEW.fields IS DISTINCT FROM OLD.fields OR NEW.content_hash IS DISTINCT FROM OLD.content_hash OR NEW.institution_evidence IS DISTINCT FROM OLD.institution_evidence) THEN RAISE EXCEPTION 'First signature freezes all contract data'; END IF;
 IF NOT ((OLD.state = 'draft' AND NEW.state IN ('draft','awaiting_platform')) OR (OLD.state = 'awaiting_platform' AND NEW.state IN ('final','returned'))) THEN RAISE EXCEPTION 'Invalid contract transition'; END IF;
 IF NEW.state = 'awaiting_platform' AND NEW.institution_evidence IS NULL THEN RAISE EXCEPTION 'Missing first signature'; END IF;
 IF NEW.state = 'final' AND (NEW.institution_evidence IS NULL OR NEW.platform_evidence IS NULL) THEN RAISE EXCEPTION 'Both signatures required'; END IF;
 NEW.updated_at = now(); RETURN NEW;
END; $$;
CREATE TRIGGER official_contract_guard BEFORE UPDATE OR DELETE ON public.official_contracts FOR EACH ROW EXECUTE FUNCTION public.guard_official_contract();
CREATE OR REPLACE FUNCTION public.guard_contract_artifact() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Official artifact is append-only'; END; $$;
CREATE TRIGGER artifact_immutable BEFORE UPDATE OR DELETE ON public.contract_artifacts FOR EACH ROW EXECUTE FUNCTION public.guard_contract_artifact();

CREATE OR REPLACE FUNCTION public.transition_official_contract(_id uuid, _actor uuid, _action text, _hash text, _evidence jsonb DEFAULT NULL, _pdf text DEFAULT NULL, _pdf_hash text DEFAULT NULL, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.official_contracts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.official_contracts WHERE id = _id FOR UPDATE;
 IF NOT FOUND OR c.content_hash <> _hash THEN RAISE EXCEPTION 'Contract changed or unavailable'; END IF;
 IF _action = 'institution_sign' THEN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id WHERE r.user_id = _actor AND r.role = 'institution_admin' AND r.institution_id = c.institution_id AND p.institution_id = c.institution_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF c.state <> 'draft' OR c.institution_evidence IS NOT NULL THEN RAISE EXCEPTION 'Invalid first signature'; END IF;
  IF (_evidence->>'actor_id') IS DISTINCT FROM _actor::text OR (_evidence->>'consent') IS DISTINCT FROM 'true' OR (_evidence->>'content_hash') IS DISTINCT FROM c.content_hash OR coalesce(_evidence->>'signature','') NOT LIKE 'data:image/png;base64,%' OR (_evidence->>'signed_at') IS NULL THEN RAISE EXCEPTION 'Invalid identity or consent evidence'; END IF;
  UPDATE public.official_contracts SET institution_evidence = _evidence, state = 'awaiting_platform' WHERE id = _id;
  INSERT INTO public.notifications(recipient_id,institution_id,type,title,body,link) SELECT user_id,c.institution_id,'contract','عقد بانتظار التوقيع',c.number,'/admin' FROM public.user_roles WHERE role = 'platform_admin';
 ELSIF _action IN ('platform_sign','return') THEN
  IF NOT public.has_role(_actor,'platform_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF c.state <> 'awaiting_platform' OR c.platform_evidence IS NOT NULL THEN RAISE EXCEPTION 'Invalid second signature'; END IF;
  IF _action = 'return' THEN
   IF length(trim(coalesce(_note,''))) < 5 THEN RAISE EXCEPTION 'Correction reason required'; END IF;
   UPDATE public.official_contracts SET state = 'returned', correction_note = _note WHERE id = _id;
  ELSE
   IF (_evidence->>'actor_id') IS DISTINCT FROM _actor::text OR (_evidence->>'consent') IS DISTINCT FROM 'true' OR (_evidence->>'content_hash') IS DISTINCT FROM c.content_hash OR coalesce(_evidence->>'signature','') NOT LIKE 'data:image/png;base64,%' OR (_evidence->>'signed_at') IS NULL THEN RAISE EXCEPTION 'Invalid identity or consent evidence'; END IF;
   IF _pdf IS NULL OR _pdf_hash IS NULL OR encode(sha256(decode(_pdf,'base64')),'hex') <> _pdf_hash THEN RAISE EXCEPTION 'Invalid artifact digest'; END IF;
   INSERT INTO public.contract_artifacts(contract_id,pdf_base64,sha256) VALUES (_id,_pdf,_pdf_hash);
   UPDATE public.official_contracts SET platform_evidence = _evidence, state = 'final' WHERE id = _id;
  END IF;
  INSERT INTO public.notifications(recipient_id,institution_id,type,title,body,link) SELECT user_id,c.institution_id,'contract',CASE WHEN _action = 'return' THEN 'أعيد العقد للتصحيح' ELSE 'اكتمل توقيع العقد' END,c.number,'/institution' FROM public.user_roles WHERE role = 'institution_admin' AND institution_id = c.institution_id;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 INSERT INTO public.audit_logs(actor_id,actor_role,institution_id,action,resource,resource_id,result,metadata) VALUES (_actor,CASE WHEN _action='institution_sign' THEN 'institution_admin' ELSE 'platform_admin' END,c.institution_id,_action,'official_contract',_id::text,'success',jsonb_build_object('content_hash',c.content_hash,'pdf_hash',_pdf_hash,'note',_note));
END; $$;
REVOKE ALL ON FUNCTION public.transition_official_contract(uuid,uuid,text,text,jsonb,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_official_contract(uuid,uuid,text,text,jsonb,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.guard_official_contract(), public.guard_contract_artifact() FROM PUBLIC,anon,authenticated;