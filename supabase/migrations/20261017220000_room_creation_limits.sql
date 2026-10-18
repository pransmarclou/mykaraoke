-- Phase 3 abuse guard. Keys are HMAC digests of a trusted client address.
create table public.room_creation_limits (
  client_key bytea primary key,
  window_started_at timestamptz not null,
  created_count integer not null,
  constraint room_creation_limits_key_length_check check (octet_length(client_key) = 32),
  constraint room_creation_limits_count_check check (created_count >= 1)
);

create index room_creation_limits_window_idx on public.room_creation_limits (window_started_at);

alter table public.room_creation_limits enable row level security;
revoke all on public.room_creation_limits from public, anon, authenticated;
grant select, insert, update, delete on public.room_creation_limits to service_role;
