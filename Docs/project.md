# MyKaraoke Project Context

## Implementation status

As of 2026-10-24, Phase 10 remains in build and the owner has explicitly begun
the Native N1 foundation while its deferred web/device gates remain open. A
separate Expo SDK 58 / React Native app now builds for iOS and Android with
MyKaraoke branding, Expo Router navigation, secure persisted Supabase sessions,
and a Google OAuth/deep-link account boundary. Native room actions are not yet
implemented, and no subscription or Premium entitlement is active. Phase 9 browser-local song favorites,
ephemeral TV reactions, fair singer rotation, duet singer assignment, guest
permissions/phone remote, and audience ratings with a live leaderboard as
implemented slices. Three accessible themes now apply the owner-brand Stage
Glow palette or Electric Blue and Velvet Gold alternatives. Personal choice
persists outside a room; the host's room choice synchronizes to connected host,
guest, and paired TV surfaces through server snapshots. The
owner explicitly deferred, but did not accept, the remaining Phase 7 through
Phase 9 verification. A public compatibility page now checks browser API
presence without asking for device permissions and separates that detection
from the named real-device evidence still required. Application-wide security
and privacy response headers are implemented without disabling same-origin
microphone capture; nonce-based CSP work remains open. The production HTTPS deployment is
live; Phase 7's broad browser and real-device gate remains open. A
host can create a 24-hour room and invite guests. The landing-page Start
session action provisions that browser as the designated TV and opens the TV
stage directly; manually opened TV URLs retain secure pairing as a recovery
path. The first active phone member atomically receives host authority, can
transfer it to another active member, and the next active member succeeds a
departing phone host. Guests can join, search
server-verified YouTube metadata when an API key is configured, assign a singer,
and add to a shared queue. Host-only order, skip, and remove actions are backed
by transactions; Supabase Realtime invalidations plus snapshot polling keep
devices reconciled. When an authorized TV is ready and the stage is idle, the
first song addition atomically becomes the current song; later additions stay
queued and never interrupt the current singer. A paired TV browser can play
through the official YouTube IFrame API while the host pauses, resumes, skips,
or manually starts a waiting song as a recovery action. A live desktop
player smoke check passed with an official sample video; two karaoke results
returned YouTube embed error 150, and physical TVs remain untested.
Room expiry warnings, terminal states, snapshot reconciliation, safe retries,
queue-write limits, and a server-only cleanup command are implemented and
deployed.
The host can explicitly enable a local input and use metering, gain, mute,
monitor volume, compression, and reverb in a browser-only graph that remains
separate from YouTube. Hosts and guests can save validated song metadata to
the current browser and refresh YouTube availability before adding a favorite
later. While a singer is on stage, hosts and guests can send one of four fixed,
server-rate-limited reactions that is broadcast ephemerally to the paired TV
and removed after a brief accessible animation. Reactions are not stored and
do not affect scores. Hosts and guests can independently give the live or
just-finished performance 1–5 stars; a room-only leaderboard groups ratings by
performer and is visible on the paired TV. The host can separately control
guest song additions, queue actions, reactions, ratings, and phone remote
commands. Favorites do not sync to an account. Optional hosted Supabase Auth
now provides email registration, email/password sign-in, confirmation,
password recovery, sign-out, persistent cookie sessions, and a Google OAuth
entry point without gating anonymous hosting or joining. The hosted project
now has Google enabled with the reviewed production callback chain. Account identity can
follow a user across browsers; favorites, saved queues, and room history remain
device/room-local and are not yet account-synchronized. Payments are not
implemented. See `memory.md` for verification and `build-phases.md` for the
next gate.

Connected host, phone, and TV surfaces receive short, private room
notifications when another member joins or adds a song. Join notices show the
member's room display name. Song notices distinguish an immediately started
first song from a request that remains in the queue. Events are transient,
validated on receipt, bounded to three visible notices, and are not persisted
as room history.

