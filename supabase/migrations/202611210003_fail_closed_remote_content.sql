alter table public.rooms
  add column if not exists e2ee_protocol text not null default 'disabled'
  check (e2ee_protocol in ('disabled', 'MLSv1'));

update public.pairing_invitations
set revoked_at = coalesce(revoked_at, now())
where consumed_at is null
  and revoked_at is null;

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
    or invite_code !~ '^[A-Za-z0-9_-]{43}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '48 hours'
  then
    raise exception 'invalid_room_or_invitation';
  end if;

  insert into public.rooms(code, status, expires_at, e2ee_protocol)
  values (room_code, 'waiting', invitation_expires_at, 'disabled')
  returning id into new_room_id;

  insert into public.room_members(room_id, device_id)
  values (new_room_id, auth.uid()::text);

  insert into public.pairing_invitations(room_id, code, expires_at)
  values (new_room_id, invite_code, invitation_expires_at);

  return new_room_id;
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
  if invite_code !~ '^[A-Za-z0-9_-]{43}$'
    or invitation_expires_at <= now()
    or invitation_expires_at > now() + interval '48 hours'
  then
    raise exception 'invalid_invitation';
  end if;

  perform 1
  from public.rooms
  where id = target_room
    and status not in ('archived', 'deleting')
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

create or replace function public.room_content_enabled(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and public.member_of_room(target_room)
    and exists (
      select 1
      from public.rooms
      where id = target_room
        and e2ee_protocol = 'MLSv1'
        and status = 'paired'
    );
$$;

revoke all on function public.room_content_enabled(uuid) from public, anon;
grant execute on function public.room_content_enabled(uuid) to authenticated;

drop policy if exists room_member_chat on public.chat_messages;
create policy room_member_chat on public.chat_messages
  for all
  using (
    public.room_content_enabled(room_id)
    and (expires_at is null or expires_at > now())
  )
  with check (
    public.room_content_enabled(room_id)
    and sender_device_id = auth.uid()::text
  );

drop policy if exists room_member_state on public.game_sessions;
create policy remote_game_sessions_disabled on public.game_sessions
  for all using (false)
  with check (false);

alter table public.media_records
  add column if not exists upload_status text not null default 'legacy'
    check (upload_status in ('legacy', 'pending', 'ready')),
  add column if not exists payload_sha256 text,
  add column if not exists payload_bytes bigint;
alter table public.media_records alter column upload_status set default 'pending';

create or replace function public.enforce_remote_media_gate()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' and not public.room_content_enabled(new.room_id) then
    raise exception 'remote_content_disabled';
  end if;
  if tg_op = 'UPDATE' and new.claim_token is not null then
    if not public.room_content_enabled(new.room_id) then
      raise exception 'remote_content_disabled';
    end if;
    if new.upload_status <> 'ready' then
      raise exception 'media_not_uploaded';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_remote_media_gate on public.media_records;
create trigger enforce_remote_media_gate
before insert or update on public.media_records
for each row execute function public.enforce_remote_media_gate();

create or replace function public.register_media_upload(
  target_media uuid,
  target_sha256 text,
  target_bytes bigint
)
returns table(storage_path text, already_uploaded boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  media public.media_records%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if target_sha256 is null
    or target_bytes is null
    or target_sha256 !~ '^[0-9a-f]{64}$'
    or target_bytes < 32
    or target_bytes > 52428800
  then
    raise exception 'invalid_media_upload';
  end if;

  select record.* into media
  from public.media_records record
  where record.id = target_media
    and record.created_by = auth.uid()
    and public.member_of_room(record.room_id)
  for update;

  if media.id is null then
    raise exception 'media_unavailable';
  end if;
  if not public.room_content_enabled(media.room_id) then
    raise exception 'remote_content_disabled';
  end if;
  if media.consumed_at is not null
    or (media.expires_at is not null and media.expires_at <= clock_timestamp())
  then
    raise exception 'media_expired_or_consumed';
  end if;
  if media.payload_sha256 is not null
    and (media.payload_sha256 <> target_sha256 or media.payload_bytes <> target_bytes)
  then
    raise exception 'media_upload_conflict';
  end if;

  update public.media_records
  set payload_sha256 = target_sha256,
      payload_bytes = target_bytes
  where id = target_media
    and payload_sha256 is null;

  return query
  select media.storage_path, media.upload_status = 'ready';
end;
$$;

create or replace function public.complete_media_upload(
  target_media uuid,
  target_sha256 text,
  target_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  update public.media_records as media
  set upload_status = 'ready'
  where media.id = target_media
    and media.payload_sha256 = target_sha256
    and media.payload_bytes = target_bytes
    and media.upload_status in ('pending', 'ready')
    and media.consumed_at is null
    and (media.expires_at is null or media.expires_at > clock_timestamp())
    and exists (
      select 1
      from public.rooms as room
      where room.id = media.room_id
        and room.status = 'paired'
        and room.e2ee_protocol = 'MLSv1'
    );
  if not found then
    raise exception 'media_upload_conflict';
  end if;
end;
$$;

revoke all on function public.register_media_upload(uuid, text, bigint) from public, anon;
revoke all on function public.complete_media_upload(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.register_media_upload(uuid, text, bigint) to authenticated;
grant execute on function public.complete_media_upload(uuid, text, bigint) to service_role;
