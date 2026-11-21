begin;

select plan(41);
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config(
  'afterdark.test.room_a',
  public.create_room(
    'TESTRM01',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    now() + interval '1 hour'
  )::text,
  true
);
select ok(
  public.member_of_room(current_setting('afterdark.test.room_a')::uuid),
  'room creator is authorized for the new room'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.rooms where id = current_setting('afterdark.test.room_a')::uuid),
  0::bigint,
  'unpaired identity cannot read another room'
);
select is(
  public.join_room('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
  current_setting('afterdark.test.room_a')::uuid,
  'valid invitation joins the intended room'
);
select is(
  (select count(*) from public.room_members
   where room_id = current_setting('afterdark.test.room_a')::uuid and revoked_at is null),
  2::bigint,
  'room has exactly two active members after pairing'
);
select is(
  (select e2ee_protocol from public.rooms
   where id = current_setting('afterdark.test.room_a')::uuid),
  'disabled',
  'new rooms fail closed until an end-to-end protocol is approved'
);
select throws_ok(
  format(
    'insert into public.chat_messages(id, room_id, room_code, sender_device_id, sealed_content) values (%L, %L, %L, auth.uid()::text, %L)',
    '21000000-0000-4000-8000-000000000001',
    current_setting('afterdark.test.room_a'),
    'TESTRM01',
    'v1.encrypted'
  ),
  '42501',
  'new row violates row-level security policy for table "chat_messages"',
  'remote chat cannot use the legacy shared room key'
);
select throws_ok(
  $$select public.create_media_record(
    '20000000-0000-4000-8000-000000000010',
    current_setting('afterdark.test.room_a')::uuid,
    'keep',
    'image/jpeg'
  )$$,
  'P0001',
  'remote_content_disabled',
  'remote media upload is disabled until authenticated end-to-end encryption is available'
);
set local role service_role;
update public.rooms
set e2ee_protocol = 'MLSv1'
where id = current_setting('afterdark.test.room_a')::uuid;
set local role authenticated;

select public.register_device_token(
  current_setting('afterdark.test.room_a')::uuid,
  'test-token-with-more-than-twenty',
  'android'
);
select is(
  (select count(*) from public.device_tokens
   where room_id = current_setting('afterdark.test.room_a')::uuid
     and user_id = auth.uid()),
  1::bigint,
  'paired device can register a notification token'
);
select public.register_device_token(
  current_setting('afterdark.test.room_a')::uuid,
  'test-token-with-more-than-twenty-v2',
  'android'
);
select is(
  (select token from public.device_tokens
   where room_id = current_setting('afterdark.test.room_a')::uuid
     and user_id = auth.uid()),
  'test-token-with-more-than-twenty-v2',
  'token refresh replaces the previous registration'
);
select public.unregister_device_token(current_setting('afterdark.test.room_a')::uuid);
select is(
  (select count(*) from public.device_tokens
   where room_id = current_setting('afterdark.test.room_a')::uuid
     and user_id = auth.uid()),
  0::bigint,
  'paired device can revoke its notification token'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.create_media_record(
    '20000000-0000-4000-8000-000000000001',
    current_setting('afterdark.test.room_a')::uuid,
    'view-once',
    'image/jpeg'
  ),
  current_setting('afterdark.test.room_a') || '/20000000-0000-4000-8000-000000000001',
  'room member can create private view-once media metadata'
);
select is(
  (select storage_path from public.register_media_upload(
    '20000000-0000-4000-8000-000000000001',
    repeat('a', 64),
    32
  )),
  current_setting('afterdark.test.room_a') || '/20000000-0000-4000-8000-000000000001',
  'upload registration binds the ciphertext digest to its media id'
);
select throws_ok(
  $$select * from public.register_media_upload(
    '20000000-0000-4000-8000-000000000001',
    repeat('b', 64),
    32
  )$$,
  'P0001',
  'media_upload_conflict',
  'a media id cannot be rebound to different ciphertext'
);
set local role service_role;
select public.complete_media_upload(
  '20000000-0000-4000-8000-000000000001',
  repeat('a', 64),
  32
);
set local role authenticated;
select is(
  (select upload_status from public.media_records
   where id = '20000000-0000-4000-8000-000000000001'),
  'ready',
  'only service-side upload completion makes media retrievable'
);
select ok(
  (select already_uploaded from public.register_media_upload(
    '20000000-0000-4000-8000-000000000001',
    repeat('a', 64),
    32
  )),
  'an identical upload retry is recognized as idempotent'
);
select throws_ok(
  $$select * from public.claim_media_view('20000000-0000-4000-8000-000000000001')$$,
  'P0001',
  'sender_cannot_consume_media',
  'sender cannot consume their own view-once media'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (select expiry_policy from public.claim_media_view(
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001'
  )),
  'view-once',
  'paired recipient atomically claims view-once media'
);
select throws_ok(
  $$select * from public.claim_media_view(
    '20000000-0000-4000-8000-000000000001',
    null
  )$$,
  'P0001',
  'invalid_claim_token',
  'server rejects reservations without an idempotency token'
);
select throws_ok(
  $$select * from public.claim_media_view(
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001'
  )$$,
  'P0001',
  'media_claimed',
  'a duplicate request cannot open a concurrent stream for the active reservation'
);
select throws_ok(
  $$select * from public.claim_media_view(
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000099'
  )$$,
  'P0001',
  'media_claimed',
  'a competing view attempt cannot steal an active reservation'
);
select public.complete_media_view(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.complete_media_view(
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001'
  )$$,
  'completion retries with the same claim token are idempotent'
);
select throws_ok(
  $$select * from public.claim_media_view('20000000-0000-4000-8000-000000000001')$$,
  'P0001',
  'media_expired_or_consumed',
  'view-once media cannot be claimed a second time'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.create_media_record(
  '20000000-0000-4000-8000-000000000002',
  current_setting('afterdark.test.room_a')::uuid,
  '5s',
  'video/mp4'
);
set local role service_role;
update public.media_records
set upload_status = 'ready',
    payload_sha256 = repeat('c', 64),
    payload_bytes = 32
where id = '20000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select * from public.claim_media_view(
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002'
);
select public.complete_media_view(
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002'
);
set local role service_role;
select diag(coalesce(
  (select format('media expiry policy=%s viewed_at=%s expires_at=%s',
    expiry_policy, viewed_at, expires_at)
   from public.media_records
   where id = '20000000-0000-4000-8000-000000000002'),
  'five-second media record is not visible to service_role'
));
select is(
  (select expiry_policy from public.media_records
   where id = '20000000-0000-4000-8000-000000000002'),
  '5s',
  'test media retains the five-second expiry policy'
);
select ok(
  coalesce((select viewed_at is not null from public.media_records
            where id = '20000000-0000-4000-8000-000000000002'), false),
  'server records the completed first view'
);
select ok(
  coalesce((select expires_at is not null from public.media_records
            where id = '20000000-0000-4000-8000-000000000002'), false),
  'server persists timed media expiry metadata'
);
select ok(
  coalesce((select expires_at > viewed_at
       and expires_at <= viewed_at + interval '5 seconds'
   from public.media_records
   where id = '20000000-0000-4000-8000-000000000002'
     and viewed_at is not null), false),
  'server starts the five-second timer on first view'
);
set local role authenticated;
select pg_sleep(5.1);
select throws_ok(
  $$select * from public.claim_media_view('20000000-0000-4000-8000-000000000002')$$,
  'P0001',
  'media_expired_or_consumed',
  'server denies media after the authoritative expiry time'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.create_media_record(
  '20000000-0000-4000-8000-000000000004',
  current_setting('afterdark.test.room_a')::uuid,
  'view-once',
  'image/jpeg'
);
set local role service_role;
update public.media_records
set upload_status = 'ready',
    payload_sha256 = repeat('d', 64),
    payload_bytes = 32
where id = '20000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select * from public.claim_media_view(
  '20000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000004'
);
select public.release_media_view(
  '20000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000004'
);
select is(
  (select authorized_claim_token from public.claim_media_view(
    '20000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000004'
  )),
  '30000000-0000-4000-8000-000000000004'::uuid,
  'a released failed-download reservation can be retried with its stable token'
);
select public.create_invitation(
  current_setting('afterdark.test.room_a')::uuid,
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  now() + interval '1 hour'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select * from public.claim_media_view('20000000-0000-4000-8000-000000000001')$$,
  'P0001',
  'media_unavailable',
  'non-member cannot claim room media'
);
select throws_ok(
  $$select public.join_room('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC')$$,
  'P0001',
  'room_is_full',
  'third identity is rejected by the server'
);
select is(
  (select count(*) from public.rooms where id = current_setting('afterdark.test.room_a')::uuid),
  0::bigint,
  'rejected identity cannot read the room'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select public.create_media_record(
  '20000000-0000-4000-8000-000000000003',
  current_setting('afterdark.test.room_a')::uuid,
  'keep',
  'audio/ogg'
);
select public.register_device_token(
  current_setting('afterdark.test.room_a')::uuid,
  'test-token-with-more-than-twenty-v3',
  'android'
);
set local role service_role;
insert into public.chat_messages(
  id, room_id, room_code, sender_device_id, sealed_content
)
values (
  '21000000-0000-4000-8000-000000000002',
  current_setting('afterdark.test.room_a')::uuid,
  'TESTRM01',
  '10000000-0000-4000-8000-000000000002',
  'v1.test-ciphertext'
);
insert into public.game_sessions(room_id, game_id, mood_id, state)
values (
  current_setting('afterdark.test.room_a')::uuid,
  'test-game',
  'romantic',
  '{"score": 1}'::jsonb
);
insert into public.card_history(room_id, card_id, fingerprint, game_id)
values (
  current_setting('afterdark.test.room_a')::uuid,
  'test-card',
  'test-fingerprint',
  'test-game'
);
set local role authenticated;
select set_config(
  'afterdark.test.deletion_job',
  public.request_room_deletion(current_setting('afterdark.test.room_a')::uuid)::text,
  true
);
select ok(
  current_setting('afterdark.test.deletion_job') <> '',
  'room member can enqueue permanent deletion'
);
set local role service_role;
select is(
  (select status from public.room_deletion_jobs
   where id = current_setting('afterdark.test.deletion_job')::uuid),
  'pending',
  'deletion request creates a durable retryable job'
);
select is(
  (select status from public.rooms
   where id = current_setting('afterdark.test.room_a')::uuid),
  'deleting',
  'room enters deletion state before any storage cleanup'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select ok(
  not public.member_of_room(current_setting('afterdark.test.room_a')::uuid),
  'deletion immediately revokes both devices'
);
set local role service_role;
select ok(
  (select consumed_at is not null
   from public.media_records
   where id = '20000000-0000-4000-8000-000000000003'),
  'room revocation queues retained media for storage cleanup'
);
select is(
  (select count(*) from public.device_tokens
   where room_id = current_setting('afterdark.test.room_a')::uuid),
  0::bigint,
  'deletion immediately removes registered push tokens'
);
select is(
  (select count(*) from public.claim_room_deletion_jobs(1)
   where job_id = current_setting('afterdark.test.deletion_job')::uuid),
  1::bigint,
  'service worker atomically claims the pending deletion'
);
select public.complete_room_deletion(current_setting('afterdark.test.deletion_job')::uuid);
select is(
  (
    (select count(*) from public.rooms
     where id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.room_members
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.pairing_invitations
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.chat_messages
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.game_sessions
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.card_history
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.media_records
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.notification_settings
       where room_id = current_setting('afterdark.test.room_a')::uuid)
    + (select count(*) from public.device_tokens
       where room_id = current_setting('afterdark.test.room_a')::uuid)
  ),
  0::bigint,
  'permanent deletion cascades all room content and credentials'
);
select is(
  (select status from public.room_deletion_jobs
   where id = current_setting('afterdark.test.deletion_job')::uuid),
  'complete',
  'successful room deletion retains only minimal operational status'
);
select lives_ok(
  format(
    'select public.complete_room_deletion(%L::uuid)',
    current_setting('afterdark.test.deletion_job')::uuid
  ),
  'repeated completion is idempotent'
);

select * from finish();
rollback;
