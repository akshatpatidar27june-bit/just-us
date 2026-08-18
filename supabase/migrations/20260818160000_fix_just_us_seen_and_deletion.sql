-- Just Us: fix public no-login chat permissions and realtime deletion events.

create policy "just_us_delete_messages"
on public.messages
for delete
to anon, authenticated
using (true);

alter table public.messages replica identity full;

-- Keep one unambiguous mark_seen overload for the frontend, which sends a text role.
drop function if exists public.mark_seen(uuid[], public.chat_sender);

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

  -- Once both people have seen a message, remove it permanently.
  delete from public.messages
  where id = any(p_message_ids)
    and her_seen = true
    and him_seen = true;
end;
$$;

revoke all on function public.mark_seen(uuid[], text) from public;
grant execute on function public.mark_seen(uuid[], text) to anon, authenticated;
