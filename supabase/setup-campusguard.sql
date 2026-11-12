-- CampusGuard website database setup
-- Run this complete script in Supabase Dashboard -> SQL Editor.
-- The schema additions and legacy migration are designed to be safe to re-run.
-- Run against the existing CampusGuard project, not an empty/new project.

-- ---------------------------------------------------------------------------
-- 1. One application with two independent owner approvals
-- ---------------------------------------------------------------------------

alter table public.access_applications
  add column if not exists login_status text not null default 'pending'
    check (login_status in ('pending', 'approved', 'rejected')),
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'approved', 'rejected')),
  add column if not exists login_reviewed_at timestamptz,
  add column if not exists login_reviewed_by text,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by text;

update public.access_applications
set login_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else login_status
end
where login_status = 'pending'
  and status in ('approved', 'rejected');

update public.access_applications a
set payment_status = (
  select case
    when d.status = 'approved' and d.payment_confirmed = true then 'approved'
    when d.status = 'rejected' then 'rejected'
    else 'pending'
  end
  from public.download_requests d
  where d.user_id = a.auth_user_id
  order by d.requested_at desc
  limit 1
)
where a.payment_status = 'pending'
  and exists (
    select 1 from public.download_requests d
    where d.user_id = a.auth_user_id
  );

update public.access_applications
set status = case
  when login_status = 'rejected' or payment_status = 'rejected' then 'rejected'
  when login_status = 'approved' and payment_status = 'approved' then 'approved'
  else 'pending'
end;

create index if not exists access_applications_approval_status_idx
  on public.access_applications (login_status, payment_status);

-- ---------------------------------------------------------------------------
-- 2. Record which privacy notice was accepted and when
-- ---------------------------------------------------------------------------

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
