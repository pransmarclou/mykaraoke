# MyKaraoke Project Memory

This is the durable handoff record for the project. Update it at the end of
every work session and at every phase gate. Keep it factual and concise; link
to evidence or code rather than restating large documents.

## Snapshot

- Last updated: 2026-10-19
- Current stage: Phase 7 — MVP lifecycle, reconnection, and release gate
- Current status: Phase 7 implemented locally; verification pending after broad browser-suite instability
- Repository state: Git initialized on `main` during Phase 2; current Phase 7
  changes are in the working tree and have not been committed by this handoff
- Current phase gate: Stabilize the broad local browser run and verify a nonproduction deployment before Phase 7 acceptance
- Delivery direction: Finish the phone/laptop/TV-browser web MVP through Phase
  10; only then begin the installed iOS/Android N1–N5 track and native
  subscriptions. The owner subsequently asked to continue into Phase 7.
- Primary reference target: `https://okevideoke.online/`
- Dedicated host reference: `https://okevideoke.online/host`
- Paywall reference: Visible `/premium` route and root-page entry observed;
  in-party upgrade trigger and purchase lifecycle remain unresolved

## Owner instructions

- Create project context documentation before building.
- Use REA to study the reference web application.
- Build in phases organized by functionality.
- Implement and test each functional slice together.
- Do not attempt to build the whole application in one pass.
- Finish a complete cross-browser web MVP before switching to native apps.
- Later make the installed app the personal party interface; a web big-screen
  display shows a QR that the app scans to pair, and subscriptions are native.

## Confirmed product decisions

- Product: MyKaraoke by Nook Studio
- Tagline: Your songs. Your stage. Your party.
- Delivery: complete cross-browser web MVP first; later app-first iOS/Android
  with a QR-paired web display. PWA installability is optional, not a web gate
- Basic use: No account required to host or join
- Primary roles: Host, guest/singer, and TV/playback device
- Core backend: Supabase PostgreSQL, Realtime, optional Auth, and RLS
- Song source/playback: Official YouTube Data API v3 and IFrame Player API
- Local audio: MediaDevices and Web Audio APIs
- Remote phone microphone: Later experimental WebRTC phase
- Default experience: Dark, premium, social, playful, and responsive
- Product distinction: Strong microphone support and dependable multi-device
  synchronization
- Reference coverage must include the main product experience, the dedicated
  host flow, and the paywall/upgrade flow.
- Owner-provided microphone mark and MyKaraoke wordmark are the source of truth
  for branding; the current shell uses their yellow-to-pink colors.

## Non-negotiable constraints

- Reference analysis is behavioral research, not source or visual cloning.
- YouTube media must not be downloaded, extracted, modified, or played outside
  supported official APIs.
- API credentials must not be exposed to client code.
- Room codes must not grant host privileges.
- Queue mutations and host permissions must be enforced by the backend.
- High-bandwidth microphone audio must not use Supabase Realtime.
- YouTube audio and microphone audio remain separate paths.
- No claims of zero latency, smart-TV compatibility, or hardware support without
  measurements on the named devices.
- No fake controls, fake integrations, or unlabelled demo behavior.

## Decisions still required

These are not blockers for documentation or reference reconnaissance. Resolve
them at the phase that first needs them.

| Decision | Needed by | Status |
|---|---|---|
| Package manager and supported Node.js version | Foundation | Resolved: npm lockfile, Node.js >=20.9 per Next.js package engine |
| Supabase local vs hosted development workflow | Room lifecycle | Resolved for development: native local Supabase database plus Realtime |
| Supabase project and credentials | Hosted integration | Open; no MyKaraoke project exists and unrelated projects were not touched |
| YouTube API project/key and quota strategy | Song search | A key is configured in ignored local `.env.local` and live search passed; project ownership and hosted key/quota strategy remain open. Local 50 uncached searches/day and 30 requests/actor/day with 15-minute cache implemented |
| Anonymous participant identity/session design | Guest joining | Resolved locally: per-browser random HttpOnly guest credential, SHA-256 digest in `room_members`, scoped to one active room |
| Deployment Vercel project and environments | Launch readiness | Open |
| Analytics and error-reporting provider | Observability | Open |
| TURN provider and operating budget | Optional native N3 remote microphone | Open |
| Physical device test inventory | Audio/compatibility | Open |
| Native store products, pricing, and billing model | Native N4 | Open |
| Free/Pro entitlement boundary | Native N4 | Open pending policy review |
| Native framework and app identity migration | Native N1 | Open; preserve web anonymous sessions until an approved transition |
| Web host/guest availability after app launch | Native N5 | Open; owner said app-first, but mandatory-install timing and fallback policy require explicit approval after parity |
| Display QR claim design and device inventory | Native N2 | Planned: one-use expiring web-display claim scanned by the app; real iOS/Android and named TV hardware required |