The host can enable fair rotation for waiting songs. It alternates normalized
singer names in stable rounds, preserves each singer's request order, and starts
after the current singer when that singer also has a waiting song. A manual host
Up/Down action is the explicit override and turns rotation off without changing
the chosen manual order.

A queue request can optionally name a second, distinct singer. Both names are
validated at the server boundary and remain visible in the queue, host/guest
playback status, and paired TV view. Fair rotation treats an unordered duet
pair as one performer unit, so reversing the two names does not create another
turn identity.

## Product summary

MyKaraoke has two sequential product stages. First, a complete web MVP works
across supported phone, laptop, and TV browsers: a host creates a room, guests
join without installing an app or creating an account, and a designated browser
plays the party's YouTube videos. Only after the web MVP is finished will
MyKaraoke build iOS and Android apps as the primary personal interface. In the
future app-first flow, the web big-screen display shows a pairing QR that the
host scans with the installed app; the app handles party actions while the web
browser remains the display. Native subscriptions are a later, separate gate.

**Tagline:** Your songs. Your stage. Your party.

The primary differentiator is Microphone Studio: browser-supported local
microphone selection, monitoring, level control, and audio effects, followed in
a later experimental milestone by phones acting as remote microphones over
WebRTC.

## Product outcomes

The web MVP succeeds when a new group can:

1. Open MyKaraoke in a normal browser.
2. Create a secure, temporary room without an account.
3. Put a QR code or room code on a shared display.
4. Join from multiple phones with display names.
5. Find embeddable YouTube karaoke videos and add them to a shared queue.
6. Play and advance songs from the designated playback device while the host
   controls the party.
7. Recover from common refreshes and brief network interruptions.
8. Connect a supported local microphone and understand any device limitations.

The later native stage succeeds when the same group can use installed iOS and
Android apps for approved host/guest features, scan a one-time QR shown by the
web display to pair the big screen, and optionally subscribe to clearly
defined Pro features. App installation must not be required during the web
MVP; any later mandatory-app transition requires owner approval after parity
and real-device verification.

## Users and surfaces

### Host

The first phone member becomes the active party host, controls playback,
manages the queue and participants, configures permissions, and manages
microphones. That member can transfer host authority to another active phone;
authority changes are serialized by the database and backed by the member's
private session rather than the public room code. The room creator's separate
private browser credential remains a recovery boundary for the web MVP. The
phone Host tab keeps the room theme, fair rotation, guest permissions,
participants, host reassignment, and local Microphone Studio together, with
shortcuts to the dedicated queue, score, and TV/playback surfaces. The active
phone host can also generate a temporary TV pairing code when recovering a
separately opened display. Closing the room remains restricted to the original
room creator credential.

### Guest or singer

Joins on a mobile-first interface, selects a display name, searches songs, adds
or manages allowed queue entries, assigns singers, views the party state, and
reacts. An optional account can later synchronize favorites and preferences.

### TV or playback device

Runs a low-distraction fullscreen experience with the YouTube player, current
singer, a short singer-ready countdown, next singer, playback-recovery prompts,
brief party reactions, and a persistent tabbed rail for Up Next, Scores, and
read-only song discovery. The empty stage uses an original silent Higgsfield
loop of a Filipino family enjoying videoke at home, darkened behind the join
card and stopped when the browser requests reduced motion. The room QR and code
remain available beneath every rail tab. The TV header carries an original
scrolling join reminder and temporarily replaces it with the title and singer
when the protected playback snapshot changes to a newly current song; this
notice is presentational and does not claim which authorized controller caused
the transition. Long content must wrap within the
information rail instead of widening or clipping the TV viewport. Searching
from the paired display never grants it
queue or host authority; adding a result stays on a joined phone. Arrow keys
move between the small set of display actions, Enter selects, and Back exits
fullscreen where the browser reports the key. It shares room state but does not
use mobile navigation or implicitly receive host authority.

### Native app

