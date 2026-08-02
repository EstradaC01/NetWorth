-- NetWorth initial schema.
--
-- Two tables, both owned per-user and both protected by Row Level Security.
-- RLS is the real security boundary here: middleware can be bypassed, but a
-- policy denies at the database. Policies ship in this same migration as the
-- `enable row level security` statements, because a table with RLS enabled
-- and no policy is silently invisible — the app looks broken with no error.

-- ── items ────────────────────────────────────────────────────────────────

-- An enum rather than a check constraint: the set is closed and duplicated
-- across TypeScript, the palette and route params, so rejecting a typo'd
-- 'liquids' at the database boundary is worth the cost of `alter type` if a
-- fifth category is ever added.
create type public.item_category as enum ('liquid', 'invest', 'physical', 'liab');

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  cat         public.item_category not null,
  name        text not null check (length(trim(name)) between 1 and 120),
  -- Money is an integer count of centavos, never a float. bigint rather than
  -- int4: int4 would cap a single item at ~₱21.4M, which a Manila property
  -- can exceed. Liabilities are stored positive and subtracted in the app.
  value_cents bigint not null check (value_cents >= 0),
  notes       text check (notes is null or length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index items_user_cat_idx on public.items (user_id, cat);

-- ── snapshots ────────────────────────────────────────────────────────────

-- One row per user per month, holding that month's category totals. The
-- history chart reads only real recorded rows; nothing is ever synthesised.
-- `month` is pinned to the 1st, computed in Asia/Manila by the application.
create table public.snapshots (
  user_id        uuid not null references auth.users (id) on delete cascade,
  month          date not null,
  liquid_cents   bigint not null default 0,
  invest_cents   bigint not null default 0,
  physical_cents bigint not null default 0,
  liab_cents     bigint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, month),
  constraint snapshots_month_is_first check (extract(day from month) = 1)
);

create index snapshots_user_month_idx on public.snapshots (user_id, month desc);

-- ── updated_at maintenance ───────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

create trigger snapshots_touch_updated_at
  before update on public.snapshots
  for each row execute function public.touch_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────

-- Tables created by a migration do not pick up the privileges Supabase grants
-- to dashboard-created tables, so `authenticated` must be granted DML
-- explicitly — without this every query fails with "permission denied for
-- table items" before RLS is ever consulted.
--
-- Grants say which roles may touch the table at all; the policies below then
-- decide which ROWS they see. `anon` is granted nothing: no unauthenticated
-- request has any business here.
grant select, insert, update, delete on public.items     to authenticated;
grant select, insert, update, delete on public.snapshots to authenticated;

-- service_role is the server-side administrative key (backups, migrations,
-- support tooling). It bypasses RLS by design, so it must never be exposed to
-- a browser — but it still needs table-level DML to function at all.
grant select, insert, update, delete on public.items     to service_role;
grant select, insert, update, delete on public.snapshots to service_role;

-- ── Row Level Security ───────────────────────────────────────────────────

alter table public.items     enable row level security;
alter table public.snapshots enable row level security;

-- `(select auth.uid())` rather than a bare `auth.uid()`: the subselect is
-- evaluated once as an InitPlan instead of re-evaluated per row.
-- `to authenticated` rejects anonymous requests before the predicate runs.

create policy items_select on public.items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy items_insert on public.items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy items_update on public.items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy items_delete on public.items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy snapshots_select on public.snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy snapshots_insert on public.snapshots
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy snapshots_update on public.snapshots
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy snapshots_delete on public.snapshots
  for delete to authenticated
  using ((select auth.uid()) = user_id);
