-- One application, two independent owner approvals.
-- Run this migration once in the Supabase SQL Editor before deploying the matching website code.

alter table public.access_applications
  add column if not exists login_status text not null default 'pending'
    check (login_status in ('pending', 'approved', 'rejected')),
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'approved', 'rejected')),
  add column if not exists login_reviewed_at timestamptz,
  add column if not exists login_reviewed_by text,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by text;

-- Preserve existing login decisions.
update public.access_applications
set login_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'pending'
end;

-- Carry forward only the latest legacy download decision.
update public.access_applications a
set payment_status = coalesce((
  select case
    when d.status = 'approved' and d.payment_confirmed = true then 'approved'
    when d.status = 'rejected' then 'rejected'
    else 'pending'
  end
  from public.download_requests d
  where d.user_id = a.auth_user_id
  order by d.requested_at desc
  limit 1
), 'pending');

-- The legacy aggregate status remains in sync for older integrations.
update public.access_applications
set status = case
  when login_status = 'rejected' or payment_status = 'rejected' then 'rejected'
  when login_status = 'approved' and payment_status = 'approved' then 'approved'
  else 'pending'
end;

create index if not exists access_applications_approval_status_idx
  on public.access_applications (login_status, payment_status);