## Current evidence and verification

- The supplied master brief was reviewed on 2026-10-17.
- The project directory contained no files at the start of documentation work.
- Git was not initialized in the project directory.
- All five Phase 0 documents exist under `Docs/` and their phase/status language
  was checked for consistency.
- A file inventory confirmed that no application code, project scaffold, or
  dependency files were created during Phase 0.
- REA browser captures documented the root page, host empty state, host
  search/add flow, invalid-code sign-in gate, and premium page. Evidence IDs and
  limitations are in `reference-app.md`.
- Reference-app valid guest joining and backend authorization, plus queue
  synchronization, player completion, and payment lifecycle, remain unverified
  in that reference. MyKaraoke's own Phase 4 guest flow is verified below.
- Phase 2 implemented the landing page and `/host` and `/join` entry routes,
  with visible unavailable states for room actions.
- Next.js 16.4.2, React 19.3.1, Tailwind CSS 4, shadcn Button source, and
  Lucide icons were installed. Motion, Zustand, and TanStack Query were deferred
  until they serve an implemented interaction.
- `npm run lint`, `npm run typecheck`, and `npm run build` passed on
  2026-10-17.
- Playwright: 10 of 10 desktop/mobile Chromium tests passed after the brand
  update, covering entry navigation, unavailable controls, image loading, theme
  token, no horizontal overflow, and automated WCAG A/AA rules.
- Desktop and 390px mobile browser layouts were visually inspected; local
  browser console reported no page errors. Local routes returned HTTP 200.
- Owner-supplied transparent PNGs were copied unchanged into `public/brand/`.
  The shared header, landing/host illustrations, favicon metadata, and theme
  now use them. The landing and host mobile previews were visually rechecked
  after this update. Lint, typecheck, build, and Playwright passed again.
- `npm audit --omit=dev` reported 0 production vulnerabilities. Full audit
  reported 5 high findings flowing through development-only
  `eslint-config-next → fast-glob → micromatch → braces@3.0.3`; npm currently
  reports braces 3.0.3 as its latest release. Recheck when a patched version
  is available.
- No Supabase, YouTube, microphone, payment, smart-TV, or multi-user integration
  was implemented or tested during Phase 2.
- Phase 3 uses a local Supabase native database (no Docker) with two additive
  migrations. No hosted project was linked or changed.
- A six-character public code, 24-hour expiration, 32-byte private host
  credential, SHA-256 stored digest, HttpOnly cookie, canonical invite link,
  QR image, refresh recovery, and host-only close are implemented.
- Room tables have RLS enabled with direct `anon` and `authenticated` grants
  revoked. The Next.js server uses a private database connection and checks the
  host credential on protected operations. Creation has a database-backed
  hourly limit (100 shared on loopback; 20/client address with a trusted
  configured proxy header outside localhost).
- `npm run test:unit`: 4/4 passed. `npm run test:integration`: 5/5 passed,
  covering persistence, credential separation, collision retry, expiration,
  limit rollover, and denied select/insert/update/delete under both public DB
  roles. `npm run test:e2e`: 12/12 desktop/mobile passed, including create,
  refresh, QR/link presence, cross-browser host denial, idempotency, close,
  accessibility, and responsive smoke checks. `supabase db lint --local`
  reported no schema errors. Production build, lint, and typecheck passed.
- The in-app mobile browser was used to create and inspect a real local room.
  A physical-phone QR scan was not available; localhost links work only on the
  same machine. Guest joining was disabled in Phase 3.
- Phase 4 added one additive migration for durable guest membership, separate
  30-second presence leases, and a database-backed join-attempt limit. Guests
  use a private HttpOnly cookie; display-name duplicates get stable numbered
  labels. One browser can hold one active guest room session at a time.
