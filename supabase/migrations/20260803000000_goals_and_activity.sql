-- Goals and the item activity log.
--
-- Same rules as the initial migration: every table is owned per-user, RLS is
-- the security boundary, `authenticated` is granted DML explicitly (migration
-- tables do not inherit Supabase's dashboard grants), and `anon` gets nothing.

-- ── goals ────────────────────────────────────────────────────────────────

-- At most one active goal per user, enforced by making user_id the primary
-- key rather than by a partial unique index over a separate id. A goal is a
-- single aspiration, not a collection: the dashboard has room to render one
-- progress meter honestly, and a list of five targets would be a different
-- feature with a different UI.
create table public.goals (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  -- The target is a net-worth figure, so unlike items.value_cents it may be
  -- negative: a user climbing out of debt can legitimately aim at -₱200,000
  -- as an improvement on -₱800,000. No check constraint here for that reason.
  target_cents bigint not null,
  -- Optional deadline. Null means "no date, just the number" — a common and
  -- reasonable way to hold a goal, and forcing a date would invite fake ones.
  target_date  date,
  note         text check (note is null or length(note) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── item_events ──────────────────────────────────────────────────────────

-- An append-only log of what changed, so History can answer "why did the line
-- move in March?" rather than only "it moved".
--
-- Deliberately denormalised: item_name and the value columns are copied in at
-- write time instead of joining back to items. The log has to survive the
-- item being deleted — that deletion is precisely the event most worth
-- explaining — so a foreign key to items would either block the delete or
-- cascade away the record. item_id is kept as a plain uuid for grouping, with
-- no reference, for the same reason.
create type public.item_event_kind as enum ('add', 'edit', 'delete');

create table public.item_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     uuid not null,
  kind        public.item_event_kind not null,
  cat         public.item_category not null,
  item_name   text not null,
  -- Null on 'add' (nothing existed before) and populated on edit/delete.
  before_cents bigint,
  -- Null on 'delete' (nothing exists after) and populated on add/edit.
  after_cents  bigint,
  created_at  timestamptz not null default now()
);

-- The log is always read newest-first for one user, and filtered by month on
-- the history page; a descending index on (user_id, created_at) serves both.
create index item_events_user_time_idx
  on public.item_events (user_id, created_at desc);

-- ── updated_at maintenance ───────────────────────────────────────────────

-- Reuses the trigger function from the initial migration. item_events has no
-- updated_at by design: it is append-only and its rows are never edited.
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goals to service_role;

-- No update or delete for `authenticated` on the log: an audit trail the
-- subject can silently rewrite is not an audit trail. Users can still remove
-- their history wholesale by deleting their account, which cascades.
grant select, insert on public.item_events to authenticated;
grant select, insert, update, delete on public.item_events to service_role;

-- ── Row Level Security ───────────────────────────────────────────────────

alter table public.goals       enable row level security;
alter table public.item_events enable row level security;

-- `(select auth.uid())` for the InitPlan optimisation, as in the first
-- migration; `to authenticated` rejects anonymous requests before the
-- predicate runs.

create policy goals_select on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goals_insert on public.goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy goals_update on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goals_delete on public.goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Only select and insert exist for item_events. Without an update or delete
-- policy, those commands are denied for `authenticated` even though RLS is
-- otherwise permissive — matching the grants above with defence in depth.
create policy item_events_select on public.item_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy item_events_insert on public.item_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
