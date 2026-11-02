REVOKE INSERT, UPDATE, DELETE ON public.official_contracts, public.contract_artifacts, public.contract_provider_settings FROM anon, authenticated;
REVOKE ALL ON public.official_contracts, public.contract_artifacts, public.contract_provider_settings FROM anon;
GRANT SELECT ON public.official_contracts, public.contract_artifacts, public.contract_provider_settings TO authenticated;