- `npm run test:unit`: 7/7 passed. `npm run test:integration`: 8/8 passed,
  including scoped guest access, duplicate names, idempotent join, expired and
  ended rooms, stale presence, leaving, and denied direct access under both
  public database roles. `npm run test:e2e`: 16/16 desktop/mobile Chromium
  passed, including host plus two guest contexts, same-browser host+guest
  cookies, refresh, a simulated brief offline period, leaving, error states,
  and guest-room accessibility/overflow checks. Lint, typecheck, production
  build, and local schema lint passed on 2026-10-18.
- REA evidence `ev_b9cc1bd9...` and `ev_0b6bf2a9...` show a fresh host code
  followed by a separate-browser join attempt that opened a sign-in modal.
  The reference guest flow remains unresolved; see `reference-app.md`.
- Phase 5 reused the existing REA host Search/add evidence `ev_36f243...`; it
  does not establish guest behavior, queue security/sync, or true playback.
- Phase 5 added server-only YouTube Data API search and video-status calls,
  safe metadata mapping, a 15-minute query cache, a daily 50-uncached-search
  budget, 30 requests/actor/day, and a 500 ms UI debounce. Without a key the
  UI reports configuration is missing rather than displaying mock songs.
- `queue_items` uses unique active positions, room-row locking, versioned host
  changes, idempotent request UUIDs, same-actor duplicate rejection, and a
  three-active-song guest limit. Host-only reorder/skip/remove is checked by
  the API. Direct `anon`/`authenticated` table access is denied.
- A random private Realtime topic is disclosed only after checked room access.
  Database broadcasts carry only a version invalidation; clients refetch an
  authenticated queue snapshot and poll every 3 seconds as reconnect recovery.
  A local integration test received a private broadcast and confirmed a random
  topic fails the topic-capability check.
- Phase 5 verification on 2026-10-18: lint, typecheck, build, local database
  lint, 10/10 unit, 13/13 integration, and 18/18 desktop/mobile Playwright
  tests passed. Browser tests used explicitly seeded YouTube metadata fixtures,
  not a live API call. A separate manual live search passed as described below;
  playback itself is Phase 6 and remains unverified.
- The existing local in-app browser host view was visually checked at a narrow
  viewport. Entering a non-fixture query showed the explicit missing-key
  message; the input was cleared afterward. No live YouTube request was made.
- On 2026-10-18, the owner supplied a key. It was stored only as server-side
  `YOUTUBE_API_KEY` in ignored `.env.local` with file mode 600; no hosted
  secret was configured. A manual search for `Dancing Queen ABBA` through the
  local `/host` room UI returned 12 karaoke results, including relevant ABBA
  videos. A scan of 26 existing browser asset files under `public/` and
  `.next/static/` found no copy of the key. Evidence:
  `test-results/phase5-live-search.png`. No item was queued and no playback or
  regional embed availability was tested in that check.
- Phase 5 UI refinement: Search results and queued songs now show a thumbnail
  derived from the validated YouTube video ID, with an icon fallback if the
  image fails. The Next.js remote-image pattern is limited to YouTube's
  thumbnail path. Lint, typecheck, 11/11 unit tests, the two desktop/mobile
  song-queue browser tests, and production build passed. The live local host
  search showed loaded thumbnails at a narrow viewport; screenshot:
  `test-results/phase5-thumbnails-mobile.png`. No playback was attempted.
- Phase 6 added one designated TV/browser session per room, an expiring
  eight-character pairing code, device credential rotation, a TV-only player
  event boundary, idempotent host start/pause/resume/skip commands, and automatic
  queue advancement on a verified end event. The TV uses the official YouTube
  IFrame Player API and requires an explicit start gesture. Guests see only
  read-only current/up-next state; a public room code grants no device control.
- Phase 6 verification on 2026-10-18: lint, typecheck, production build,
  local schema lint, unit 15/15, integration 16/16, and desktop/mobile
  Playwright 20/20 passed; the two opt-in live-player variants are skipped in
  the routine run. The desktop opt-in live check separately passed with the
  official YouTube IFrame API sample video playing on the paired TV browser
  before host skip. Screenshot: `test-results/phase6-live-tv.png`.
- Local `.env.local` now uses `APP_ORIGIN=http://127.0.0.1:3100` to match the
  documented preview URL. Its server-only YouTube key remains ignored and was
  not copied into documentation or browser code.
