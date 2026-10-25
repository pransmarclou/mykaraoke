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

Phase 9 currently adds browser-local favorites plus `src/lib/reactions/`.
Reaction POSTs accept only a fixed identifier after same-origin and host/guest
session checks. A server-only PostgreSQL table keeps the per-room actor budget;
the event itself is broadcast ephemerally on the existing random private room
topic. The paired TV is allowed to request that topic through its separate
device credential, validates every payload, bounds its transient render queue,
and removes each reaction after 3.5 seconds. Reactions are not persisted and do
not affect scoring or playback.

Fair rotation extends the existing `room_settings` row. Queue snapshots include
the flag, and enabling it runs a pure stable-round ordering rule inside the
same room-lock transaction used for queue mutations. The current singer is
placed after other waiting singers when possible. Manual host Up/Down disables
the flag in the same transaction, providing an explicit override without a
second source of queue truth.

Duets extend the protected queue record with one nullable second singer. The
same queue POST validates both names and rejects a repeated person before the
transaction writes. Queue and playback snapshots carry the pair to host, guest,
and TV surfaces. Fair rotation derives one normalized unordered performer key
for the pair, while the submitted name order remains intact for display.

Guest permissions extend the protected `room_settings` row and are enforced at
the queue, playback-command, reaction, and rating mutation boundaries. A host
change increments the room queue version so connected phones reconcile their
controls. Guest playback commands reuse the existing transactional mutation
budget and never give the public room code host authority.

Audience scores live in the RLS-protected `performance_ratings` table, with one
server-written 1–5 star value per actor and queue item. Only the current or most
recently completed (not skipped) performance is rateable. The API derives a
room-scoped top-10 leaderboard grouped by performer; duet pairs share one
performer identity. The paired TV has read-only access through its designated
device session. Reactions are deliberately excluded from scoring.

Party themes use three fixed design-token IDs. Outside a room, a versioned
local preference is applied before first paint. Inside a room, the host-only
theme route writes the checked `room_settings.party_theme` value and publishes
the existing queue invalidation; queue snapshots update host/guest pages and
playback snapshots update the paired TV. Room components restore the personal
preference when they unmount. Public database roles retain no settings access,
and arbitrary CSS is never accepted or stored.

Phase 10 starts with a public `/compatibility` Server Component containing one
small `BrowserReadiness` Client Component. Pure rules under
`src/lib/compatibility/` classify secure-context, local-storage, WebSocket,
MediaDevices, and Web Audio presence. The probe does not request permission,
enumerate hardware, or send capability data to the server; static page content
separately records verified and unverified device evidence.

The Next.js response boundary applies HSTS, same-origin framing, MIME-sniffing
protection, a strict-origin cross-site referrer policy, and a least-capability
Permissions Policy to every route. Same-origin microphone access stays enabled
for Microphone Studio. CSP remains a separate reviewed slice because the
pre-paint theme bootstrap, YouTube IFrame API, image host, and Supabase Realtime
connections need an explicit nonce and origin design.

Native N1 now includes a separate Expo SDK 58 / React Native application under
`apps/mobile`. Expo Router owns native navigation. Hosted Supabase Auth sessions
are persisted with a chunked Expo SecureStore adapter on iOS/Android; Google
OAuth returns through the `mykaraoke://auth/callback` deep link. The mobile app
contains only the project URL and publishable/anon key. Anonymous web cookies,
database credentials, service-role keys, and OAuth client secrets never become
mobile credentials.

The remaining native track will reuse server-authoritative domain rules through
authenticated APIs. Its big-screen handoff differs from today's pairing:
the web display creates a single-use expiring QR claim, an authenticated host
app scans and confirms it, and the backend grants only display authority to
the browser. Native purchase identity and entitlements remain separate from
both the public room code and the display session. None of that native flow
is implemented in the web MVP. Native room endpoints and billing are not yet
implemented in the N1 foundation.

Migrations live in `supabase/migrations/`. The `rooms`, `room_settings`,
`room_sessions`, `room_creation_limits`, `room_members`, `room_presence`, and
`room_join_limits` tables have RLS enabled and no client-facing grants. Guest
membership is durable for the room lifetime; presence is a separate short-lived
heartbeat lease, rendered by server polling. Search cache/usage and queue tables
also deny direct browser DB roles. Playback state, pairing limits, command
records, and reaction budgets also deny direct browser DB roles. The hosted Supabase project is the
MVP source of truth for PostgreSQL and Realtime; account Auth remains deferred.
Local Supabase is no longer part of the normal development or MVP workflow.

See [Docs/project.md](Docs/project.md) for the product architecture and
[Docs/build-phases.md](Docs/build-phases.md) for later boundaries.
