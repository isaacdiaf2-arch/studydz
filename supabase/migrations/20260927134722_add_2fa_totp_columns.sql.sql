-- ============================================================
-- 2FA / TOTP support for administrative accounts
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes text[] DEFAULT '{}';

-- RLS: totp_secret is sensitive — only the owner can read/update their own row
-- (existing profiles policies already enforce institution_id = current_institution())
-- No additional policy needed since profiles already have per-user RLS.
