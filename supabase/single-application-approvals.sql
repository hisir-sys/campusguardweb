-- One application, two independent owner approvals.
-- Run this migration once in the Supabase SQL Editor before deploying the matching website code.
-- Safe to re-run: existing non-pending decisions are not overwritten.

alter table public.access_applications
  add column if not exists login_status text not null default 'pending'
    check (login_status in ('pending', 'approved', 'rejected')),
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'approved', 'rejected')),
  add column if not exists login_reviewed_at timestamptz,
  add column if not exists login_reviewed_by text,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by text;

-- Carry forward legacy login decisions only where the new decision is still pending.
update public.access_applications
set login_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else login_status
end
where login_status = 'pending'
  and status in ('approved', 'rejected');

-- Carry forward the latest legacy download decision only when a legacy request exists
-- and the new payment decision is still pending.
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
    select 1
    from public.download_requests d
    where d.user_id = a.auth_user_id
  );

-- Keep the legacy aggregate status aligned with the two decisions.
update public.access_applications
set status = case
  when login_status = 'rejected' or payment_status = 'rejected' then 'rejected'
  when login_status = 'approved' and payment_status = 'approved' then 'approved'
  else 'pending'
end;

create index if not exists access_applications_approval_status_idx
  on public.access_applications (login_status, payment_status);
