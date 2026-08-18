-- Keep messages visible after the first time they are seen.
-- On the next chat open, messages already seen by both people are removed.

create or replace function public.mark_seen(p_message_ids uuid[], p_viewer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_viewer not in ('her','him') then
    raise exception 'Invalid viewer role';
  end if;

  if p_viewer = 'her' then
    update public.messages
    set her_seen = true
    where id = any(p_message_ids)
      and sender = 'him'
      and her_seen = false;
  else
    update public.messages
    set him_seen = true
    where id = any(p_message_ids)
      and sender = 'her'
      and him_seen = false;
  end if;
end;
$$;

revoke all on function public.mark_seen(uuid[], text) from public;
grant execute on function public.mark_seen(uuid[], text) to anon, authenticated;

create or replace function public.cleanup_seen_messages(p_room_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.messages
  where room_id = p_room_id
    and her_seen = true
    and him_seen = true;
$$;

revoke all on function public.cleanup_seen_messages(uuid) from public;
grant execute on function public.cleanup_seen_messages(uuid) to anon, authenticated;
