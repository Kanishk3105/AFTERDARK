begin;

insert into rooms(code) values ('TESTROOM');
do $$ declare room uuid; begin
  select id into room from rooms where code = 'TESTROOM';
  insert into room_members(room_id, device_id) values (room, 'device-a');
  insert into room_members(room_id, device_id) values (room, 'device-b');
end $$;

do $$ declare room uuid; begin
  select id into room from rooms where code = 'TESTROOM';
  begin
    insert into room_members(room_id, device_id) values (room, 'device-c');
  exception when raise_exception then
    raise notice 'third_device_rejected';
  end;
end $$;

rollback;
