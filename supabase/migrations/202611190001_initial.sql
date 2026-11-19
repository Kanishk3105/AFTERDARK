create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting',
  revocation_version integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.room_members (
  room_id uuid references public.rooms(id) on delete cascade,
  device_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (room_id, device_id)
);

create table if not exists public.pairing_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  code text unique not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  game_id text not null,
  mood_id text not null,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'in-progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  room_code text not null,
  sender_device_id text not null,
  sealed_content text,
  media_id uuid,
  media_expiry text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.card_history (
  room_id uuid references public.rooms(id) on delete cascade,
  card_id text not null,
  fingerprint text not null,
  game_id text not null,
  seen_at timestamptz not null default now(),
  primary key (room_id, card_id)
);

create table if not exists public.device_tokens (
  device_id text primary key,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create or replace function public.current_device_id()
returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'device_id', '')
$$;

create or replace function public.member_of_room(room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members
    where room_id = room
      and device_id = public.current_device_id()
      and revoked_at is null
  );
$$;

create or replace function public.join_room(invite_code text, joining_device text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invitation public.pairing_invitations%rowtype;
  active_count integer;
begin
  select * into invitation
  from public.pairing_invitations
  where code = invite_code
    and consumed_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invitation.id is null then raise exception 'invalid_or_expired_invitation'; end if;

  select count(*) into active_count
  from public.room_members
  where room_id = invitation.room_id and revoked_at is null;

  if active_count >= 2 then raise exception 'room_is_full'; end if;

  insert into public.room_members(room_id, device_id)
  values (invitation.room_id, joining_device)
  on conflict (room_id, device_id) do update
    set revoked_at = null;

  update public.pairing_invitations
  set consumed_at = now()
  where id = invitation.id;

  update public.rooms set status = 'paired'
  where id = invitation.room_id;

  return invitation.room_id;
end;
$$;

create or replace function public.revoke_room(target_room uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;
  update public.room_members
  set revoked_at = now()
  where room_id = target_room;
  update public.rooms
  set status = 'archived',
      revocation_version = revocation_version + 1
  where id = target_room;
end;
$$;

create or replace function public.enforce_two_room_members()
returns trigger language plpgsql as $$
declare
  active_count integer;
begin
  if new.revoked_at is not null then return new; end if;
  select count(*) into active_count
  from public.room_members
  where room_id = new.room_id
    and revoked_at is null
    and device_id <> coalesce(new.device_id, '');

  if active_count >= 2 then
    raise exception 'room_is_full';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_two_room_members on public.room_members;
create trigger enforce_two_room_members
before insert or update on public.room_members
for each row execute function public.enforce_two_room_members();

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.pairing_invitations enable row level security;
alter table public.game_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.card_history enable row level security;
alter table public.device_tokens enable row level security;

create policy room_member_read on public.rooms
  for select using (public.member_of_room(id));

create policy room_member_state on public.game_sessions
  for all using (public.member_of_room(room_id))
  with check (public.member_of_room(room_id));

create policy room_member_chat on public.chat_messages
  for all using (public.member_of_room(room_id))
  with check (public.member_of_room(room_id));

create policy room_member_history on public.card_history
  for all using (public.member_of_room(room_id))
  with check (public.member_of_room(room_id));
