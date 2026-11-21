alter table public.media_records
  add column if not exists last_claim_token uuid,
  add column if not exists last_claimant_id uuid,
  add column if not exists last_completed_at timestamptz;

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
  claimed_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if target_claim_token is null then
    raise exception 'invalid_claim_token';
  end if;

  select record.* into media
  from public.media_records as record
  where record.id = target_media
    and public.member_of_room(record.room_id)
  for update;

  if media.id is null then
    raise exception 'media_unavailable';
  end if;
  if media.created_by = auth.uid() then
    raise exception 'sender_cannot_consume_media';
  end if;
  if media.consumed_at is not null
    or (media.expires_at is not null and media.expires_at <= claimed_at)
  then
    raise exception 'media_expired_or_consumed';
  end if;

  if media.expiry_policy <> 'keep' then
    if media.claim_token is not null and media.claim_expires_at > claimed_at then
      raise exception 'media_claimed';
    end if;

    update public.media_records
    set claim_token = target_claim_token,
        claimant_id = auth.uid(),
        claim_expires_at = claimed_at + interval '2 minutes'
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
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  update public.media_records
  set claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where id = target_media
    and claimant_id = auth.uid()
    and claim_token = target_claim_token
    and consumed_at is null
    and public.member_of_room(room_id);
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
declare
  media public.media_records%rowtype;
  completed_at timestamptz := clock_timestamp();
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
  if media.last_claim_token = target_claim_token
    and media.last_claimant_id = auth.uid()
    and media.last_completed_at is not null
  then
    return;
  end if;
  if media.expiry_policy = 'keep'
    or media.claim_token <> target_claim_token
    or media.claimant_id <> auth.uid()
    or media.claim_expires_at is null
    or media.claim_expires_at <= completed_at
    or media.consumed_at is not null
  then
    raise exception 'media_claim_unavailable';
  end if;

  update public.media_records
  set viewed_at = coalesce(viewed_at, completed_at),
      expires_at = case expiry_policy
        when '5s' then coalesce(expires_at, completed_at + interval '5 seconds')
        when '10s' then coalesce(expires_at, completed_at + interval '10 seconds')
        when '30s' then coalesce(expires_at, completed_at + interval '30 seconds')
        else expires_at
      end,
      consumed_at = case when expiry_policy = 'view-once' then completed_at else consumed_at end,
      last_claim_token = target_claim_token,
      last_claimant_id = auth.uid(),
      last_completed_at = completed_at,
      claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where id = target_media;
end;
$$;
