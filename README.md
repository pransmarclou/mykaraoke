# MyKaraoke

**Your songs. Your stage. Your party.**

MyKaraoke is a web-first karaoke party platform by Nook Studio. The current
Phase 8 implementation lets a host create a temporary room, guests join, and everyone
see a shared roster and song queue. With a server YouTube API key, guests can
search for embeddable karaoke videos, assign a singer, and add up to three
active songs. The host can reorder, skip, or remove entries. A paired TV/browser
can play through the official YouTube player while the host controls playback.
Live local search and a desktop sample-video playback check passed. The host
room now includes a local-only Microphone Studio with input selection, meter,
gain, mute, monitoring, compression, and reverb. Lifecycle release checks and
real microphone hardware verification remain pending; payments are planned in
[the functional build phases](Docs/build-phases.md).

Delivery order: finish a usable browser MVP for phones, laptops, and supported
TV browsers first. Later, installed iOS/Android apps become the main personal
party interface, with a QR shown on the web big screen for the app to scan.
Native subscriptions come after the app and screen handoff work; no app
download or payment is required in the current web MVP.

Planned Native N4 monetization is not implemented yet. Free starts with 10
qualifying song credits, and a user may explicitly choose a Google rewarded ad
to unlock 10 more. Premium provides unlimited MyKaraoke song credits and removes
MyKaraoke display and rewarded ads. It cannot remove or promise the absence of
ads served inside the official YouTube player. Reset timing, rewarded-ad caps,
no-fill behavior, and Premium pricing remain open product decisions.

## Run the web app

Requires Node.js 20.9 or newer, npm, and access to the intended MyKaraoke
hosted Supabase project. The hosted project is the MVP source of truth; a local
Supabase stack is not part of the normal workflow. The lockfile is the source
of truth for application dependency versions.

```bash
npm ci
cp -n .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open [http://127.0.0.1:3100/host](http://127.0.0.1:3100/host). Configure the
server-only hosted PostgreSQL connection as `DATABASE_URL`, the project URL as
`SUPABASE_URL`, and the browser-safe anon key as `SUPABASE_ANON_KEY` in ignored
`.env.local`. Keep the database password, service-role key, and YouTube key out
of client code and Git. `cp -n` leaves an existing `.env.local` untouched.
Apply additive migrations to the intended hosted project through a reviewed
migration step; never point a development command at an unrelated project.
Localhost invites remain same-computer previews; phones need the deployed HTTPS
origin.

To enable live song search, configure a MyKaraoke-specific YouTube Data API v3
key as server-only `YOUTUBE_API_KEY` in `.env.local`, then restart Next.js. The
UI explicitly reports that search is unconfigured without it. Search uses
`search.list` and `videos.list`, verifies public/embeddable metadata, caches a
query for 15 minutes, and limits uncached searches to 50/day locally. A result
is eligible to queue for six hours. Search-result flags are not a guarantee
that an embed will play on every device or in every region; the TV surfaces
player errors and the host can skip. The API key must never use a
`NEXT_PUBLIC_` prefix.

## Verify

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
npx playwright install chromium
npm run test:e2e
# Optional on the hosted test project, with network access:
# LIVE_PLAYER_CHECK=1 npm run test:e2e -- tests/e2e/live-player.spec.ts --project=desktop-chromium
```

Integration tests mutate and clean up database rows, so run them only against a
separate hosted test project with the same migrations—not the live MVP data
project. Both `test:integration` and `test:e2e` refuse to start unless
`MYKARAOKE_TEST_DB_HOST` exactly matches that test database hostname.
Playwright checks multi-context guest search and
queueing with clearly seeded YouTube metadata fixtures, host ordering, guest
authorization denial, TV pairing, simulated player events, room creation/joining,
roster recovery, mocked microphone permission/device recovery, small-screen
overflow, and automated WCAG A/AA rules. A
separate opt-in check played the official YouTube IFrame API sample in desktop
Chromium on a paired browser context. Physical-phone QR scanning, real network
interruption, hosted-domain joining, smart-TV playback, and real microphones
remain untested.

Phase 7 adds a host/two-guests/TV browser journey with emulated offline/online
recovery, independent reloads, and host closure. That isolated journey passed
in desktop and mobile Chromium. The longer full browser run hit intermittent
503s and must pass before the release gate. Confirm `DATABASE_URL` points to a
designated hosted test project before running destructive integration or E2E
tests; do not run cleanup-oriented suites against live MVP data.

## Local Microphone Studio

After creating a room, the host can explicitly enable a browser-visible input,
watch a local level meter, switch inputs, adjust gain and monitor volume, mute,
enable light compression, and add basic room reverb. Monitoring remains off
until the host presses **Start monitoring**, and the UI warns that speakers can
create loud feedback. Microphone audio stays in the browser and is neither
uploaded nor recorded; it remains a separate Web Audio path from YouTube.

Microphone capture requires HTTPS or localhost. Device labels and USB/audio
interfaces appear only when the browser and operating system expose them.
Output follows the system default in this phase. Wireless latency is not
inferred from a device name. Permission denial, missing or lost inputs, and a
suspended audio context have recovery states. These flows passed mocked desktop
and mobile Chromium tests, but no real Mac/Windows microphone, USB interface,
Bluetooth route, latency, or acoustic-feedback check has been performed.

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
Configure the proxy settings only after the hosting proxy is chosen and
verified. Queue writes are additionally limited to 12 per guest or 40 per
host per minute; failed version conflicts do not consume a slot.

`npm run cleanup:rooms` marks expired rooms closed, revokes host sessions and
TV pairing authority, removes stale presence/attempt counters, and purges
rooms seven days after expiry. It must run with a server-only `DATABASE_URL`;
schedule it hourly in the eventual nonproduction/production environment. The
script is implemented, but no hosted scheduler has been configured or verified.
The CLI refuses a hosted database unless `MYKARAOKE_CLEANUP_DB_HOST` matches
its exact hostname, so the intended MVP project must be checked before
scheduling it.

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
and online-event refresh reconcile missed WebSocket events. Upcoming-queue
skip removes an entry; playback skip advances the active song.

## TV playback

The host generates an eight-character TV pairing code and opens `/tv/[code]` on
the playback browser. Entering the code gives that browser a private HttpOnly
device session; pairing a new display revokes the prior one. The host starts a
queued song and may pause, resume, or skip. The TV must press **Start video**
when the browser requires a user gesture. The TV reports actual player events;
server transactions advance the queue on end or host skip. Guests see the
current and next singer without receiving playback authority. Some videos
reject embedding even after the Data API reports them eligible; the TV shows
the error and asks the host to skip. A physical smart TV has not been tested.

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
