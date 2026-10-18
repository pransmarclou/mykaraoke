-- Phase 5: server-verified YouTube discovery and authoritative room queue.
alter table public.rooms add column queue_version bigint not null default 0;

create table public.song_search_results (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  youtube_id text not null,
  title text not null,
  channel_title text not null,
  duration_seconds integer not null,
  generation uuid not null,
  fetched_at timestamptz not null default now(),
  constraint song_search_query_length check (char_length(query) between 2 and 80),
  constraint song_search_youtube_id_format check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint song_search_duration_check check (duration_seconds between 30 and 3600),
  constraint song_search_unique unique (query, youtube_id)
);
create index song_search_results_cache_idx on public.song_search_results (query, fetched_at desc);

create table public.song_search_cache (
  query text primary key,
  generation uuid not null,
  fetched_at timestamptz not null default now(),
  constraint song_search_cache_query_length check (char_length(query) between 2 and 80)
);

create table public.song_search_usage (
  usage_day date primary key,
  api_calls integer not null default 0 check (api_calls >= 0)
);

create table public.song_search_limits (
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_key text not null,
  usage_day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (room_id, actor_key, usage_day)
);

create table public.queue_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  search_result_id uuid not null references public.song_search_results(id),
  youtube_id text not null,
  title text not null,
  channel_title text not null,
  duration_seconds integer not null,
  singer_name text not null,
  requested_by uuid references public.room_members(id) on delete set null,
  actor_key text not null,
  request_key uuid not null,
  status text not null default 'queued' check (status in ('queued', 'skipped', 'removed')),
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queue_item_position_check check ((status = 'queued' and position > 0) or (status <> 'queued' and position is null)),
  constraint queue_item_singer_length check (char_length(singer_name) between 2 and 24),
  constraint queue_item_room_position_unique unique (room_id, position) deferrable initially deferred,
  constraint queue_item_request_unique unique (room_id, actor_key, request_key)
);
create unique index queue_item_active_duplicate_idx on public.queue_items (room_id, actor_key, youtube_id) where status = 'queued';
create index queue_item_active_order_idx on public.queue_items (room_id, position) where status = 'queued';

alter table public.song_search_results enable row level security;
alter table public.song_search_cache enable row level security;
alter table public.song_search_usage enable row level security;
alter table public.song_search_limits enable row level security;
alter table public.queue_items enable row level security;
revoke all on public.song_search_results, public.song_search_cache, public.song_search_usage, public.song_search_limits, public.queue_items from public, anon, authenticated;
grant select, insert, update, delete on public.song_search_results, public.song_search_cache, public.song_search_usage, public.song_search_limits, public.queue_items to service_role;

comment on table public.song_search_results is 'Server-verified short-lived metadata cache; do not expose directly to browser DB roles.';
comment on table public.queue_items is 'Queue ordering and mutation are private server operations; queued positions are unique per room.';
