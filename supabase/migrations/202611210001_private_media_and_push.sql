create table if not exists public.media_records (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null,
  storage_path text not null unique,
  content_type text not null,
  expiry_policy text not null check (expiry_policy in ('view-once', '5s', '10s', '30s', 'keep')),
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz,
  claim_token uuid,
  claimant_id uuid,
  claim_expires_at timestamptz,
  check (
    (expiry_policy = 'keep' and expires_at is null)
    or expiry_policy <> 'keep'
  )
);

alter table public.chat_messages
  add column if not exists media_type text,
  add column if not exists media_mime text;

create index if not exists media_records_cleanup_idx
  on public.media_records(expires_at)
  where expires_at is not null;
create index if not exists media_records_consumed_idx
  on public.media_records(consumed_at)
  where consumed_at is not null;

alter table public.media_records enable row level security;
revoke all on public.media_records from anon, authenticated;
grant select on public.media_records to authenticated;

drop policy if exists media_owner_metadata on public.media_records;
create policy media_owner_metadata on public.media_records
  for select to authenticated
  using (created_by = auth.uid() and public.member_of_room(room_id));

create or replace function public.create_media_record(
  target_media uuid,
  target_room uuid,
  target_expiry_policy text,
  target_content_type text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  object_path text;
begin
  if auth.uid() is null or not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;
  if target_expiry_policy not in ('view-once', '5s', '10s', '30s', 'keep') then
    raise exception 'invalid_expiry_policy';
  end if;
  if target_content_type not like 'image/%'
    and target_content_type not like 'video/%'
    and target_content_type not like 'audio/%'
  then
    raise exception 'invalid_media_type';
  end if;

  object_path := target_room::text || '/' || target_media::text;
  insert into public.media_records(
    id, room_id, created_by, storage_path, content_type, expiry_policy
  )
  values (
    target_media, target_room, auth.uid(), object_path, target_content_type, target_expiry_policy
  )
  on conflict (id) do nothing;
  if not exists (
    select 1 from public.media_records
    where id = target_media
      and room_id = target_room
      and created_by = auth.uid()
      and storage_path = object_path
      and content_type = target_content_type
      and expiry_policy = target_expiry_policy
  ) then
    raise exception 'media_id_conflict';
  end if;
  return object_path;
end;
$$;

create or replace function public.claim_media_view(
  target_media uuid,
  target_claim_token uuid default gen_random_uuid()
)
returns table(storage_path text, content_type text, expiry_policy text, authorized_claim_token uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  media public.media_records%rowtype;
  started_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select record.* into media
  from public.media_records as record
  where record.id = target_media
    and public.member_of_room(record.room_id)
  for update;

  if media.id is null then
    raise exception 'media_unavailable';
  end if;
  started_at := clock_timestamp();
  if media.created_by = auth.uid() then
    raise exception 'sender_cannot_consume_media';
  end if;
  if media.consumed_at is not null
    or (media.expires_at is not null and media.expires_at <= started_at)
  then
    raise exception 'media_expired_or_consumed';
  end if;

  if media.expiry_policy <> 'keep' then
    if media.claim_token is not null and media.claim_expires_at > started_at
      and (media.claim_token <> target_claim_token or media.claimant_id <> auth.uid())
    then
      raise exception 'media_claimed';
    end if;
    update public.media_records
    set claim_token = target_claim_token,
        claimant_id = auth.uid(),
        claim_expires_at = started_at + interval '2 minutes'
    where id = target_media;
  end if;

  return query select media.storage_path, media.content_type, media.expiry_policy, target_claim_token;
end;
$$;

create or replace function public.release_media_view(
  target_media uuid,
  target_claim_token uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.media_records
  set claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where id = target_media
    and claimant_id = auth.uid()
    and claim_token = target_claim_token
    and consumed_at is null;
end;
$$;

create or replace function public.complete_media_view(
  target_media uuid,
  target_claim_token uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.media_records
  set viewed_at = coalesce(viewed_at, clock_timestamp()),
      expires_at = case expiry_policy
        when '5s' then coalesce(expires_at, clock_timestamp() + interval '5 seconds')
        when '10s' then coalesce(expires_at, clock_timestamp() + interval '10 seconds')
        when '30s' then coalesce(expires_at, clock_timestamp() + interval '30 seconds')
        else expires_at
      end,
      consumed_at = case when expiry_policy = 'view-once' then clock_timestamp() else consumed_at end,
      claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where id = target_media
    and expiry_policy <> 'keep'
    and claimant_id = auth.uid()
    and claim_token = target_claim_token
    and consumed_at is null;
  if not found then raise exception 'media_claim_unavailable'; end if;
end;
$$;

create or replace function public.media_cleanup_candidates(max_age interval default interval '1 hour')
returns table(id uuid, storage_path text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  return query
  select media.id, media.storage_path
  from public.media_records media
  where media.consumed_at is not null
    or (media.expires_at is not null and media.expires_at <= now())
    or (
      media.created_at <= now() - max_age
      and not exists (
        select 1 from public.chat_messages message where message.media_id = media.id
      )
    )
  order by coalesce(media.expires_at, media.consumed_at, media.created_at)
  limit 100;
end;
$$;

revoke all on function public.create_media_record(uuid, uuid, text, text) from public, anon;
revoke all on function public.claim_media_view(uuid, uuid) from public, anon;
revoke all on function public.release_media_view(uuid, uuid) from public, anon;
revoke all on function public.complete_media_view(uuid, uuid) from public, anon;
revoke all on function public.media_cleanup_candidates(interval) from public, anon, authenticated;
grant execute on function public.create_media_record(uuid, uuid, text, text) to authenticated;
grant execute on function public.claim_media_view(uuid, uuid) to authenticated;
grant execute on function public.release_media_view(uuid, uuid) to authenticated;
grant execute on function public.complete_media_view(uuid, uuid) to authenticated;
grant execute on function public.media_cleanup_candidates(interval) to service_role;

insert into storage.buckets (id, name, public)
values ('afterdark-private-media', 'afterdark-private-media', false)
on conflict (id) do update set public = false;

drop policy if exists afterdark_media_upload on storage.objects;
drop policy if exists afterdark_media_update on storage.objects;
drop policy if exists afterdark_media_no_direct_read on storage.objects;
create policy afterdark_media_no_direct_read on storage.objects
  for select to authenticated
  using (false);

alter table public.device_tokens
  add column if not exists room_id uuid references public.rooms(id) on delete cascade,
  add column if not exists user_id uuid;

create table if not exists public.notification_settings (
  user_id uuid not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  messages boolean not null default true,
  game_invites boolean not null default true,
  partner_activity boolean not null default false,
  trophies boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  time_zone text not null default 'UTC',
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

alter table public.notification_settings enable row level security;
grant select, insert, update on public.notification_settings to authenticated;
drop policy if exists notification_settings_owner on public.notification_settings;
create policy notification_settings_owner on public.notification_settings
  for all to authenticated
  using (user_id = auth.uid() and public.member_of_room(room_id))
  with check (user_id = auth.uid() and public.member_of_room(room_id));

drop policy if exists device_tokens_owner on public.device_tokens;
create policy device_tokens_owner on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid() and room_id is not null and public.member_of_room(room_id))
  with check (user_id = auth.uid() and room_id is not null and public.member_of_room(room_id));

create or replace function public.register_device_token(
  target_room uuid,
  push_token text,
  platform_name text default 'android'
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;
  if length(push_token) < 20 or platform_name not in ('android', 'ios', 'web') then
    raise exception 'invalid_device_token';
  end if;

  insert into public.device_tokens(device_id, token, platform, room_id, user_id, updated_at)
  values (auth.uid()::text, push_token, platform_name, target_room, auth.uid(), now())
  on conflict (device_id) do update
  set token = excluded.token,
      platform = excluded.platform,
      room_id = excluded.room_id,
      user_id = excluded.user_id,
      updated_at = now();
end;
$$;

create or replace function public.unregister_device_token(target_room uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;
  delete from public.device_tokens
  where room_id = target_room and user_id = auth.uid();
end;
$$;

revoke all on function public.register_device_token(uuid, text, text) from public, anon;
revoke all on function public.unregister_device_token(uuid) from public, anon;
grant execute on function public.register_device_token(uuid, text, text) to authenticated;
grant execute on function public.unregister_device_token(uuid) to authenticated;

create or replace function public.revoke_room(target_room uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;

  update public.room_members
  set revoked_at = now()
  where room_id = target_room and revoked_at is null;
  update public.pairing_invitations
  set revoked_at = now()
  where room_id = target_room and revoked_at is null;
  update public.rooms
  set status = 'archived',
      revocation_version = revocation_version + 1
  where id = target_room;
  update public.media_records
  set consumed_at = coalesce(consumed_at, now()),
      claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where room_id = target_room;
  update public.chat_messages
  set expires_at = now()
  where room_id = target_room;
  delete from public.device_tokens where room_id = target_room;
end;
$$;

revoke all on function public.revoke_room(uuid) from public, anon;
grant execute on function public.revoke_room(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
