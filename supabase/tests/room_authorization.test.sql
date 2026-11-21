begin;

select plan(28);
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config(
  'afterdark.test.room_a',
  public.create_room('TESTRM01', 'INVITE01', now() + interval '1 hour')::text,
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
  public.join_room('INVITE01'),
  current_setting('afterdark.test.room_a')::uuid,
  'valid invitation joins the intended room'
);
select is(
  (select count(*) from public.room_members
   where room_id = current_setting('afterdark.test.room_a')::uuid and revoked_at is null),
  2::bigint,
  'room has exactly two active members after pairing'
);
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
  'INVITE03',
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
  $$select public.join_room('INVITE03')$$,
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
select lives_ok(
  format('select public.revoke_room(%L::uuid)', current_setting('afterdark.test.room_a')::uuid),
  'room member can revoke the room'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select ok(
  not public.member_of_room(current_setting('afterdark.test.room_a')::uuid),
  'revoked identity loses room authorization'
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
  'room revocation deletes registered push tokens'
);

select * from finish();
rollback;
