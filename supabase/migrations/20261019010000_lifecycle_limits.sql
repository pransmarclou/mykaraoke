-- Phase 7: bound queue writes per room actor. Server access only.
create table public.queue_mutation_limits (
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_key text not null,
  window_started_at timestamptz not null default now(),
  mutations integer not null default 0 check (mutations >= 0),
  primary key (room_id, actor_key)
);

alter table public.queue_mutation_limits enable row level security;
revoke all on public.queue_mutation_limits from public, anon, authenticated;
grant select, insert, update, delete on public.queue_mutation_limits to service_role;
