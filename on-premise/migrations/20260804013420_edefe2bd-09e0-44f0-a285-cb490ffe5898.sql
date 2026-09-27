CREATE POLICY "institution admins manage own media"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'institution-media'
  AND (storage.foldername(name))[1] = public.current_institution()::text
)
WITH CHECK (
  bucket_id = 'institution-media'
  AND (storage.foldername(name))[1] = public.current_institution()::text
);

CREATE POLICY "institution members read media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'institution-media'
  AND (storage.foldername(name))[1] = public.current_institution()::text
);