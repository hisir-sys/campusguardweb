-- One shared profile per account, edited from the website, the phone app and the desktop app.
create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  school_name text,
  phone text,
  alert_phones text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint account_profiles_len check (
    coalesce(char_length(full_name),0) <= 80 and coalesce(char_length(school_name),0) <= 120 and coalesce(char_length(phone),0) <= 20
    and coalesce(array_length(alert_phones,1),0) <= 5)
);
alter table public.account_profiles enable row level security;
revoke all on public.account_profiles from anon, authenticated;
