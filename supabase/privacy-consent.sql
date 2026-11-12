-- Privacy notice consent records for website forms.
-- Run once in the Supabase SQL Editor before deploying the matching application code.

alter table public.access_applications
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_consent_at timestamptz;

alter table public.pilot_inquiries
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_consent_at timestamptz;

create index if not exists access_applications_privacy_consent_idx
  on public.access_applications (privacy_consent_at);

create index if not exists pilot_inquiries_privacy_consent_idx
  on public.pilot_inquiries (privacy_consent_at);
