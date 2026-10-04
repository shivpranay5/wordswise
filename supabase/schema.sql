-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null,
  due timestamptz not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table if not exists public.day_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  data jsonb not null,
  primary key (user_id, day)
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null
);

create table if not exists public.custom_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Row Level Security: each user can only see and change their own rows.
alter table public.progress enable row level security;
alter table public.day_logs enable row level security;
alter table public.settings enable row level security;
alter table public.custom_words enable row level security;

do $$
declare t text;
begin
  foreach t in array array['progress','day_logs','settings','custom_words'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
