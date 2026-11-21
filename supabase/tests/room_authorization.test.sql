begin;

select plan(16);
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
select lives_ok(
  $$select * from public.claim_media_view(
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001'
  )$$,
  'same recipient can retry an in-flight view-once retrieval idempotently'
);
select public.complete_media_view(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001'
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
select ok(
  (select expires_at > now() and expires_at <= now() + interval '5 seconds'
   from public.media_records
   where id = '20000000-0000-4000-8000-000000000002'
     and viewed_at is not null),
  'server starts the five-second timer on first view'
);
select pg_sleep(5.1);
select throws_ok(
  $$select * from public.claim_media_view('20000000-0000-4000-8000-000000000002')$$,
  'P0001',
  'media_expired_or_consumed',
  'server denies media after the authoritative expiry time'
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
select lives_ok(
  format('select public.revoke_room(%L::uuid)', current_setting('afterdark.test.room_a')::uuid),
  'room member can revoke the room'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select ok(
  not public.member_of_room(current_setting('afterdark.test.room_a')::uuid),
  'revoked identity loses room authorization'
);

select * from finish();
rollback;
