-- Phase 4: durable guest membership and short-lived presence leases.
create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null,
  name_number integer not null,
  credential_hash bytea not null unique,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint room_members_name_length_check check (char_length(display_name) between 2 and 24),
  constraint room_members_name_number_check check (name_number > 0),
  constraint room_members_hash_length_check check (octet_length(credential_hash) = 32),
  constraint room_members_name_number_unique unique (room_id, display_name, name_number)
);

create index room_members_room_active_idx on public.room_members (room_id, joined_at) where left_at is null;

create table public.room_presence (
  member_id uuid primary key references public.room_members(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index room_presence_last_seen_idx on public.room_presence (last_seen_at);

create table public.room_join_limits (
  client_key bytea primary key,
  window_started_at timestamptz not null,
  joined_count integer not null,
  constraint room_join_limits_key_length_check check (octet_length(client_key) = 32),
  constraint room_join_limits_count_check check (joined_count >= 1)
);

create index room_join_limits_window_idx on public.room_join_limits (window_started_at);

alter table public.room_members enable row level security;
alter table public.room_presence enable row level security;
alter table public.room_join_limits enable row level security;
revoke all on public.room_members, public.room_presence, public.room_join_limits from public, anon, authenticated;
grant select, insert, update, delete on public.room_members, public.room_presence, public.room_join_limits to service_role;

comment on table public.room_members is 'Private anonymous guest sessions. Names are display labels, not authentication.';
comment on table public.room_presence is 'Transient heartbeat leases, separate from durable membership; online if seen within 30 seconds.';
