-- Phone app push notifications: one row per signed-in phone. Run once in the Supabase SQL Editor.
-- Like the sync tables, it is only reachable through the API routes (service role), never directly.

create table if not exists public.push_devices (
    token text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    platform text not null check (platform in ('ios', 'android')),
    created_at timestamptz not null default now(),
    last_seen timestamptz not null default now()
);

create index if not exists push_devices_user_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;
revoke all on table public.push_devices from anon, authenticated;
