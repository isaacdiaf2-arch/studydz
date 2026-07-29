
CREATE POLICY "upload own proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read own proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs'
     AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_platform_admin()));
CREATE POLICY "delete own proof" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
