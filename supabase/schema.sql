-- Beautiful Reminders: schema (idempotent; safe to run more than once).
-- Only touches tables prefixed br_. The project also hosts other apps' tables: never touch them.

create table if not exists public.br_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  parent_id uuid references public.br_goals (id) on delete cascade, -- null = top-level goal
  kind text not null check (kind in ('deadline', 'habit', 'passive', 'collection', 'task')),
  title text not null,
  notes text,
  emoji text,
  due_date date,                                   -- deadline goals (optional on others)
  start_date date not null default current_date,   -- for "time elapsed" and habit rates
  status text not null default 'active' check (status in ('want', 'active', 'done')),
  completed_at timestamptz,
  archived boolean not null default false,
  position integer not null default 0
);

-- One row per day a habit was done. No row = not done that day.
create table if not exists public.br_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  goal_id uuid not null references public.br_goals (id) on delete cascade,
  date date not null,
  note text,
  unique (goal_id, date)
);

create index if not exists br_goals_user_idx on public.br_goals (user_id);
create index if not exists br_goals_parent_idx on public.br_goals (parent_id);
create index if not exists br_checkins_user_idx on public.br_checkins (user_id);
create index if not exists br_checkins_goal_date_idx on public.br_checkins (goal_id, date);

do $rls$
declare
  t text;
begin
  foreach t in array array['br_goals', 'br_checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$rls$;

notify pgrst, 'reload schema';
