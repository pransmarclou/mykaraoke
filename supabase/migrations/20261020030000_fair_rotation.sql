alter table public.room_settings
  add column fair_rotation_enabled boolean not null default false;

comment on column public.room_settings.fair_rotation_enabled is
  'When enabled, waiting songs are arranged in stable singer rounds; host manual ordering disables it.';
