-- CampusGuard app -> website sync (summary + incident METADATA only; no video, images or file paths).
-- Run once in the Supabase SQL Editor.

create table if not exists public.school_servers (
    user_id uuid not null references auth.users(id) on delete cascade,
    server_id text not null,
    server_name text not null,
    app_version text,
    cameras_total integer not null default 0,
    cameras_ai_enabled integer not null default 0,
    cameras_online integer,
    open_incidents integer not null default 0,
    last_seen timestamptz not null default now(),
    primary key (user_id, server_id)
);

create table if not exists public.school_incidents (
    user_id uuid not null references auth.users(id) on delete cascade,
    server_id text not null,
    incident_id text not null,
    camera_name text not null,
    happened_at timestamptz not null,
    event text not null,
    confidence double precision not null,
    severity text not null,
    status text not null,
    has_footage boolean not null default false,
    source_seq bigint not null default 0,
    updated_at timestamptz not null default now(),
    primary key (user_id, server_id, incident_id)
);

create index if not exists school_incidents_user_time_idx
    on public.school_incidents (user_id, happened_at desc);

alter table public.school_servers enable row level security;
alter table public.school_incidents enable row level security;
revoke all on table public.school_servers from anon, authenticated;
revoke all on table public.school_incidents from anon, authenticated;
-- Access is only through the /api/sync-push and /api/sync-data routes (service role, after token + approval checks).
