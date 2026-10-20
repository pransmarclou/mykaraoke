alter table public.queue_items
  add column duet_singer_name text;

alter table public.queue_items
  add constraint queue_item_duet_singer_length
    check (duet_singer_name is null or char_length(duet_singer_name) between 2 and 24),
  add constraint queue_item_distinct_duet_singer
    check (duet_singer_name is null or lower(trim(duet_singer_name)) <> lower(trim(singer_name)));

comment on column public.queue_items.duet_singer_name is
  'Optional second singer for a duet; validated and written only by the server queue boundary.';