- Two karaoke search results tested earlier on desktop returned YouTube player
  error 150 despite reporting embeddability in the Data API. The TV showed a
  recovery message and host skip advanced the queue. A successful sample-video
  playback does not guarantee karaoke-video availability. No physical smart
  TV, remote control, HDMI output, hosted domain, or regional variant was tested.
- A final pure command-replay rule and unit test were added after the full
  browser pass; lint, typecheck, unit 15/15, build, and focused playback
  integration 3/3 and focused desktop playback browser 1/1 passed afterward.
  The full browser suite was not rerun for that server-side pure-rule extraction.

## Active blockers

Phase 7 cannot be accepted yet. The isolated desktop and mobile four-session
journeys passed, but a broad serial browser run intermittently returned 503
from local search/room endpoints. A nonproduction deployment, scheduled cleanup,
trusted proxy IP header, HTTPS origin, and real cross-device checks remain
unverified. The configured `.env.local` points at a separate hosted database;
Phase 7's additive migration was applied only to the native local stack. Do
not run Phase 7 code against that other database until its ownership and
migration plan are confirmed. Rotate or restrict the key shared in chat before
production. Physical smart-TV behavior and video-specific embed failures
remain unresolved.

## Next approved action

Reproduce/classify the intermittent local 503, rerun the full browser suite,
then validate the multi-device journey on a MyKaraoke nonproduction HTTPS
deployment with hourly cleanup scheduled. Request owner review at that gate;
do not begin Phase 8 yet.

## Decision log

