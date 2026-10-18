-- Phase 3: temporary rooms and server-held host sessions.
-- The browser never receives direct table grants. The Next.js server connects
-- using a private database credential and checks the host cookie on every
-- protected operation.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  constraint rooms_code_format check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  constraint rooms_status_check check (status in ('open', 'closed')),
  constraint rooms_expiry_check check (expires_at > created_at),
  constraint rooms_closed_state_check check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);

create index rooms_expires_at_idx on public.rooms (expires_at);

create table public.room_settings (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  allow_guest_songs boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  role text not null default 'host',
  credential_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint room_sessions_role_check check (role = 'host'),
  constraint room_sessions_hash_length_check check (octet_length(credential_hash) = 32),
  constraint room_sessions_expiry_check check (expires_at > created_at)
);

create index room_sessions_room_id_idx on public.room_sessions (room_id);
create index room_sessions_expires_at_idx on public.room_sessions (expires_at);

alter table public.rooms enable row level security;
alter table public.room_settings enable row level security;
alter table public.room_sessions enable row level security;

revoke all on public.rooms, public.room_settings, public.room_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.rooms, public.room_settings, public.room_sessions to service_role;

comment on table public.rooms is 'Phase 3 temporary room facts. Public code is an identifier, never host authority.';
comment on table public.room_sessions is 'SHA-256 hashes of random host credentials; plaintext credentials live only in HttpOnly browser cookies.';
