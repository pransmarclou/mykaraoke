# MyKaraoke Project Context

## Implementation status

As of 2026-10-20, Phase 9 is in build with browser-local song favorites as its
first functional slice. The owner explicitly deferred, but did not accept, the
remaining Phase 7 and Phase 8 verification. The production HTTPS deployment is
live; Phase 7's broad browser and real-device gate remains open. A
host can create a 24-hour room and invite guests. Guests can join, search
server-verified YouTube metadata when an API key is configured, assign a singer,
and add to a shared queue. Host-only order, skip, and remove actions are backed
by transactions; Supabase Realtime invalidations plus snapshot polling keep
devices reconciled. A paired TV browser can play through the official YouTube
IFrame API while the host starts, pauses, resumes, and skips. A live desktop
player smoke check passed with an official sample video; two karaoke results
returned YouTube embed error 150, and physical TVs remain untested.
Room expiry warnings, terminal states, snapshot reconciliation, safe retries,
queue-write limits, and a server-only cleanup command are implemented and
deployed.
The host can explicitly enable a local input and use metering, gain, mute,
monitor volume, compression, and reverb in a browser-only graph that remains
separate from YouTube. Hosts and guests can save validated song metadata to
the current browser and refresh YouTube availability before adding a favorite
later. Favorites do not sync to an account. Accounts and payments are not
implemented. See `memory.md` for verification and `build-phases.md` for the
next gate.

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

Creates and administers a room, controls playback, manages the queue and
participants, configures permissions, and manages microphones. Host authority
must be backed by a secure session and server-side authorization.

### Guest or singer

Joins on a mobile-first interface, selects a display name, searches songs, adds
or manages allowed queue entries, assigns singers, views the party state, and
reacts. An optional account can later synchronize favorites and preferences.

### TV or playback device

Runs a low-distraction fullscreen experience with the YouTube player, current
singer, next singer, playback-recovery prompts, and brief party reactions. It
shares room state but does not use mobile navigation or implicitly receive host
authority.

### Later native app

The installed iOS/Android app becomes the personal host/guest interface after
the web MVP. It will use native camera, account recovery, microphone, and store
purchase capabilities where approved. The web display remains a separate,
low-privilege playback surface. The current host-generated code entered on
`/tv/[code]` is a web-MVP pairing method; the app-scanned, display-generated
QR is a later handoff flow, not an already implemented feature.

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

Remote microphone audio is a later WebRTC system. Supabase may carry scoped
signaling metadata, but audio travels peer-to-peer or through approved WebRTC
infrastructure with STUN/TURN as needed.

Native clients will reuse server-authoritative room, queue, playback, and
entitlement rules through authenticated APIs, not browser cookies. A future
web display will mint an expiring one-use QR claim; an authenticated host app
scans and confirms it, and the backend binds only display authority to the
room. App identity, display pairing, and purchase identity must remain
separate. The native framework and account migration strategy are not chosen
until the N1 discovery gate.

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

- Remote phone microphones
- Multiple remote microphone streams
- Karaoke scoring
- Performance recording
- Payments, subscriptions, and the paywall (deferred to native N4)
- Native mobile or TV applications
- Claims of universal smart-TV or wireless-audio compatibility
