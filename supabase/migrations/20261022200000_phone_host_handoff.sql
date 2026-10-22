alter table public.rooms
  add column if not exists host_member_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.rooms'::regclass
       and conname = 'rooms_host_member_id_fkey'
  ) then
    alter table public.rooms
      add constraint rooms_host_member_id_fkey
      foreign key (host_member_id) references public.room_members(id) on delete set null;
  end if;
end
$$;

update public.rooms r
   set host_member_id = (
     select m.id
       from public.room_members m
      where m.room_id = r.id and m.left_at is null
      order by m.joined_at, m.id
      limit 1
   )
 where r.host_member_id is null
   and exists (select 1 from public.room_members m where m.room_id = r.id and m.left_at is null);

create index if not exists rooms_host_member_id_idx on public.rooms (host_member_id)
  where host_member_id is not null;

comment on column public.rooms.host_member_id is
  'Active phone member with host authority. The first member claims it atomically and may transfer it.';
