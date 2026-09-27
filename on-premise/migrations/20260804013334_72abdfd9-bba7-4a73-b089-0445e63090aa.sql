ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS name_fr text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS accreditation_number text,
  ADD COLUMN IF NOT EXISTS accreditation_authority text,
  ADD COLUMN IF NOT EXISTS founded_on date,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS maps_url text;