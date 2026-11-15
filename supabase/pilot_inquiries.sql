-- Run this in Supabase SQL Editor for the CampusGuard pilot inquiry form.
-- The service-role key is used only by the server-side API; no public table access is granted.
-- This script is safe to re-run and upgrades the older three-topic constraint.

create table if not exists public.pilot_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  organisation text not null check (char_length(organisation) between 1 and 180),
  topic text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

-- The website now offers four topics. Replace the original three-topic constraint.
alter table public.pilot_inquiries
  drop constraint if exists pilot_inquiries_topic_check;

alter table public.pilot_inquiries
  add constraint pilot_inquiries_topic_check
  check (topic in (
    'Request pilot details',
    'Plan a deployment',
    'Discuss multi-site needs',
    'Book a demo'
  ));

alter table public.pilot_inquiries enable row level security;
revoke all on table public.pilot_inquiries from anon, authenticated;
