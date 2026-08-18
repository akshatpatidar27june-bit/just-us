create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create type public.chat_sender as enum ('her','him');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender public.chat_sender not null,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  her_seen boolean not null default false,
  him_seen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages(room_id, created_at);
create index if not exists messages_unread_her_idx on public.messages(room_id, her_seen) where her_seen = false;
create index if not exists messages_unread_him_idx on public.messages(room_id, him_seen) where him_seen = false;

insert into public.rooms(id) select gen_random_uuid() where not exists (select 1 from public.rooms);

alter table public.rooms enable row level security;
alter table public.messages enable row level security;

-- The public client has no identity under the requested no-login architecture.
-- Production deployments should expose only the narrow RPC/API surface required by the app.
create or replace function public.send_message(p_room_id uuid, p_sender public.chat_sender, p_content text)
returns public.messages language plpgsql security definer set search_path = public as $$
declare m public.messages;
begin
  if not exists (select 1 from rooms where id = p_room_id) then raise exception 'Room not found'; end if;
  insert into messages(room_id,sender,content,her_seen,him_seen)
  values (p_room_id,p_sender,trim(p_content),p_sender='her',p_sender='him') returning * into m;
  return m;
end; $$;

create or replace function public.mark_seen(p_message_ids uuid[], p_viewer public.chat_sender)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_viewer = 'her' then update messages set her_seen=true where id=any(p_message_ids) and sender='him';
  else update messages set him_seen=true where id=any(p_message_ids) and sender='her'; end if;
end; $$;

create or replace function public.cleanup_seen_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from messages where id=coalesce(new.id,old.id) and her_seen=true and him_seen=true;
  return coalesce(new,old);
end; $$;

drop trigger if exists cleanup_fully_seen_message on public.messages;
create trigger cleanup_fully_seen_message after update of her_seen,him_seen on public.messages for each row execute function public.cleanup_seen_messages();

alter publication supabase_realtime add table public.messages;