The installed iOS/Android app is now in Native N1 foundation work and becomes
the personal host/guest interface after native parity. It will use native
camera, account recovery, microphone, and store
purchase capabilities where approved. The web display remains a separate,
low-privilege playback surface. For the web MVP, Start session directly
provisions the current browser as the display; a temporary host-generated code
remains available only as a recovery method for a separately opened TV URL.
The app-scanned, display-generated QR is a later native handoff flow, not an
already implemented feature.

## Planned routes

| Route | Responsibility |
|---|---|
| `/` | Product landing and primary actions |
| `/host` | Create a room and operate host controls |
| `/room/[code]` | Mobile-first guest room |
| `/tv/[code]` | Fullscreen designated playback surface |
| `/join` | Join by short room code |
| `/songs` | Browse and search karaoke songs |
| `/favorites` | Local or account-backed saved songs |
| `/settings` | User preferences and supported audio settings |
| `/profile` | Optional account experience |
| `/studio` | Local and later remote Microphone Studio |

Routes describe product responsibilities, not a requirement that every route
be created before its behavior is implemented.

## Functional domains

- **Rooms:** creation, codes, expiration, host session, host transfer, settings
- **Participants:** anonymous identity, membership, presence, permissions
- **Songs:** YouTube search, metadata, caching, availability and embed checks
- **Queue:** atomic ordering, duplicate protection, singer assignment, limits
- **Playback:** designated device, commands, state, recovery, player errors
- **Audio:** input devices, gain, monitoring, processing, output constraints
- **Realtime:** durable events, ephemeral presence, reconnection, idempotency
- **Party:** rotation, duets, reactions, themes, favorites
- **Security:** RLS, signed sessions, validation, rate limits, cleanup
- **Platform:** cross-browser web, accessibility, compatibility, deployment,
  telemetry, and later native clients

## Architecture direction

The application will use Next.js App Router, React, TypeScript, Tailwind CSS,
and shadcn/ui. Client-only session and UI state can use Zustand; server-backed
data can use TanStack Query where it improves caching and mutation handling.

The MyKaraoke hosted Supabase project is the MVP source of truth; local
Supabase is not part of the normal development workflow. Supabase provides
PostgreSQL, Realtime, optional account authentication, Edge Functions or
secure server endpoints, and Row Level Security. Persistent room
facts and queue state belong in PostgreSQL. Presence and transient reactions do
not automatically belong in durable tables. Queue ordering and protected room
mutations must use server-authoritative, transactional operations.

YouTube discovery must pass through a secure server boundary with caching and
quota controls. Playback uses the official IFrame Player API on the designated
playback surface. Microphone processing uses MediaDevices and Web Audio without
extracting or combining the YouTube audio stream.

Remote microphone audio now has a deliberately experimental web slice for the
guest who requested the current song. Supabase carries scoped, ephemeral,
server-authorized signaling metadata only; audio travels peer-to-peer to the
host browser or through configured WebRTC STUN/TURN infrastructure. Capture
requires a guest gesture, arrives host-muted, is never persisted, and tears
down on stop or song change. Production status remains blocked on real phone,
network, latency, feedback, dropout, and TURN verification.

Native clients will reuse server-authoritative room, queue, playback, and
entitlement rules through authenticated APIs, not browser cookies. A future
web display will mint an expiring one-use QR claim; an authenticated host app
scans and confirms it, and the backend binds only display authority to the
room. App identity, display pairing, and purchase identity must remain
separate. The chosen foundation is Expo SDK 58 with React Native and Expo
Router. Native Supabase identity uses a separate securely persisted mobile
session and never promotes anonymous browser cookies into app credentials.
Versioned authenticated room APIs remain the next N1 slice.

## Initial data model direction

The planned normalized model includes:

- `profiles`
- `rooms`
- `room_members`
- `room_sessions`
- `queue_items`
- `song_favorites`
- `playback_state`
- `room_settings`
- `performance_ratings`
- `microphone_sessions`
- `room_events`
- `song_credit_ledger` (future N4)
- `ad_reward_events` (future N4)