| Date | Decision | Reason | Consequence |
|---|---|---|---|
| 2026-10-17 | Start with documentation only | Owner requested context before build | No app code or scaffolding created |
| 2026-10-17 | Organize delivery as vertical functional slices | Features must be testable as they are built | Each phase includes an acceptance gate and tests |
| 2026-10-17 | Maintain a separate REA evidence ledger | Reference facts must remain distinguishable from inference and product choices | `reference-app.md` is required input to relevant phases |
| 2026-10-17 | Treat the root site as the primary reference and `/host` as a focused flow | Owner clarified the reference hierarchy | REA scenarios now cover main, host, and paywall separately |
| 2026-10-17 | Add a dedicated post-MVP paywall phase | Monetization must be functional and testable, not a cosmetic modal | Entitlements and billing remain separate from the karaoke MVP |
| 2026-10-17 | Proceed through Phases 0–2 | Owner explicitly authorized the range | Phase 0 and the bounded Phase 1 gate are accepted; build Phase 2 |
| 2026-10-17 | Use npm, Next.js 16.4.2, and Node.js >=20.9 | Supports current App Router and reproducible lockfile | Keep `package-lock.json` with the source when the first commit is made |
| 2026-10-17 | Defer Motion, Zustand, and TanStack Query | The current static shell has no matching state or animation need | Add each when a functional phase justifies it |
| 2026-10-17 | Use distinct MyKaraoke art and layout | Reference evidence covers workflows, not reusable branding | The Phase 2 UI uses original CSS illustration and brand tokens |
| 2026-10-17 | Adopt owner-provided logo and wordmark before Phase 3 | Owner supplied both PNGs and asked for a theme based on their colors | Shared header, illustration, icon, and theme use the new identity; Phase 3 remains gated |
| 2026-10-17 | Proceed with Phase 3 after owner request | Owner explicitly asked for the next phase | Phase 2 accepted; room slice implemented without beginning guest joining |
| 2026-10-17 | Use local Supabase native database | Installed CLI supports Apple Silicon native runtime; no Docker or MyKaraoke hosted project exists | Local schema and RLS can be exercised without touching unrelated hosted projects |
| 2026-10-17 | Keep public code and host authority separate | Room code is easy to share and guess | Only an HttpOnly random credential can restore or close a room |
| 2026-10-17 | Keep guest join disabled in Phase 3 | No guest session or permission model exists yet | Invite links prefill the join page but cannot enter a room |
| 2026-10-18 | Proceed with Phase 4 after owner request | Owner asked for the next functional phase | Phase 3 accepted; guest join, membership, and presence implemented together |
| 2026-10-18 | Use private anonymous guest sessions and separate presence leases | A public code or display name must not grant roster access; refresh should not duplicate membership | One active guest room per browser; guest cookie is HttpOnly and room-scoped server-side |
| 2026-10-18 | Keep a room open after host tab departure until explicit close or 24-hour expiry | Host session is recoverable after refresh and no transfer model exists yet | Guests may join and see the roster while host is away; Host is labelled owner, not falsely shown online |
| 2026-10-18 | Poll roster every 5 seconds and heartbeat every 10 seconds | Local database-only stack provides a testable presence slice without Realtime service | Online means heartbeat within 30 seconds; queue synchronization remains Phase 5 |
| 2026-10-18 | Proceed with Phase 5 after owner request | Owner asked for the next functional phase | Phase 4 accepted; discovery and queue implemented together |
| 2026-10-18 | Keep search server-only and unavailable without a key | No MyKaraoke YouTube API project/key was supplied | Browser cannot expose a key or imply fixture songs are live |
| 2026-10-18 | Use a private Realtime invalidation topic plus authenticated snapshots | Queue order must remain server-authoritative and no member/song data should leak through broadcast | WebSocket updates reduce delay; 3-second polling reconciles missed events |
| 2026-10-18 | Limit guests to three active songs and reject same-actor duplicates | Protect queue fairness and accidental double taps | Request UUID replay is idempotent; host can manage the queue |
| 2026-10-18 | Store the owner-supplied YouTube key only in ignored local `.env.local` | Live Phase 5 smoke testing needs a server-side credential, and no hosted secrets store is linked | Live local search passed; hosted search still needs its own restricted secret and verification |
| 2026-10-18 | Show YouTube thumbnails in search and queue cards | Owner requested visible video artwork before the next phase | Derive the CDN path only from validated video IDs; use a fallback and keep playback gated |
| 2026-10-18 | Proceed with Phase 6 after owner request | Owner asked for the next functional phase | Phase 5 accepted; TV pairing, playback, host control, and tests implemented together |
| 2026-10-18 | Give one paired TV the player-event authority | A room code and guest session must not spoof playback or grant host controls | Short-lived pairing code issues a rotating HttpOnly device credential; host commands remain separately authorized |
| 2026-10-18 | Keep player activation explicit and errors recoverable | Browser autoplay policy and per-video YouTube restrictions vary | TV user presses Start video; error/blocked states are shown; host may skip |
| 2026-10-19 | Finish the cross-browser web MVP before native development | Owner clarified delivery order and device strategy | Phase 10 becomes the web compatibility/launch gate; native N1–N5 start afterward; current Phase 6 review is unchanged |
| 2026-10-19 | Plan an app-scanned QR shown by the future web display | Owner wants phones to initiate big-screen use after native launch | Native N2 adds a one-use display claim and app confirmation; current manual TV pairing stays as web-MVP behavior |
| 2026-10-19 | Move subscriptions out of the web MVP into native N4 | Owner wants native iOS/Android subscription focus after web completion | Web remains usable without app install or payment; native purchase and server entitlement rules get separate gates |

## 2026-10-17 session handoff

- Phase and slice: Phases 0–2, documentation, bounded REA research, and product
  shell.
- Completed: Root and host entry pages, shared header/footer, illustrated
  landing, pending room states, error/loading/not-found states, Next.js tooling,
  and browser tests.
- Files/migrations changed: `Docs/`, root project files, `src/`, and
  `tests/e2e/`; no database migrations.
- Tests run and results: Lint, typecheck, and build passed; 8/8 Playwright
  tests passed; production dependency audit 0 findings.
- Manual/device verification: Desktop and mobile viewport review in Chromium;
  no physical phone, TV, or microphone test.
- Evidence IDs used or created: See `reference-app.md` evidence ledger.
- Known limitations: Guest reference join behavior unresolved; no room backend
  yet; development-only ESLint dependency advisory remains.
- Next exact action: Owner reviews Phase 2; Phase 3 starts on request.

## 2026-10-17 branding handoff

- Phase and slice: Phase 2 brand refinement before the Phase 3 gate.
- Completed: Installed both owner-provided PNG assets, replaced the old header
  wordmark and stage microphone art, adopted a warm yellow/orange/coral/pink
  palette on deep navy, and used a light brand tile to keep the dark “My”
  lettering legible.
- Files/migrations changed: `public/brand/`, shared header and illustrations,
  page styling, icon metadata, browser tests, and project documents; no
  database migrations.
