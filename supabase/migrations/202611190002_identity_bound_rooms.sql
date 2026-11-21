create or replace function public.member_of_room(room uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.room_members
    where room_id = room
      and device_id = auth.uid()::text
      and revoked_at is null
  );
$$;

create or replace function public.enforce_two_room_members()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  perform 1
  from public.rooms
  where id = new.room_id
  for update;

  if new.revoked_at is not null then
    return new;
  end if;

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

create or replace function public.create_room(
  room_code text,
  invite_code text,
  invitation_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_room_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if room_code !~ '^[A-Z0-9]{6,12}$'
    or invite_code !~ '^[A-Z0-9]{6,12}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '48 hours'
  then
    raise exception 'invalid_room_or_invitation';
  end if;

  insert into public.rooms(code, status, expires_at)
  values (room_code, 'waiting', invitation_expires_at)
  returning id into new_room_id;

  insert into public.room_members(room_id, device_id)
  values (new_room_id, auth.uid()::text);

  insert into public.pairing_invitations(room_id, code, expires_at)
  values (new_room_id, invite_code, invitation_expires_at);

  return new_room_id;
end;
$$;

create or replace function public.join_room(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation public.pairing_invitations%rowtype;
  active_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into invitation
  from public.pairing_invitations
  where code = invite_code
    and consumed_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invitation.id is null then
    raise exception 'invalid_or_expired_invitation';
  end if;

  perform 1
  from public.rooms
  where id = invitation.room_id
    and status <> 'archived'
  for update;

  if not found then
    raise exception 'room_unavailable';
  end if;

  select count(*) into active_count
  from public.room_members
  where room_id = invitation.room_id
    and revoked_at is null;

  if active_count >= 2 then
    raise exception 'room_is_full';
  end if;

  insert into public.room_members(room_id, device_id)
  values (invitation.room_id, auth.uid()::text);

  update public.pairing_invitations
  set consumed_at = now()
  where id = invitation.id;

  update public.rooms
  set status = 'paired'
  where id = invitation.room_id;

  return invitation.room_id;
end;
$$;

create or replace function public.create_invitation(
  target_room uuid,
  invite_code text,
  invitation_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_id uuid;
begin
  if auth.uid() is null or not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;
  if invite_code !~ '^[A-Z0-9]{6,12}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '48 hours'
  then
    raise exception 'invalid_invitation';
  end if;

  perform 1
  from public.rooms
  where id = target_room
    and status <> 'archived'
  for update;
  if not found then
    raise exception 'room_unavailable';
  end if;

  insert into public.pairing_invitations(room_id, code, expires_at)
  values (target_room, invite_code, invitation_expires_at)
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.revoke_room(target_room uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;

  update public.room_members
  set revoked_at = now()
  where room_id = target_room
    and revoked_at is null;

  update public.pairing_invitations
  set revoked_at = now()
  where room_id = target_room
    and revoked_at is null;

  update public.rooms
  set status = 'archived',
      revocation_version = revocation_version + 1
  where id = target_room;
end;
$$;

drop policy if exists room_member_read on public.rooms;
create policy room_member_read on public.rooms
  for select using (public.member_of_room(id));

drop policy if exists room_member_state on public.game_sessions;
create policy room_member_state on public.game_sessions
  for all using (public.member_of_room(room_id))
  with check (public.member_of_room(room_id));

drop policy if exists room_member_chat on public.chat_messages;
create policy room_member_chat on public.chat_messages
  for all
  using (public.member_of_room(room_id) and (expires_at is null or expires_at > now()))
  with check (
    public.member_of_room(room_id)
    and sender_device_id = auth.uid()::text
  );

drop policy if exists room_member_history on public.card_history;
create policy room_member_history on public.card_history
  for all using (public.member_of_room(room_id))
  with check (public.member_of_room(room_id));

drop policy if exists room_member_members on public.room_members;
create policy room_member_members on public.room_members
  for select using (public.member_of_room(room_id));

drop policy if exists room_member_invitation_read on public.pairing_invitations;
drop policy if exists room_member_invitation_write on public.pairing_invitations;
drop policy if exists room_member_tokens on public.device_tokens;

revoke all on function public.join_room(text, text) from public, anon, authenticated;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.create_room(text, text, timestamptz) from public, anon;
revoke all on function public.create_invitation(uuid, text, timestamptz) from public, anon;
revoke all on function public.revoke_room(uuid) from public, anon;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.create_room(text, text, timestamptz) to authenticated;
grant execute on function public.create_invitation(uuid, text, timestamptz) to authenticated;
grant execute on function public.revoke_room(uuid) to authenticated;
