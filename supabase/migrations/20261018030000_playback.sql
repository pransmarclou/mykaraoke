-- Phase 6: one designated playback device and server-authoritative current song.
alter table public.queue_items drop constraint queue_items_status_check;
alter table public.queue_items add constraint queue_items_status_check
  check (status in ('queued', 'playing', 'played', 'skipped', 'removed'));
drop index public.queue_item_active_duplicate_idx;
create unique index queue_item_active_duplicate_idx on public.queue_items (room_id, actor_key, youtube_id)
  where status in ('queued', 'playing');

create table public.playback_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  current_item_id uuid references public.queue_items(id),
  desired text not null default 'pause' check (desired in ('play', 'pause')),
  observed text not null default 'idle' check (observed in ('idle', 'cued', 'playing', 'paused', 'blocked', 'error')),
  error_code integer,
  version bigint not null default 0,
  device_hash bytea,
  device_seen_at timestamptz,
  pairing_hash bytea,
  pairing_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint playback_current_state_check check (
    (current_item_id is null and observed = 'idle' and desired = 'pause') or current_item_id is not null
  )
);
create table public.playback_commands (
  room_id uuid not null references public.rooms(id) on delete cascade,
  request_key uuid not null,
  action text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, request_key)
);
create table public.playback_pair_limits (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);

alter table public.playback_state enable row level security;
alter table public.playback_commands enable row level security;
alter table public.playback_pair_limits enable row level security;
revoke all on public.playback_state, public.playback_commands, public.playback_pair_limits from public, anon, authenticated;
grant select, insert, update, delete on public.playback_state, public.playback_commands, public.playback_pair_limits to service_role;

comment on table public.playback_state is 'One paired TV credential and current player state per room; never expose the credential hash.';