- Tests run and results: `npm run lint`, `npm run typecheck`, `npm run build`,
  and `npm run test:e2e` passed; Playwright 10/10 across desktop and mobile.
- Manual/device verification: Landing and host branding inspected at the
  in-app browser's narrow mobile viewport; no physical device checks.
- Known limitations/blockers: Host/join room actions remain intentionally
  unavailable. No Phase 3 or payment functionality was started.
- Next exact action: Owner reviews the branded Phase 2 shell, then explicitly
  requests Phase 3 when ready.

## 2026-10-17 room-lifecycle handoff

- Phase and slice: Phase 3, create/share/recover/end one temporary room.
- Completed: Local Supabase native database and migrations, server repository
  and mutation routes, branded host UI with code/link/QR, cookie recovery,
  end-room action, and disabled code-prefilled join preview.
- Files/migrations changed: `supabase/config.toml`, two additive migrations,
  room modules, API routes, host/join UI, tests, README, and context documents.
- Tests run and results: Unit 4/4, integration 5/5, desktop/mobile Playwright
  12/12, lint, typecheck, build, and local database lint passed.
- Manual/device verification: Real room created and viewed in the in-app
  mobile browser; no physical phone, hosted domain, or multi-device joining
  tested.
- Evidence IDs used or created: Reused host and refresh evidence in
  `reference-app.md`; no new REA capture claimed.
- Decisions made: Local native Supabase, 24-hour expiry, server-held random
  host credential, DB-backed creation limit, guest join deferred.
- Known limitations/blockers: Localhost QR only works on the same computer;
  guest join is disabled. Hosted environment and trusted proxy setup are open.
- Next exact action: Owner reviews Phase 3; Phase 4 begins only on request.

## 2026-10-18 guest-joining handoff

- Phase and slice: Phase 4, join by link/code, secure anonymous membership,
  roster and presence recovery.
- Completed: Guest form and room page; private guest credential and checked API
  routes; duplicate-name labels, leave/expiry/errors, host and guest roster;
  server polling plus short-lived presence leases.
- Files/migrations changed: One additive Phase 4 migration, guest room modules,
  API routes, host/join/guest UI, tests, and project documentation.
- Tests run and results: Unit 7/7, integration 8/8, desktop/mobile Playwright
  16/16, lint, typecheck, production build, and local database lint passed.
- Manual/device verification: The local in-app browser displayed a joined
  guest and roster in the same browser as the host, including after reload.
  No physical-phone QR scan, hosted-domain test, or real network interruption;
  Playwright simulated a brief offline period.
- Evidence IDs used or created: `ev_b9cc1bd9...`, `ev_0b6bf2a9...` (bounded
  reference attempt; successful guest behavior not established).
- Decisions made: One active guest room per browser; host departure leaves the
  room open until explicit close or expiry; 30-second presence lease.
- Known limitations/blockers: Localhost invites only work on the same computer;
  presence is polling, not Supabase Realtime; a hosted project and real devices
  are needed for deployment verification.
- Next exact action: Owner reviews Phase 4; Phase 5 begins only on request.

## 2026-10-18 song-discovery and queue handoff

- Phase and slice: Phase 5, secure YouTube discovery and shared queue.
- Completed: Official Data API search/video-status boundary, cache/quota and
  error states; transactional queue add/reorder/skip/remove; singer assignment;
  room-scoped private Realtime invalidation and snapshot recovery; host/guest UI.
- Files/migrations changed: Two additive Phase 5 migrations, `src/lib/songs/`,
  three API routes, room UI, test fixtures/tests, `.env.example`, and project
  documentation.
- Tests run and results: Unit 10/10, integration 13/13, desktop/mobile
  Playwright 18/18; lint, typecheck, production build, and local schema lint
  passed. Realtime integration received a version event over a private channel.
- Manual/device verification at implementation handoff: No real YouTube API
  call yet; the local mobile-width host preview and missing-key message were
  inspected. A later live local search passed; see the key-verification handoff
  below. No physical-device or live-player test.
- Evidence IDs used or created: Reused `ev_36f243...` for the visible reference
  host Search/add transition; no new REA capture claimed.
- Decisions made: Cache verified metadata for 15 minutes, keep search-result
  eligibility for six hours, limit search budget and guest queue length, carry
  only version invalidations over Realtime, and reconcile from the server.