Phase 3 implemented `rooms`, `room_settings`, `room_sessions`, and
`room_creation_limits`. Phase 4 added `room_members`, short-lived
`room_presence` leases, and `room_join_limits`. All have constraints, indexes,
and RLS denying direct client access; the server checks each private host or
guest credential before returning room data. Phase 5 added search cache and
quota tables plus `queue_items` and a private Realtime queue topic. The queue
is server-authoritative; the browser receives only invalidations and refetches
authenticated snapshots. Phase 6 added `playback_state`, short-lived pairing
codes, a rotating designated-device credential, and idempotent host command
records. The remaining tables belong to the phases that first use them.
Phase 7 added a private queue-mutation budget table and an idempotent cleanup
command. Vercel invokes the guarded cleanup route daily at 07:00 UTC; room
expiry itself remains immediate because every access path checks `expires_at`.
Phase 9 adds a server-only short-window reaction budget. Reaction payloads use
the room's existing private Realtime capability and are not persisted.
Its fair-rotation flag lives in the existing server-only `room_settings` row;
queue versions and private Realtime invalidations distribute every change.
The optional `queue_items.duet_singer_name` column keeps duet assignment in the
same protected, transactional queue record as the primary singer.
Phase 9 also extends `room_settings` with guest-control and rating flags.
`performance_ratings` stores one server-written 1–5 star rating per actor and
queue item; records are deleted with their temporary room and have no browser
database grant. The app derives the leaderboard from these room-scoped rows.
The checked `room_settings.party_theme` value is host-controlled and travels in
authenticated queue and playback snapshots; arbitrary colors or CSS are not
stored.
The phone-host handoff slice adds `rooms.host_member_id`. Joining locks the
room row so exactly one first active member claims phone-host authority;
transfers and host departure use the same server-authorized, transactional
boundary. The public room code never grants that role.

## UI and brand direction

- Brand: MyKaraoke
- Studio: Nook Studio
- Personality: modern, minimal, social, premium, and playful without being
  childish
- Supplied assets: `public/brand/microphone-logo.png` and
  `public/brand/mykaraoke-wordmark.png`. These are owner-provided identity
  assets, not reference-site assets.
- Palette direction: deep navy `#0B0D16` behind a yellow (`#FFBA35`) → orange
  (`#FF9C2E`) → coral (`#FF6B45`) → hot-pink (`#FF2471`) brand gradient.
- Primary interactive accent: deeper pink `#D92362` with white text for
  accessible button contrast; bright gradient colors are primarily decorative.
- Surface: `#191722`; primary text: `#FFF9F7`; muted text: `#B8AEB5`.
- The supplied wordmark has dark “My” lettering, so display it on a light
  cream (`#FFF2E5`) brand tile rather than directly on the dark page.
- Mobile: vertical layout, large touch targets, and bottom navigation when the
  active feature set justifies it
- Desktop host: player, queue, people, and controls arranged for simultaneous
  monitoring
- TV: oversized type, focus-visible remote navigation, minimal chrome, and an
  explicit playback start action where browser policy requires it
- Accessibility target: WCAG AA where practical, with reduced motion, keyboard
  use, focus order, labels, contrast, and clear error recovery designed in from
  the start

## Legal and platform boundaries

- Use official YouTube APIs and required attribution.
- Do not download media, extract streams, hide required advertisements, bypass
  regional or embedding restrictions, or imply offline YouTube playback.
- Do not promise advertisement-free playback.
- Validate YouTube policy and technical feasibility before monetizing any
  feature tied to YouTube content.
- Do not claim AirPlay, HDMI, Bluetooth, smart-TV, or remote-control behavior
  without testing the exact scenario.
- Scoring is research-only until valid reference melody data and measured pitch
  evaluation exist.

## Monetization and paywall direction

