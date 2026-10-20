# Architecture

The current vertical slice is Next.js App Router + a private server-side
PostgreSQL connection to the MyKaraoke hosted Supabase database.
`src/app/host/page.tsx`
renders from the HttpOnly host cookie. `POST /api/rooms` creates a room and
session in one transaction; `POST /api/rooms/[code]/close` verifies the same
credential and revokes it. `POST /api/rooms/join` validates a name and code,
creates or recovers one scoped guest membership, and sets a separate HttpOnly
guest cookie. The protected presence and leave routes verify host or guest
credentials on every request. `src/lib/rooms/` holds these domain rules.

Phase 5 adds `src/lib/songs/`: a server-only official YouTube Data API boundary,
query/result cache and quota counters, and a transactional queue repository.
Host and guest song UI call checked search and queue routes. The browser never
receives a YouTube key or direct queue-table access. Queue mutations lock the
room row, validate role and version, and broadcast only a version invalidation
to a private random Supabase Realtime topic. Clients refetch the authenticated
snapshot; polling reconciles missed events.

Phase 6 adds `src/lib/playback/` and `/tv/[code]`. Host commands are checked
server-side and replay-safe by request UUID. A short-lived pairing code gives
one TV browser a rotating HttpOnly credential; room codes alone authorize
nothing. The designated TV reports actual IFrame Player API events, while the
server stores desired/observed states and advances the queue transactionally.
Player errors stay visible with a host-skip recovery path.

Phase 7 adds terminal client states on closure/expiry, monotonic queue and
playback snapshot reconciliation, Realtime retry with polling fallback, and
stable browser retry keys that reach the existing server idempotency checks.
The new queue-write budget is transactional and RLS-protected. An explicit
server-only cleanup command closes expired rooms, revokes device authority,
and purges old rows. A Vercel Cron route runs that same idempotent operation
daily, after verifying a server-only bearer secret and an exact allowlisted
database hostname; structured logs contain aggregate counts and timing only.
Host tab departure does not transfer ownership or close the room.

Phase 8 adds a browser-only `MicrophoneStudio` Client Component and pure audio
rules under `src/lib/microphone/`. A user gesture requests `getUserMedia`; the
returned stream feeds a dedicated Web Audio graph for input gain, metering,
optional compression, dry/reverb mix, mute, and local output. Output gain stays
at zero until an explicit monitor action. Tracks are stopped and the audio
context is closed on input changes or unmount. Device-change, track-ended,
permission, missing-device, unsupported/insecure-context, and suspended-context
states are recoverable in the UI. No microphone samples cross an API boundary,
enter Supabase, mix into the YouTube player, or persist to storage.

The future native track will reuse server-authoritative domain rules through
authenticated APIs. Its big-screen handoff differs from today's pairing:
the web display creates a single-use expiring QR claim, an authenticated host
app scans and confirms it, and the backend grants only display authority to
the browser. Native purchase identity and entitlements remain separate from
both the public room code and the display session. None of that native flow
is implemented in the web MVP.

Migrations live in `supabase/migrations/`. The `rooms`, `room_settings`,
`room_sessions`, `room_creation_limits`, `room_members`, `room_presence`, and
`room_join_limits` tables have RLS enabled and no client-facing grants. Guest
membership is durable for the room lifetime; presence is a separate short-lived
heartbeat lease, rendered by server polling. Search cache/usage and queue tables
also deny direct browser DB roles. Playback state, pairing limits, and command
records also deny direct browser DB roles. The hosted Supabase project is the
MVP source of truth for PostgreSQL and Realtime; account Auth remains deferred.
Local Supabase is no longer part of the normal development or MVP workflow.

See [Docs/project.md](Docs/project.md) for the product architecture and
[Docs/build-phases.md](Docs/build-phases.md) for later boundaries.
