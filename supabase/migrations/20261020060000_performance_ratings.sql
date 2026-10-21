create table public.performance_ratings (
  room_id uuid not null references public.rooms(id) on delete cascade,
  queue_item_id uuid not null references public.queue_items(id) on delete cascade,
  actor_key text not null check (char_length(actor_key) between 1 and 80),
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (queue_item_id, actor_key)
);

create index performance_ratings_room_idx on public.performance_ratings (room_id);

alter table public.performance_ratings enable row level security;
revoke all on table public.performance_ratings from public, anon, authenticated;
grant select, insert, update, delete on table public.performance_ratings to service_role;

comment on table public.performance_ratings is
  'One 1–5 star audience rating per room participant per performance; written only by the server score boundary.';

alter table public.room_settings
  add column guest_ratings boolean not null default true;

comment on column public.room_settings.guest_ratings is
  'Guests may rate performances. Enforced by the server score boundary.';
