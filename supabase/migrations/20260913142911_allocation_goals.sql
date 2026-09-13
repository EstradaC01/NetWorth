-- Replace the original one-goal-per-owner key with independent allocation
-- goals. Existing targets are retained and begin with no cash assigned.
alter table public.goals drop constraint goals_pkey;
alter table public.goals add column id uuid default gen_random_uuid();
update public.goals set id = gen_random_uuid() where id is null;
alter table public.goals alter column id set not null;
alter table public.goals add primary key (id);
alter table public.goals add column name text;
update public.goals set name = 'Savings goal' where name is null;
alter table public.goals alter column name set not null;
alter table public.goals add column allocated_cents bigint not null default 0 check (allocated_cents >= 0);
create index goals_user_created_idx on public.goals (user_id, created_at);

-- Keep the deliberate local-to-account import working for both the old
-- one-goal backup and the new multi-goal backup shape.
create or replace function public.import_local_backup(p_payload jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));
  if exists (select 1 from public.items where user_id = v_user_id)
    or exists (select 1 from public.snapshots where user_id = v_user_id)
    or exists (select 1 from public.item_events where user_id = v_user_id)
    or exists (select 1 from public.goals where user_id = v_user_id) then
    raise exception 'Local backup import requires an empty account';
  end if;
  insert into public.items (id, user_id, cat, name, value_cents, notes, created_at, updated_at)
  select row.id, v_user_id, row.cat::public.item_category, row.name, row.value_cents, row.notes, row.created_at, row.updated_at
  from jsonb_to_recordset(p_payload -> 'items') as row(id uuid, cat text, name text, value_cents bigint, notes text, created_at timestamptz, updated_at timestamptz);
  insert into public.snapshots (user_id, month, liquid_cents, invest_cents, physical_cents, liab_cents)
  select v_user_id, row.month, row.liquid_cents, row.invest_cents, row.physical_cents, row.liab_cents
  from jsonb_to_recordset(p_payload -> 'snapshots') as row(month date, liquid_cents bigint, invest_cents bigint, physical_cents bigint, liab_cents bigint);
  insert into public.item_events (id, user_id, item_id, kind, cat, item_name, before_cents, after_cents, created_at)
  select row.id, v_user_id, row.item_id, row.kind::public.item_event_kind, row.cat::public.item_category, row.item_name, row.before_cents, row.after_cents, row.created_at
  from jsonb_to_recordset(p_payload -> 'events') as row(id uuid, item_id uuid, kind text, cat text, item_name text, before_cents bigint, after_cents bigint, created_at timestamptz);
  if p_payload ? 'goals' then
    insert into public.goals (id, user_id, name, target_cents, allocated_cents, target_date, note)
    select row.id, v_user_id, row.name, row.target_cents, row.allocated_cents, row.target_date, row.note
    from jsonb_to_recordset(p_payload -> 'goals') as row(id uuid, name text, target_cents bigint, allocated_cents bigint, target_date date, note text);
  elsif p_payload ? 'goal' and p_payload -> 'goal' <> 'null'::jsonb then
    insert into public.goals (user_id, name, target_cents, allocated_cents, target_date, note)
    select v_user_id, 'Savings goal', row.target_cents, 0, row.target_date, row.note
    from jsonb_to_record(p_payload -> 'goal') as row(target_cents bigint, target_date date, note text);
  end if;
end;
$$;
