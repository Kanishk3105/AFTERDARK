create table if not exists public.room_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique,
  requested_by uuid,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'failed', 'complete')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.room_deletion_jobs enable row level security;
revoke all on public.room_deletion_jobs from public, anon, authenticated;

create or replace function public.request_room_deletion(target_room uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  job_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select job.id into job_id
  from public.room_deletion_jobs job
  where job.room_id = target_room
    and job.requested_by = auth.uid()
    and job.status <> 'complete';
  if job_id is not null then
    return job_id;
  end if;

  perform 1 from public.rooms where id = target_room for update;
  if not found then
    raise exception 'not_a_room_member';
  end if;

  select job.id into job_id
  from public.room_deletion_jobs job
  where job.room_id = target_room
    and job.requested_by = auth.uid()
    and job.status <> 'complete'
  for update;
  if job_id is not null then
    return job_id;
  end if;
  if not public.member_of_room(target_room) then
    raise exception 'not_a_room_member';
  end if;

  insert into public.room_deletion_jobs(room_id, requested_by)
  values (target_room, auth.uid())
  on conflict (room_id) do nothing
  returning id into job_id;

  if job_id is null then
    select job.id into job_id
    from public.room_deletion_jobs job
    where job.room_id = target_room
      and job.requested_by = auth.uid()
      and job.status <> 'complete';
    if job_id is null then
      raise exception 'room_deletion_already_requested';
    end if;
    return job_id;
  end if;

  update public.room_members
  set revoked_at = coalesce(revoked_at, now())
  where room_id = target_room;
  update public.pairing_invitations
  set revoked_at = coalesce(revoked_at, now())
  where room_id = target_room;
  delete from public.device_tokens where room_id = target_room;
  delete from public.notification_settings where room_id = target_room;
  update public.media_records
  set consumed_at = coalesce(consumed_at, now()),
      claim_token = null,
      claimant_id = null,
      claim_expires_at = null
  where room_id = target_room;
  update public.rooms
  set status = 'deleting',
      e2ee_protocol = 'disabled',
      revocation_version = revocation_version + 1
  where id = target_room;

  return job_id;
end;
$$;

create or replace function public.claim_room_deletion_jobs(max_jobs integer default 10)
returns table(job_id uuid, room_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if max_jobs < 1 or max_jobs > 25 then
    raise exception 'invalid_job_limit';
  end if;

  return query
  with candidates as (
    select job.id
    from public.room_deletion_jobs job
    where (job.status = 'pending' and job.created_at <= now() - interval '5 minutes')
      or job.status = 'failed'
      or (job.status = 'running' and job.updated_at <= now() - interval '5 minutes')
    order by job.created_at
    limit max_jobs
    for update skip locked
  )
  update public.room_deletion_jobs job
  set status = 'running',
      attempts = job.attempts + 1,
      updated_at = now(),
      last_error = null
  from candidates
  where job.id = candidates.id
  returning job.id, job.room_id;
end;
$$;

create or replace function public.fail_room_deletion(target_job uuid, failure text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  update public.room_deletion_jobs
  set status = 'failed',
      last_error = left(coalesce(failure, 'room_deletion_failed'), 500),
      updated_at = now()
  where id = target_job
    and status = 'running';
  if not found then
    raise exception 'room_deletion_job_unavailable';
  end if;
end;
$$;

create or replace function public.complete_room_deletion(target_job uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_room uuid;
  job_status text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  select job.room_id, job.status into target_room, job_status
  from public.room_deletion_jobs job
  where job.id = target_job
  for update;
  if target_room is null then
    raise exception 'room_deletion_job_unavailable';
  end if;
  if job_status = 'complete' then
    return;
  end if;
  if job_status <> 'running' then
    raise exception 'room_deletion_job_unavailable';
  end if;

  delete from public.rooms where id = target_room;

  update public.room_deletion_jobs
  set status = 'complete',
      requested_by = null,
      last_error = null,
      updated_at = now(),
      completed_at = now()
  where id = target_job;
end;
$$;

revoke all on function public.request_room_deletion(uuid) from public, anon;
revoke all on function public.claim_room_deletion_jobs(integer) from public, anon, authenticated;
revoke all on function public.fail_room_deletion(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_room_deletion(uuid) from public, anon, authenticated;
grant execute on function public.request_room_deletion(uuid) to authenticated;
grant execute on function public.claim_room_deletion_jobs(integer) to service_role;
grant execute on function public.fail_room_deletion(uuid, text) to service_role;
grant execute on function public.complete_room_deletion(uuid) to service_role;
grant select on public.room_deletion_jobs to service_role;
