-- CampusGuard private download request schema
-- Run once in the Supabase SQL Editor.

create table if not exists public.download_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    user_email text not null,
    user_name text,
    product text not null default 'CampusGuard for Windows',
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    payment_confirmed boolean not null default false,
    owner_note text,
    requested_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by text
);

create index if not exists download_requests_status_requested_idx
    on public.download_requests (status, requested_at desc);
create index if not exists download_requests_user_requested_idx
    on public.download_requests (user_id, requested_at desc);

alter table public.download_requests enable row level security;
revoke all on table public.download_requests from anon, authenticated;

-- Create a PRIVATE Storage bucket named campusguard-downloads in the Supabase dashboard.
-- Upload the installer as exactly CampusGuard.exe. Do not make the bucket public.
