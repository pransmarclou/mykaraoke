create table public.reaction_limits (
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_key text not null check (char_length(actor_key) between 1 and 80),
  window_started_at timestamptz not null default now(),
  reactions integer not null default 0 check (reactions >= 0),
  primary key (room_id, actor_key)
);

alter table public.reaction_limits enable row level security;
revoke all on table public.reaction_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.reaction_limits to service_role;

comment on table public.reaction_limits is
  'Server-only short-window budgets for ephemeral room reaction broadcasts.';
