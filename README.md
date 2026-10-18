# MyKaraoke

**Your songs. Your stage. Your party.**

MyKaraoke is a web-first karaoke party platform by Nook Studio. The current
Phase 5 slice lets a host create a temporary room, guests join, and everyone
see a shared roster and song queue. With a server YouTube API key, guests can
search for embeddable karaoke videos, assign a singer, and add up to three
active songs. The host can reorder, skip, or remove entries. A live local
YouTube search has passed; playback, microphone, and payment features are planned in
[the functional build phases](Docs/build-phases.md).

## Run locally

Requires Node.js 20.9 or newer, npm, and Supabase CLI 2.119 or newer. The
native local stack works on macOS Apple Silicon or supported Linux without
Docker; other systems need a Docker-compatible runtime. The lockfile is the
source of truth for application dependency versions.

```bash
npm ci
supabase stack start --runtime native --exclude rest,auth,storage,functions,studio,mail,analytics,pooler --eager
supabase migration up --local
cp -n .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open [http://127.0.0.1:3100/host](http://127.0.0.1:3100/host). The local stack
uses development-only database credentials; no hosted project or account is
used. `cp -n` leaves an existing `.env.local` (including its secret) untouched.
On systems with Docker, omit `--runtime native`. Copy `DB_URL` to
`DATABASE_URL` and `ANON_KEY` to `SUPABASE_ANON_KEY` from
`supabase stack status --env`; the latter is browser-safe, unlike the service
key. Keep `.env.local` ignored. The Realtime URL is `SUPABASE_URL`. If you
previously started a database-only stack, `supabase stack stop` preserves data;
then run the updated start command and apply pending migrations. Do not commit
production connection strings or private keys. Localhost invites are
same-computer previews; phones need a deployed HTTPS origin.

To enable live song search, configure a MyKaraoke-specific YouTube Data API v3
key as server-only `YOUTUBE_API_KEY` in `.env.local`, then restart Next.js. The
UI explicitly reports that search is unconfigured without it. Search uses
`search.list` and `videos.list`, verifies public/embeddable metadata, caches a
query for 15 minutes, and limits uncached searches to 50/day locally. A result
is eligible to queue for six hours. Search-result flags are not a guarantee
that an embed will play on every device or in every region; that check belongs
to the playback phase. The API key must never use a `NEXT_PUBLIC_` prefix.

## Verify

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
npx playwright install chromium
npm run test:e2e
supabase db lint --local
```

Integration tests require the local database and Realtime service with
`.env.local` configured. Playwright checks multi-context guest search and
queueing with clearly seeded YouTube metadata fixtures, host ordering, guest
authorization denial, room creation/joining, roster recovery, small-screen
overflow, and automated WCAG A/AA rules. A separate manual live local YouTube
search returned results. Physical-phone QR scanning, real network interruption,
hosted-domain joining, playback, and microphone behavior are not claimed as tested.

## Room security and lifecycle

Room codes are public identifiers, not host credentials. The host credential is
32 random bytes in an HttpOnly, host-only cookie; only its SHA-256 digest is
stored in PostgreSQL. Room creation and closing are same-origin server routes.
Guests also receive a 32-byte random HttpOnly cookie, with only its digest in
`room_members`. Room codes and display names never authorize roster access.
Anonymous and authenticated database roles have no direct grants or RLS
policies on the room, member, presence, or rate-limit tables. The server's
private database connection performs checked operations. Rooms stop working after 24 hours; creation
opportunistically removes rows older than 7 days. The database-backed creation
limit is 100/hour for the loopback preview. A deployed app requires a trusted
proxy-provided client-IP header and a private HMAC secret before creation is
enabled; its limit is 20/hour per client address. Join attempts have a separate
database-backed limit (300/hour locally; 60/hour per address when deployed).
Configure the proxy settings only after
the hosting proxy is chosen and verified. Hosted Supabase setup and a scheduled
cleanup job remain separate deployment work.

## Guest presence and host departure

Guest membership remains in the room until the guest leaves, switches rooms,
the host closes it, or it expires. A guest page sends a heartbeat every 10
seconds; host and guest rosters refresh every 5 seconds. After 30 seconds
without a heartbeat, a guest is shown as **Away**, not deleted. A refresh or
brief reconnect restores the same member; duplicate names receive stable
numbered labels. One browser holds one active guest room at a time.

Closing the host tab does not close the room. The host can return in the same
browser before expiry; guests can still join meanwhile. The roster labels the
host as room owner but does not claim that the host is online. Explicit **End
room** or the 24-hour expiry stops further joining. This is the initial
host-departure policy, not host transfer or failover.

## Song search and shared queue

The browser never receives the YouTube key or writes queue tables directly.
The server checks the host or guest cookie on each search and queue route.
Official API results are filtered to public videos reporting embeddability and
reasonable duration. Queries are debounced, validated, cached, and subject to
per-actor and global daily limits. The queue is protected by a room-row lock,
unique active positions, a version check for host actions, and a request UUID
for safe retries. The same guest cannot queue the same video twice while it is
active, and can hold at most three active entries.

Supabase Realtime broadcasts only a queue-version invalidation on a private
random room topic. A checked server route gives room members that topic; the
client then refetches the authenticated queue snapshot. Three-second polling
and online-event refresh reconcile missed WebSocket events. The queue is not
playback: skip currently removes an entry from the upcoming list; no video is
started or advanced yet.

## Project context

- [Contributor instructions](Docs/agents.md)
- [Product and architecture direction](Docs/project.md)
- [Reference research and evidence](Docs/reference-app.md)
- [Functional phases and acceptance gates](Docs/build-phases.md)
- [Current state and decisions](Docs/memory.md)

The reference application informs behavior research. MyKaraoke uses its own
product identity and interface. YouTube integration uses supported APIs and
does not extract or alter media streams.

The logo and wordmark in `public/brand/` were supplied by the project owner.
The shell theme follows their yellow, orange, coral, and pink palette.
