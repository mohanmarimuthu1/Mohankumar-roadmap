-- =============================================================================
-- Mohan Roadmap -- schema
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

-- ------------------------------------------------------------------ settings
create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  seeded_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- roadmap
create table if not exists public.phases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code       text not null,
  name       text not null,
  weeks      text default '',
  tag        text default '',
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  phase_id   uuid not null references public.phases (id) on delete cascade,
  title      text not null,
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  group_id     uuid not null references public.task_groups (id) on delete cascade,
  title        text not null,
  notes        text default '',
  done         boolean not null default false,
  completed_at timestamptz,
  order_idx    int  not null default 0,
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------------------- habits
-- cadence: 'daily' | 'weekly' | 'monthly'
create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  cadence    text not null check (cadence in ('daily', 'weekly', 'monthly')),
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

-- One row per completed period.
-- log_date is the *period key*: the day itself for daily habits, the Monday of
-- the ISO week for weekly, and the 1st of the month for monthly.
create table if not exists public.habit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  log_date   date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table if not exists public.rules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text not null,
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------- gym
create table if not exists public.gym_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  focus      text default '',
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  day_id       uuid not null references public.gym_days (id) on delete cascade,
  name         text not null,
  sets         int  not null default 3,
  reps         text default '',
  rest_seconds int  not null default 60,
  notes        text default '',
  order_idx    int  not null default 0,
  created_at   timestamptz not null default now()
);

-- One row per logged set.
create table if not exists public.gym_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  log_date    date not null default current_date,
  set_idx     int  not null default 1,
  weight      numeric(6, 2),
  reps        int,
  created_at  timestamptz not null default now(),
  unique (exercise_id, log_date, set_idx)
);

-- ----------------------------------------------------------------------- NEU
create table if not exists public.neu_sections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.neu_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  section_id   uuid not null references public.neu_sections (id) on delete cascade,
  text         text not null,
  done         boolean not null default false,
  completed_at timestamptz,
  order_idx    int  not null default 0,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------- resources
create table if not exists public.resources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   text not null default 'General',
  name       text not null,
  url        text not null,
  order_idx  int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- live feeds
-- Shared across users (populated by the refresh edge function and the
-- worker/ background process), so no user_id.
-- category: 'news' | 'models' | 'papers' | 'repos' | 'hn'
-- metadata: per-category extras -- download counts, stars, points, authors.
create table if not exists public.news_articles (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('news', 'models', 'papers', 'repos', 'hn')),
  source       text not null default '',
  title        text not null,
  url          text not null,
  summary      text default '',
  metadata     jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  fetched_at   timestamptz not null default now(),
  unique (category, url)
);

-- For projects created before metadata existed: create table if not exists
-- leaves an older table untouched, so add the column explicitly.
alter table public.news_articles
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------------- indexes
create index if not exists task_groups_phase_idx   on public.task_groups (phase_id, order_idx);
create index if not exists tasks_group_idx         on public.tasks (group_id, order_idx);
create index if not exists tasks_user_idx          on public.tasks (user_id);
create index if not exists phases_user_idx         on public.phases (user_id, order_idx);
create index if not exists habits_user_idx         on public.habits (user_id, cadence, order_idx);
create index if not exists habit_log_user_date_idx on public.habit_log (user_id, log_date desc);
create index if not exists rules_user_idx          on public.rules (user_id, order_idx);
create index if not exists gym_days_user_idx       on public.gym_days (user_id, order_idx);
create index if not exists exercises_day_idx       on public.exercises (day_id, order_idx);
create index if not exists gym_logs_user_date_idx  on public.gym_logs (user_id, log_date desc);
create index if not exists gym_logs_exercise_idx   on public.gym_logs (exercise_id, log_date desc);
create index if not exists neu_sections_user_idx   on public.neu_sections (user_id, order_idx);
create index if not exists neu_items_section_idx   on public.neu_items (section_id, order_idx);
create index if not exists resources_user_idx      on public.resources (user_id, category, order_idx);
create index if not exists news_cat_pub_idx        on public.news_articles (category, published_at desc);
create index if not exists news_published_idx      on public.news_articles (published_at desc);

-- =============================================================================
-- Row Level Security
-- One policy per user-owned table: full access to your own rows, none to
-- anybody elses. user_settings keys on user_id as its PK, so the same generic
-- policy covers it.
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings', 'phases', 'task_groups', 'tasks', 'habits', 'habit_log',
    'rules', 'gym_days', 'exercises', 'gym_logs', 'neu_sections', 'neu_items',
    'resources'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- news_articles: readable by any signed-in user, written only by the service
-- role (the edge function), which bypasses RLS.
alter table public.news_articles enable row level security;
drop policy if exists news_read on public.news_articles;
create policy news_read on public.news_articles
  for select to authenticated using (true);

-- ------------------------------------------------------------- realtime feed
-- Lets the Live tab subscribe to inserts on news_articles.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'news_articles'
  ) then
    alter publication supabase_realtime add table public.news_articles;
  end if;
end $$;

-- =============================================================================
-- Grants + schema cache
-- PostgREST only exposes tables the API roles hold privileges on, and it serves
-- from a cached introspection. Without these, a table can exist in Postgres yet
-- still 404 as PGRST205 ("could not find the table in the schema cache").
-- Supabase's default privileges normally cover this; stating it explicitly makes
-- the script correct regardless of which role runs it.
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- =============================================================================
-- Verification
-- A partial apply is the failure mode that hurts: the tables that did land look
-- healthy, the app half-works, and nothing says why. Fail loudly instead.
-- =============================================================================
do $$
declare
  missing text[];
begin
  select array_agg(t order by t) into missing
  from unnest(array[
    'user_settings', 'phases', 'task_groups', 'tasks', 'habits', 'habit_log',
    'rules', 'gym_days', 'exercises', 'gym_logs', 'neu_sections', 'neu_items',
    'resources', 'news_articles'
  ]) as t
  where to_regclass('public.' || t) is null;

  if missing is not null then
    raise exception 'schema incomplete -- % table(s) missing: %',
      array_length(missing, 1), array_to_string(missing, ', ');
  end if;

  raise notice 'schema ok: all 14 tables present';
end $$;

notify pgrst, 'reload schema';
