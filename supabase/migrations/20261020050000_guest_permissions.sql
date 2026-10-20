alter table public.room_settings
  add column guest_queue_control boolean not null default false,
  add column guest_playback_control boolean not null default false,
  add column guest_reactions boolean not null default true;

comment on column public.room_settings.allow_guest_songs is
  'Guests may add songs to the queue. Enforced by the server queue boundary.';
comment on column public.room_settings.guest_queue_control is
  'Guests may reorder, skip, or remove waiting songs. Enforced by the server queue boundary.';
comment on column public.room_settings.guest_playback_control is
  'Guest phones may start, pause, resume, and skip playback on the paired TV. Enforced by the server playback boundary.';
comment on column public.room_settings.guest_reactions is
  'Guests may send ephemeral reactions to the paired TV. Enforced by the server reaction boundary.';