- Known limitations/blockers at implementation handoff: Live YouTube result
  behavior was not yet checked; a later manual search passed. Embeddability
  flags cannot guarantee playback in every region or device; actual player
  handling is Phase 6. Localhost invites remain same-computer only. Hosted
  Supabase and device checks remain open.
- Next exact action: Owner review of Phase 5; only then proceed to Phase 6 on
  request.

## 2026-10-18 live-search key-verification handoff

- Phase and slice: Phase 5 live YouTube search smoke check.
- Completed: Stored owner-supplied key as server-only `YOUTUBE_API_KEY` in
  ignored, mode-600 `.env.local`. Local `/host` search for `Dancing Queen ABBA`
  returned 12 karaoke results. No secret value was added to project docs or
  `.env.example`; no hosted secrets store was configured.
- Tests run and results: Manual browser search passed; prior automated Phase 5
  checks remain as recorded above. Quota consumption was not independently
  measured beyond the successful request, and no player/embed test was run.
- Manual/device verification: In-app browser room UI showed the results;
  screenshot saved to `test-results/phase5-live-search.png`. No song was queued
  in this check and no physical device was used.
- Known limitations/blockers: The key was shared in chat and should be rotated
  or restricted before production. Hosted search and regional/device playback
  remain unverified. Owner review is the remaining Phase 5 gate.
- Next exact action: Owner reviews the Phase 5 functionality and then requests
  Phase 6 if ready.

## 2026-10-18 thumbnail refinement handoff

- Phase and slice: Phase 5 search and queue presentation.
- Completed: Video thumbnails in both search results and queue cards, responsive
  placement, image-load fallback, and a narrow remote-image allowlist.
- Tests run and results: Lint, typecheck, unit 11/11, desktop/mobile queue
  browser tests 2/2, and production build passed.
- Manual/device verification: Local live results displayed thumbnails in the
  in-app browser at a narrow viewport. See `test-results/phase5-thumbnails-mobile.png`.
- Known limitations/blockers: Thumbnail presence does not prove a video will
  play; playback and hosted deployment are unverified. Owner review remains
  the Phase 5 gate.
- Next exact action: Owner reviews Phase 5; Phase 6 only on request.

## 2026-10-18 TV playback handoff

- Phase and slice: Phase 6, designated TV playback and host controls.
- Completed: Additive playback migration; expiring/rate-limited TV pairing and
  rotating device credential; host-only idempotent start/pause/resume/skip;
  TV-only observed player events; automatic end/skip advancement; current and
  up-next status on host, guest, and TV; explicit activation and YouTube error
  recovery prompts.
- Files/migrations changed: `supabase/migrations/20261018030000_playback.sql`,
  `src/lib/playback/`, playback API routes, host/guest playback dashboard,
  `/tv/[code]`, and unit/integration/browser tests.
- Tests run and results: `npm run lint`, `npm run typecheck`, `npm run build`,
  `supabase db lint --local` passed; unit 15/15, integration 16/16, routine
  desktop/mobile Playwright 20/20 passed (two opt-in live tests skipped).
  Desktop opt-in live-player check passed separately. Initial integration run
  failed only because local Realtime was stopped; it passed after `supabase
  start`. Initial browser run used a mismatched localhost origin; test-server
  configuration was corrected. A transient desktop join delay in one full run
  passed on the rerun with a 15-second navigation assertion.
  A final command-replay pure-rule extraction passed focused playback
  integration 3/3 and focused desktop playback browser 1/1; the full browser
  suite predates only that behavior-preserving extraction.
- Manual/device verification: Actual YouTube sample video played in desktop
  Chromium on a separately paired browser context and responded to host skip;
  screenshot `test-results/phase6-live-tv.png`. Two real karaoke results yielded
  player error 150 and were recovered with host skip. Mobile player events were
  simulated in Playwright; no live mobile or physical smart-TV playback claim.
- Evidence IDs used or created: Bounded reference `/host` search/add capture
  `ev_22a5b34124c0482c7a28ea2bdc1d5bf402311fbb568aeb4efb4ed3b3fc89c3b4`;
  actual reference playback/end was not established.
- Decisions made: Device credential is separate from host/guest credentials;
  one paired device at a time; explicit TV start gesture; player errors pause
  intent and show a host-skip path. The REA skill kept reference claims bounded
  to visible iframe/controls, and the React review prompted a retry-safe
  YouTube script loader.
