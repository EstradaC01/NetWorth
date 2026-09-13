-- Atomically copies a validated local backup into the caller's own account.
-- SECURITY INVOKER keeps normal table grants and RLS in force; the explicit
-- auth.uid() assignment prevents supplied JSON from choosing an owner.
create function public.import_local_backup(p_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize check-and-import per account. Without this, two tabs could
  -- both observe an empty account and merge two backups concurrently.
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  -- Import is deliberately a first-time migration, not a hidden merge. This
  -- prevents a local backup from overwriting an account's recorded history or
  -- goal. The check and all writes share this transaction.
  if exists (select 1 from public.items where user_id = v_user_id)
    or exists (select 1 from public.snapshots where user_id = v_user_id)
    or exists (select 1 from public.item_events where user_id = v_user_id)
    or exists (select 1 from public.goals where user_id = v_user_id) then
    raise exception 'Local backup import requires an empty account';
  end if;

  insert into public.items (id, user_id, cat, name, value_cents, notes, created_at, updated_at)
  select row.id, v_user_id, row.cat::public.item_category, row.name,
         row.value_cents, row.notes, row.created_at, row.updated_at
  from jsonb_to_recordset(p_payload -> 'items') as row(
    id uuid, cat text, name text, value_cents bigint, notes text,
    created_at timestamptz, updated_at timestamptz
  )
  ;

  insert into public.snapshots (user_id, month, liquid_cents, invest_cents, physical_cents, liab_cents)
  select v_user_id, row.month, row.liquid_cents, row.invest_cents,
         row.physical_cents, row.liab_cents
  from jsonb_to_recordset(p_payload -> 'snapshots') as row(
    month date, liquid_cents bigint, invest_cents bigint,
    physical_cents bigint, liab_cents bigint
  )
  ;

  insert into public.item_events (id, user_id, item_id, kind, cat, item_name, before_cents, after_cents, created_at)
  select row.id, v_user_id, row.item_id, row.kind::public.item_event_kind, row.cat::public.item_category,
         row.item_name, row.before_cents, row.after_cents, row.created_at
  from jsonb_to_recordset(p_payload -> 'events') as row(
    id uuid, item_id uuid, kind text, cat text, item_name text,
    before_cents bigint, after_cents bigint, created_at timestamptz
  )
  ;

  if p_payload ? 'goal' and p_payload -> 'goal' <> 'null'::jsonb then
    insert into public.goals (user_id, target_cents, target_date, note)
    select v_user_id, row.target_cents, row.target_date, row.note
    from jsonb_to_record(p_payload -> 'goal') as row(
      target_cents bigint, target_date date, note text
    )
    ;
  end if;
end;
$$;

revoke execute on function public.import_local_backup(jsonb) from public, anon;
grant execute on function public.import_local_backup(jsonb) to authenticated;
