-- WebRTC descriptions and ICE candidates use a separate unguessable capability
-- topic so other room members cannot observe remote-microphone signaling. The
-- server releases the HMAC-derived topic only to the host and current requester.
create function public.can_read_microphone_topic(topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.rooms r
      join public.playback_state p on p.room_id = r.id
     where topic ~ ('^mic:' || r.queue_topic::text || ':[0-9a-f]{64}$')
       and p.current_item_id is not null
       and r.status = 'open'
       and r.expires_at > now()
  );
$$;

revoke all on function public.can_read_microphone_topic(text) from public;
grant execute on function public.can_read_microphone_topic(text) to anon;

create policy "microphone topic capability may receive signaling"
on realtime.messages for select to anon
using (
  extension = 'broadcast'
  and public.can_read_microphone_topic(realtime.topic())
);