- Known limitations/blockers: Embeddability metadata does not guarantee actual
  playback; physical TV, remote, hosted HTTPS, and regional behavior remain
  untested. Phase 7 reconnection/lifecycle work is not started.
- Next exact action: Owner reviews Phase 6; begin Phase 7 only on request.

## 2026-10-19 product-sequencing handoff

- Phase and slice: Planning change only; Phase 6 remains ready for owner review.
- Completed: Reframed the roadmap as web Phases 0–10 followed by native N1–N5.
  The web MVP is complete only after real phone, laptop, and named TV-browser
  journeys are verified. The later app-first model uses installed iOS/Android
  apps for party actions and an app-scanned QR displayed by the web big screen.
  Subscriptions moved to native N4; no billing or app-install gate was built.
- Files changed: Product context, phase plan, contributor instructions,
  roadmap, and public project direction only; application/runtime code was
  not changed for this planning decision.
- Tests run and results: Documentation consistency and diff checks only;
  prior Phase 6 automated/live-player evidence remains unchanged.
- Policy evidence: Current [Apple App Review](https://developer.apple.com/app-store/review/guidelines/),
  [Google Play payments](https://support.google.com/googleplay/android-developer/answer/10281818),
  and [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
  were consulted on 2026-10-19. Recheck them before native billing or player
  implementation; this planning pass is not legal or store approval.
- Decisions made: Keep current web TV code-pairing for the web MVP; add a
  separate one-use display-generated QR claim in native N2. Keep the web MVP
  independently usable and free while the native app is developed.
- Open owner choices: Exact post-native web host/guest fallback, native stack,
  account migration, Pro capabilities/pricing, and supported TV hardware.
- Next exact action: Owner reviews Phase 6; proceed to Phase 7 only when asked.

## Phase 7 handoff — 2026-10-19

- Completed: Room expiry warning in roster; terminal queue, playback, and TV
  states that clear stale controls and stop the player; monotonic snapshot
  reconciliation; Realtime resubscription with polling fallback; stable retry
  keys for queue adds and host playback commands; database-backed queue write
  limits; explicit host-closure/no-transfer behavior; idempotent cleanup
  function and `npm run cleanup:rooms`; reliable full navigation after
  join/leave/close; four-context host/two-guests/TV recovery test.
- Safety: The cleanup CLI refuses a hosted database unless
  `MYKARAOKE_CLEANUP_DB_HOST` matches its exact hostname. This guard was
  exercised against the existing configuration; it made no hosted change.
- Schema: `20261019010000_lifecycle_limits.sql` applied to local Supabase only.
  No unrelated hosted database was migrated.
- Tests: lint (no errors), typecheck, unit 15/15, integration 18/18, and
  local DB lint passed after the final navigation and build-runner edits. The
  Realtime test timed out once under an eight-second local stack deadline;
  with an explicit cold-stack allowance, the full integration run passed.
  Isolated four-context desktop
  and mobile Chromium journeys passed. Optimized production build passed.
  Production-mode baseline playback test passed in a serial suite. A broader
  run was stopped after intermittent local 503 responses, so the full Phase 7
  automated gate is **not** claimed.
- Manual/device: No physical phone, smart TV, real short network outage,
  hosted HTTPS domain, or regional karaoke embed check. Playwright network
  loss used browser-context offline emulation; YouTube player was a test
  fixture in this Phase 7 journey.
- Evidence: Existing bounded REA host refresh evidence in
  `Docs/reference-app.md`; no new reference capture was needed for the
  MyKaraoke-specific lifecycle policy.
- Decisions: Host tab departure leaves the room open until explicit closure
  or 24-hour expiry; no host transfer. Cleanup should run hourly with a
  server-only local/hosted database connection and purge after seven days.
  The native app-first pairing/subscription track still begins only after
  the web MVP gate.
- Next: Diagnose the intermittent local 503; run the complete suite and
  schema lint, then nonproduction deployment and real-device checks. Stop at
  Phase 7 review before Phase 8.

## Session handoff template

Append a short entry after future work sessions:

```text
Date:
Phase and slice:
Completed:
Files/migrations changed:
Tests run and results:
Manual/device verification:
Evidence IDs used or created:
Decisions made:
Known limitations/blockers:
Next exact action:
```
