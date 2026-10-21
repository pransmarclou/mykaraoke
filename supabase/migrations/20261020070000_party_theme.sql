alter table public.room_settings
  add column party_theme text not null default 'stage-glow'
  check (party_theme in ('stage-glow', 'electric-blue', 'velvet-gold'));

comment on column public.room_settings.party_theme is
  'Host-selected visual theme synchronized to authenticated room and paired TV surfaces.';
