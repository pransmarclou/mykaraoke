-- A random topic capability is released only by the checked room API.
-- Broadcast carries no song/member data; clients refetch the authoritative snapshot.
alter table public.rooms add column queue_topic uuid not null default gen_random_uuid() unique;

create function public.can_read_queue_topic(topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rooms r
     where topic = 'queue:' || r.queue_topic::text
       and r.status = 'open' and r.expires_at > now()
  );
$$;
revoke all on function public.can_read_queue_topic(text) from public;
grant execute on function public.can_read_queue_topic(text) to anon;

create policy "room topic capability may receive queue invalidations"
on realtime.messages for select to anon
using (
  extension = 'broadcast'
  and public.can_read_queue_topic(realtime.topic())
);