The complete web MVP remains usable without payment. Monetization belongs to
the later native N4 phase, after the app's core party and display handoff work.
Downloading the app and paying for Premium are separate actions. The owner set
the following initial Free/Premium song-credit policy on 2026-10-19; it is a
documented requirement, not an implemented feature.

- Free access retains room creation, QR joining, YouTube search, shared queue,
  basic host controls, basic local microphone controls, the standard theme, and
  all accessibility and safety controls.
- A free allowance starts with 10 qualifying song plays. After that block is
  used, the user may explicitly opt in to a Google-served rewarded ad that
  grants 10 additional song credits after verified completion. Each later
  block requires another separately disclosed, voluntary rewarded-ad grant.
- A song credit is consumed only when the designated player first reports that
  an eligible queued video is actually playing. Queueing, retry replay, and a
  video that fails before playback do not consume a credit.
- Premium removes MyKaraoke display and rewarded ads and provides unlimited
  MyKaraoke song credits while the entitlement is active. It does **not**
  remove, suppress, or promise the absence of advertisements served inside the
  official YouTube player.
- Candidate Premium benefits also include advanced microphone effects, additional
  simultaneous microphone streams, custom themes, advanced rotation, saved
  presets, analytics, and optional recordings where legally and technically
  valid.
- Rewarded ads appear only on a personal controller surface between songs,
  never over the YouTube player or on the shared TV stage. The prompt must name
  the exact reward, require affirmative opt-in, permit dismissal, and preserve
  the room and queue if no ad is available or the user declines.
- Song credits and rewarded-ad grants must be server-authoritative,
  idempotent, scoped to the entitled user/account, and verified using the
  platform's supported reward callback or server-side verification. Client
  events alone never grant credits.
- The paywall must explain the exact blocked capability and provide a safe way
  back to the party.
- UI visibility is not authorization. Server-side entitlements must protect
  premium mutations and resources.
- Native iOS and Android store-billing integration, pricing, trials,
  cancellation, restoration, receipts, taxes, refunds, and durable account
  requirements remain open decisions for N4.
- YouTube-backed capabilities must be reviewed against current YouTube terms
  before they are sold. MyKaraoke must never promise advertisement-free
  YouTube playback or require a subscription merely to view an embedded video.
- Still open for N4 owner/policy review: the free-allowance reset window and
  timezone, maximum rewarded blocks or frequency cap, no-fill fallback,
  account/room ownership rules, Premium price and billing period, and whether
  the same credit wallet applies across iOS and Android.
- Recheck [Apple App Review](https://developer.apple.com/app-store/review/guidelines/),
  [Google Play payments](https://support.google.com/googleplay/android-developer/answer/10281818),
  [Google rewarded-ad policy](https://support.google.com/adsense/answer/9121589),
  and [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
  at implementation time; platform rules and regional exceptions can change.

## Quality attributes

- Fast path from landing page to a joinable room
- Consistent server-authoritative state across devices
- Graceful refresh, reconnect, host departure, expiration, and playback errors
- Secure anonymous access with least privilege
- Mobile-first guest usability and TV-legible playback
- Observable failures without logging secrets or microphone content
- Maintainable, domain-oriented code with typed boundaries
- Evidence-based browser, audio, and device support claims

## Definition of a functional slice

A slice is complete only when all of the following are true:

- A real user journey works from its entry point to its persisted or visible
  result.
- The backend and authorization path are real when the behavior requires them.
- Error, empty, loading, and reconnect states relevant to the slice are handled.
- Automated tests protect its important rules and user path.
- Required manual or hardware checks are recorded truthfully.
- Documentation describes configuration and known limitations.
- No unrelated placeholder control appears functional.

## Out of scope for the first MVP

- Production claims for the experimental single-singer remote phone microphone
- Multiple remote microphone streams
- Karaoke scoring
- Performance recording
- Payments, subscriptions, and the paywall (deferred to native N4)
- Native mobile or TV applications
- Claims of universal smart-TV or wireless-audio compatibility
