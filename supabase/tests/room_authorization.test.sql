begin;

select plan(8);
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
select public.create_invitation(
  current_setting('afterdark.test.room_a')::uuid,
  'INVITE03',
  now() + interval '1 hour'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
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
