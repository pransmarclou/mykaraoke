# MyKaraoke Functional Build Phases

## Delivery model

MyKaraoke will be built as small end-to-end functional slices. Each phase has a
user-visible outcome, implementation boundary, tests, and an acceptance gate.
Do not begin the next phase merely because code exists; the current phase must
be demonstrably functional or explicitly marked **verification pending** with
the missing environment or hardware named.

Phases 0–10 are the web track. The native N1–N5 track starts only after the
cross-browser web MVP passes Phase 10 and the owner approves that handoff.
Completed phase numbers are preserved. Each track is divided into testable
vertical slices rather than a screen-first build.

## Status key

- `NOT STARTED`: No implementation work begun
- `IN DISCOVERY`: Requirements or evidence gathering in progress
- `IN BUILD`: Implementation and same-slice tests in progress
- `VERIFICATION PENDING`: Implemented but a named external check is unavailable
- `READY FOR REVIEW`: Acceptance evidence is complete
- `ACCEPTED`: Owner approved moving to the next phase

## Phase index

| Phase | Functional outcome | Broader milestone | Status |
|---|---|---|---|
| 0 | Project context and working rules | Preparation | ACCEPTED |
| 1 | Evidence-backed reference behavior map | Preparation | ACCEPTED |
| 2 | Runnable product shell and design baseline | MVP | ACCEPTED |
| 3 | Secure room creation and host recovery | MVP | ACCEPTED |
| 4 | Guest joining, membership, and presence | MVP | ACCEPTED |
| 5 | YouTube discovery and shared queue | MVP | ACCEPTED |
| 6 | Designated TV playback and host controls | MVP | READY FOR REVIEW |
| 7 | MVP reconnection, lifecycle, and multi-device gate | MVP | NOT STARTED |
| 8 | Local Microphone Studio | Microphone Studio | NOT STARTED |
| 9 | Singer and party experience | Party Experience | NOT STARTED |
| 10 | Cross-browser web MVP, compatibility, and launch | Web release | NOT STARTED |
| N1 | Native app foundation and core party actions | iOS/Android | NOT STARTED |
| N2 | App-scanned QR pairing to the web big screen | iOS/Android + web display | NOT STARTED |
| N3 | Native microphone and approved feature parity | iOS/Android | NOT STARTED |
| N4 | Native subscriptions and shared entitlements | Monetization | NOT STARTED |
| N5 | Native release and app-first transition | iOS/Android release | NOT STARTED |

---

## Phase 0 — Project context and working rules

### Outcome

Future work has a stable product brief, operating rules, durable memory,
reference-research ledger, and phase plan before any application code exists.

### Deliverables

- `Docs/agents.md`
- `Docs/memory.md`
- `Docs/project.md`
- `Docs/reference-app.md`
- `Docs/build-phases.md`

### Verification

- Confirm the five documents exist and agree on current status.
- Confirm no application files, dependencies, or generated project scaffolding
  were added.
- Confirm REA observations are not invented from the master brief.

### Acceptance gate

Owner reviews the documentation and explicitly chooses to begin Phase 1.

---

## Phase 1 — REA reference reconnaissance

### User-facing question

What minimum main-site, host, join, queue, playback, recovery, and paywall
behavior should inform a distinct MyKaraoke experience?

### Scope

- Inspect the primary root URL and dedicated `/host` URL using bounded REA
  browser workflows.
- Capture the main page's ordinary host/join entry points and handoff to the
  dedicated host flow.
- Capture initial host state and ordinary room creation.
- Capture one synthetic guest join and one invalid-code result.
- Capture one song search/queue action and ordinary host playback controls if
  the reference makes them available.
- Refresh host and guest once to observe recovery behavior.
- Discover the ordinary paywall trigger and record the actual route or UI
  presentation without entering payment information or completing checkout.
- Capture visible Free/paid capability boundaries, dismissal, and return flow.
- Record Evidence IDs, observations, inferences, limitations, and unknowns.
- Translate accepted behavioral findings into MyKaraoke requirements without
  copying visual composition, wording, assets, code, or brand identity.

### Tests and verification

- Evidence ledger is complete for every executed scenario.
- Each conclusion is traceable to evidence and correctly classified.
- Unobserved backend guarantees are not inferred from UI behavior.
- No credential, personal data, or destructive scenario is used.

### Acceptance gate

The owner approves the behavioral map and the independent MyKaraoke design
direction. No app scaffolding occurs before this gate.

---

## Phase 2 — Runnable product shell and design baseline

### User-facing outcome

A user can open a fast, responsive MyKaraoke shell, understand the product, and
navigate to host or join entry points. Nonimplemented actions are clearly
disabled or omitted.

### Scope

- Initialize Git and the approved Next.js/TypeScript package workflow.
- Establish App Router, Tailwind, shadcn/ui, icons, Motion, linting, formatting,
  type checking, and test runners with minimal dependencies.
- Implement the landing page and host/join entry surfaces.
- Establish tokens for color, type, spacing, focus, reduced motion, breakpoints,
  and TV-safe readability.
- Add global loading, error, and not-found handling.
- Create `.env.example` without secrets and foundational README instructions.
- Add CI-ready commands for lint, typecheck, unit, and Playwright tests.

### Tests and verification

- Unit checks for configuration helpers where applicable.
- Playwright: landing page renders; primary actions reach the correct entries;
  keyboard navigation and focus visibility work.
- Responsive checks at representative mobile, desktop, and TV-sized viewports.
- Automated accessibility smoke scan with documented limitations.
- Production build succeeds with no real service credentials.

### Acceptance gate

The shell is usable and honest about unavailable features, the build is clean,
and no fake room or queue behavior exists.

---

## Phase 3 — Secure room creation and host recovery

### User-facing outcome

A host can create a real temporary room, receive a short code, QR destination,
and share link, then refresh and remain an authorized host during the session.

### Scope

- Establish Supabase development workflow and typed server boundary.
- Add initial `rooms`, `room_sessions`, `room_settings`, and required event or
  authorization structures through additive migrations.
- Generate unique, human-enterable room codes with collision handling.
- Issue an unguessable host credential/session separate from the room code.
- Implement server-side room creation, expiration, validation, and host checks.
- Render the room code, joining URL, and QR code from canonical room data.
- Restore the host session after a normal refresh.
- Document cleanup behavior and configuration.

### Tests and verification

- Unit: code format, expiration rules, URL generation, validation.
- Integration: unique-code collision retry, room persistence, unauthorized host
  mutation denial, expired-room behavior, RLS policies.
- Playwright: create room, see matching code/link/QR destination, refresh, and
  retain host control.
- Manual: scan QR code using a real phone camera when available.

### Acceptance gate

At least one real room can be created and recovered without treating its public
code as host authority. Database and authorization tests pass.

---

## Phase 4 — Guest joining, membership, and presence

### User-facing outcome

Multiple guests can join a valid room with display names, see who is present,
refresh or briefly disconnect, and receive clear invalid/expired-room errors.

### Scope

- Add `room_members` and secure anonymous participant session identity.
- Implement link-based and short-code joining.
- Validate and normalize display names; define duplicate-name presentation.
- Implement participant presence separately from durable membership.
- Show host and guest participant lists according to permissions.
- Handle leave, refresh, reconnect, room expiry, and stale presence.
- Add a documented initial host-departure strategy.

### Tests and verification

- Unit: room-code normalization, display-name validation, presence reducer.
- Integration: valid/invalid/expired join, scoped session access, cross-room
  isolation, reconnect, and RLS.
- Playwright with multiple browser contexts: host plus two guests join; all see
  consistent membership; one guest refreshes and recovers.
- Network interruption simulation for a brief guest disconnect.

### Acceptance gate

The multi-context join journey is repeatable, secure across rooms, and recovers
from a normal refresh without creating unintended duplicate members.

---

## Phase 5 — YouTube discovery and shared queue

### User-facing outcome

A guest can search through a secure YouTube integration, select a supported
karaoke result, assign singer information, and add it to a queue visible in the
same order on host and guest devices.

### Scope

- Implement server-only YouTube Data API credentials, validation, caching,
  debounce, quota protection, and safe result mapping.
- Add `queue_items` with constraints and transactional ordering.
- Implement server-authoritative add, remove, reorder, and skip mutation
  boundaries with role checks.
- Define duplicate submission and optional per-participant limit behavior.
- Show search loading, empty, quota, unavailable, and error states.
- Synchronize queue updates over Supabase Realtime and reconcile after reconnect.

### Tests and verification

- Unit: query normalization, safe metadata mapping, duplicate policy, ordering.
- Integration: YouTube boundary with recorded fixtures, concurrent queue adds,
  reorder conflicts, authorization, idempotency, and cross-room isolation.
- Playwright multi-context: guest searches and adds; host sees the same item;
  unauthorized guest cannot perform host-only queue action.
- Live YouTube smoke test only when a real configured API key is available;
  record quota and result limitations.

### Acceptance gate

The real integration works with configured credentials, or the phase is marked
verification pending with only the live credential check outstanding. Queue
consistency and authorization must pass regardless.

---

## Phase 6 — Designated TV playback and host controls

### User-facing outcome

A designated TV/browser surface can start official YouTube playback after any
required user gesture. The host can control the current queue item, skip, and
advance, while guests see current and upcoming performers.

### Scope

- Add `playback_state` and a designated playback-device/session model.
- Integrate the official YouTube IFrame Player API.
- Implement explicit playback activation for autoplay-restricted browsers.
- Implement idempotent host play/pause/skip commands and queue advancement.
- Persist server timestamps and player intent without pretending every client
  clock is authoritative.
- Handle ended, embed-disabled, unavailable, regional, and player-error states.
- Build a TV-specific layout with current/next singer and no mobile navigation.
- Recover the TV surface after refresh without unauthorized host control.

### Tests and verification

- Unit: playback transition rules and idempotent command handling.
- Integration: designated-device authority, host authorization, end/skip queue
  advancement, command replay, and refresh state.
- Playwright: host, guest, and TV contexts share current/up-next state; playback
  activation and simulated player events update the queue correctly.
- Manual live-player verification in supported desktop browsers.
- Smart-TV results remain unverified until the exact hardware is tested.

### Acceptance gate

One complete multi-device performance flows from queued result to playback end
or host skip using official APIs, with consistent current/up-next state.

---

## Phase 7 — MVP lifecycle, reconnection, and release gate

### User-facing outcome

The complete basic party journey survives expected refreshes, short disconnects,
duplicate messages, host departure rules, and room expiration with clear user
recovery.

### Scope

- Harden Realtime subscription lifecycle and snapshot reconciliation.
- Deduplicate commands/events and define version/conflict handling.
- Finalize host transfer or room-closure behavior.
- Add room expiry warnings, cleanup jobs/functions, and safe terminal states.
- Add rate limits for room creation, joining, search, and queue mutations.
- Complete MVP error handling, telemetry boundary, and operational docs.
- Produce `ARCHITECTURE.md`, `FEATURES.md`, `ROADMAP.md`, and `TODO.md` from the
  implemented truth.

### Tests and verification

- Integration: duplicate commands, concurrent submissions, reconnect snapshots,
  host departure, transfer/closure, expiration, and cleanup.
- Playwright full journey with host, two guests, and TV in separate contexts.
- Inject short network loss and reload each surface separately.
- Security review of anonymous identities, RLS, server actions/endpoints,
  validation, rate limits, and secret handling.

### Acceptance gate

The Phase 1 functional MVP is deployable to a nonproduction environment and the
full multi-device journey passes without fake or manually edited state.

---

## Phase 8 — Local Microphone Studio

**Status (2026-10-19): Implemented; real hardware verification pending.** The
software slice and mocked desktop/mobile browser recovery checks pass. The
acceptance gate remains open until the stated physical-device matrix is run.

### User-facing outcome

A host can grant microphone permission, select a browser-visible input, see a
level meter, test monitoring safely, control gain/volume/mute, and use basic
reverb with clear feedback and compatibility guidance.

### Scope

- Build permission and secure-context onboarding.
- Enumerate and respond to input-device changes.
- Implement a deliberate Web Audio graph for input, gain, meter, mute,
  compression option, EQ/reverb boundaries, and output.
- Keep local microphone and YouTube paths separate.
- Require an explicit monitoring action and provide feedback warnings.
- Handle permission denial, device loss, suspended audio context, unsupported
  output selection, Bluetooth latency, and browser differences.
- Add external USB/audio-interface selection when exposed by the browser.

### Tests and verification

- Unit: audio state machine, parameter bounds, and capability detection.
- Browser integration tests with mocked MediaDevices and AudioContext edges.
- Playwright: permission-denied and device-disconnected UI recovery.
- Manual matrix on actual Mac and Windows hardware with built-in, USB, and any
  available Bluetooth devices.
- Measure latency where possible; do not infer it from device type.

### Acceptance gate

Local microphone behavior is usable on the hardware actually tested, and the
UI labels all unverified or unsupported combinations accurately.

---

## Phase 9 — Singer and party experience

### User-facing outcome

Parties can use fair singer rotation, duets, throttled TV reactions, favorites,
guest permissions, and accessible visual themes without weakening the stable
MVP lifecycle.

### Scope

- Implement singer rotation with host override and optional fairness rules.
- Assign two singers to duet queue items.
- Add scoped, throttled emoji reactions with brief TV animation.
- Add standard party themes based on design tokens.
- Add local favorites first, then optional account sync behind a clear boundary.
- Add configurable guest permissions enforced on the server.
- Improve reconnect handling for the new state.

### Tests and verification

- Unit: rotation fairness, duet assignment, reaction throttle, permissions.
- Integration: concurrent singer changes, favorites ownership, reaction abuse
  limits, and server-enforced guest restrictions.
- Playwright multi-context party scenario including duet and reactions.
- Accessibility checks for all themes, reduced motion, and TV contrast.

### Acceptance gate

Each party feature works independently and together in a multi-context session;
disabling a feature removes both its UI affordance and mutation permission.

---

## Phase 10 — Cross-browser web MVP, compatibility, and launch

### User-facing outcome

The complete web party works across supported phone, laptop, and TV browsers:
hosting, joining, search, queue, playback, recovery, and supported local
microphone features. No native app download or subscription is required for
the web MVP.

### Scope

- Deploy the existing host, guest, and TV flows behind HTTPS with production
  configuration, cleanup, operational alerts, and privacy-conscious telemetry.
- Test responsive layouts, touch, keyboard, TV remote/focus, autoplay recovery,
  and supported microphone behavior on named real devices and browsers.
- Complete WCAG AA review, performance/security checks, dependency review,
  secret scan, and truthful compatibility and failure-state documentation.
- Keep the browser host/guest experience complete during the web MVP; do not
  introduce an app-install gate or a web billing flow in this phase.
- Treat PWA installability as optional enhancement, not a launch prerequisite;
  YouTube and real-time party features must not be described as offline-ready.

### Tests and verification

- Full automated regression, production build, staging smoke test, and
  multi-context host/guest/display journey on a deployed HTTPS origin.
- Real iOS and Android browser, laptop browser, and named TV-browser matrix;
  separately mark passed, failed, limited, and untested capabilities.
- Manual QR join, player start/error recovery, network interruption, local
  microphone, keyboard/touch/remote, and accessibility checks where applicable.
- Review rate limits, RLS, authorization, secrets, cleanup, performance, and
  privacy against the deployed environment.

### Acceptance gate

The owner approves a usable deployed web MVP and its exact browser/device
support claims. Native N1 may start only after this gate; no native app or
subscription work is presented as part of web MVP completion.

---

## Native N1 — App foundation and core party actions

### User-facing outcome

An installed iOS or Android app can create or join a party and use the core
host/guest functions without relying on a repackaged website. The web MVP
remains available while native parity is being built.

### Scope

- Choose the mobile implementation approach only after evaluating platform UI,
  camera, microphone, subscription, and YouTube-policy requirements.
- Define durable app identity and account recovery without treating legacy
  anonymous web cookies as mobile credentials.
- Reuse secure server domain rules through versioned, authenticated APIs;
  implement native host/join, room state, song search, queue, and basic controls.
- Preserve a free path and the existing web host/guest experience throughout
  the migration; do not require installation yet.

### Tests and verification

- Native unit/UI tests for role transitions, identity recovery, search, queue,
  and host-control states on both platforms.
- Integration tests for app token scope, cross-room isolation, and reuse of
  server-side permission and queue rules.
- Real-device iOS/Android test: create, join, queue, and control a party with
  web participants; document unsupported platform differences.

### Acceptance gate

Both native platforms complete a core party journey against the same backend
without weakening web access or introducing billing as a prerequisite.

---

## Native N2 — Scan the web display QR and control the big screen

### User-facing outcome

The party opens MyKaraoke on a laptop or TV browser. That web display shows a
short-lived pairing QR. The host scans it with the installed app, confirms the
room, and controls playback from the phone while the web browser stays the
big-screen player. This is a new app-to-display pairing flow, distinct from
the current host-generated code typed into `/tv/[code]`.

### Scope

- Add a display waiting screen that creates a single-use, expiring QR claim
  bound to that display session, not a public room code.
- Use the app camera to scan and confirm the target room/display; the backend
  atomically binds the display to the host's room and rotates prior authority.
- Keep host actions app-authorized and player events display-authorized; the
  display must not inherit admin credentials from the QR.
- Handle expired, replayed, wrong-room, revoked, offline, and re-pair cases.
- Retain the web MVP's existing manual-code pairing as a documented fallback
  until the owner explicitly decides whether to retire it.

### Tests and verification

- Unit/integration: claim expiration, single use, replay rejection, binding,
  rotation, role separation, and concurrent scans.
- End-to-end: app scan → host confirmation → web player activation → host skip
  or video end → consistent current/up-next state.
- Real iOS and Android cameras with named laptop and TV browsers; test refresh,
  QR rescan, network loss, and screen replacement.

### Acceptance gate

One real phone scans a real web-display QR and completes a performance on each
supported platform/device pairing. No simulated QR or browser context alone
is claimed as hardware verification.

---

## Native N3 — Microphone and approved feature parity

### User-facing outcome

The app supports the approved party and microphone features natively where
the device permits them, with clear limitations. The web display remains the
official YouTube playback surface for big-screen use.

### Scope

- Port the accepted singer/party features and relevant settings to native UI.
- Implement local microphone permission, device behavior, monitoring, and
  effects without mixing with or extracting YouTube audio.
- Treat phone-to-display microphone transport as a separate experimental
  WebRTC slice: scoped signaling, mute, teardown, STUN/TURN, and measured delay.
- Do not promise wireless microphone quality or universal TV compatibility.

### Tests and verification

- Native state, permission, and audio-graph tests plus cross-device party tests.
- Real iOS/Android microphone and network matrix; record latency and dropouts
  before considering remote-mic support production-ready.

### Acceptance gate

Native host/guest features approved for the app work on both platforms.
Remote microphone remains explicitly experimental unless its separate device
and latency threshold is met.

---

## Native N4 — Store subscriptions and shared entitlements

### User-facing outcome

The free app can run the core party with an initial 10-song allowance. A user
can voluntarily complete a Google-served rewarded ad to unlock another block
of 10 song credits. Premium removes MyKaraoke ads, provides unlimited
MyKaraoke song credits, and unlocks only approved Premium features; purchase,
restore, cancellation, reward grants, and entitlement changes stay consistent
between iOS, Android, and the paired web display. YouTube may still serve its
own advertisements inside the official player.

### Scope

- Finalize the remaining Free/Premium decisions: allowance reset window,
  rewarded-block/frequency cap, no-fill behavior, prices, account model, legal
  text, and whether web host/guest access changes after native launch; obtain
  owner approval.
- Recheck current Apple, Google Play, and YouTube rules immediately before
  implementation. Use the applicable native store purchase systems and
  server-verified, idempotent subscription events rather than a cosmetic gate.
- Integrate the platform-appropriate Google rewarded-ad product using test ads
  during development. Show a clear voluntary prompt between songs on the
  personal controller, grant exactly 10 credits only after a verified reward
  event, and never place MyKaraoke ads over the YouTube player or shared stage.
- Count a credit only on the first authoritative `playing` event for an
  eligible song. Queue changes, retried events, skipped-before-play videos, and
  player failures must not double-charge or consume a credit.
- Keep ordinary YouTube viewing, core karaoke, accessibility, and safety
  available after an allowance is exhausted; prevent only new uncredited song
  starts. Never sell ad-free or bypassed YouTube playback.
- Preserve room context through purchase, cancel, failure, restore, expiry,
  grace period, ad decline/no-fill, reward verification, and cross-device
  sign-in.

### Tests and verification

- Unit/integration: capability matrix, 10-credit blocks, authoritative
  consumption, failed-video exclusion, ad reward replay/order, duplicate and
  forged callback rejection, grants, revocation, account linkage, and
  cross-platform entitlement refresh.
- Store sandbox/test-mode end-to-end flows on both platforms, including
  purchase, restore, cancel, billing failure, entitlement loss, rewarded-ad
  completion, dismissal, and no-fill recovery.
- Security/policy review of server authorization, purchase and reward
  verification, disclosures, child/privacy requirements, frequency limits, and
  the current Google Ads and YouTube/player restrictions.

### Acceptance gate

Real store and Google test-ad environments prove purchase through entitlement
loss and 10-credit reward grants on both platforms. Free parties still work,
declining an ad preserves existing state, and Premium removes MyKaraoke ads
without claiming ad-free YouTube. Production billing and ads wait for explicit
owner approval of pricing, reset/cap rules, terms, and platform review.

---

## Native N5 — Release and app-first transition

### User-facing outcome

iOS and Android become the primary personal party interface. A web browser
remains the big-screen display entered through app-scanned QR pairing.

### Scope

- Complete store review readiness, accessibility, privacy, support, crash
  reporting, performance, and a truthful supported-device matrix.
- Decide with the owner whether web host/guest flows remain available as a
  fallback or are restricted after native parity and adoption are verified.
- Provide an upgrade path for existing web rooms/users without silently
  granting app identity or subscription rights from anonymous web cookies.

### Tests and verification

- Production-like iOS, Android, laptop-browser, and named TV-browser journey;
  verify scan, party control, player recovery, subscription state, and logout.
- Store review/test-distribution pass and rollback/support plan.

### Acceptance gate

The owner approves app-first onboarding only after native parity, QR handoff,
billing, and real-device support are demonstrated. Web-display access remains
usable without entering payment details or host credentials on the TV.

---

## Cross-phase completion record

Update this table only with evidence, never optimism.

| Phase | Final status | Automated verification | Manual/device verification | Accepted by/date |
|---|---|---|---|---|
| 0 | ACCEPTED | Document inventory and consistency check passed 2026-10-17 | Not applicable | Owner instruction to proceed through Phase 2, 2026-10-17 |
| 1 | ACCEPTED | REA scenario captures and evidence ledger reviewed 2026-10-17 | In-app browser host refresh and route navigation | Owner instruction to proceed through Phase 2, 2026-10-17; unresolved questions carried forward |
| 2 | ACCEPTED | Lint, typecheck, production build, and 10 Playwright tests passed after branding 2026-10-17 | Desktop and mobile browser render reviewed; no browser page errors observed | Owner instruction to proceed to Phase 3, 2026-10-17 |
| 3 | ACCEPTED | Unit 4/4, integration 5/5, desktop/mobile Playwright 12/12, lint, typecheck, build, DB lint passed 2026-10-17 | Real room and QR reviewed in in-app browser; physical phone scan unavailable | Owner asked to proceed to Phase 4, 2026-10-18 |
| 4 | ACCEPTED | Unit 7/7, integration 8/8, Playwright 16/16 and static/schema checks passed 2026-10-18 | Local browser host/guest roster and refresh checked; physical phone untested | Owner asked to proceed to Phase 5, 2026-10-18 |
| 5 | ACCEPTED | Unit 11/11 after thumbnail refinement, integration 13/13, Playwright 18/18 and static/schema checks passed 2026-10-18 | Live local YouTube search and loaded thumbnails checked; no live playback claim | Owner asked to proceed to Phase 6, 2026-10-18 |
| 6 | ACCEPTED | Unit 15/15, integration 16/16, Playwright 20/20 and static/schema checks passed 2026-10-18 | Official sample played in desktop Chromium; two karaoke embeds failed; physical TV untested | Owner asked to continue, 2026-10-19 |
| 7 | IMPLEMENTED, VERIFICATION PENDING | Unit 15/15, integration 18/18, lint/typecheck/DB lint, production build, isolated desktop/mobile four-session journeys, hosted create/persist/authorized-close smoke, and 25 non-mutating production shell checks passed 2026-10-19; Firefox is blocked before navigation by the documented macOS 27 runner issue | Production HTTPS is Ready and real Safari host/reload checks passed; separate hosted test project, Firefox coverage, physical phone, and TV-browser checks remain | Owner review pending |
| 8 | IMPLEMENTED, VERIFICATION PENDING | Unit 19/19, lint/typecheck/build, and focused desktop/mobile microphone recovery journeys passed | Real Safari verified MacBook Pro microphone selection, input activity, and mute with monitoring off; Windows, USB, Bluetooth, safe monitoring, feedback, disconnect/recovery, and measured latency checks remain | Owner review pending |
| 9 | NOT STARTED | — | — | — |
| 10 | NOT STARTED | — | — | — |
| N1 | NOT STARTED | — | — | — |
| N2 | NOT STARTED | — | — | — |
| N3 | NOT STARTED | — | — | — |
| N4 | NOT STARTED | — | — | — |
| N5 | NOT STARTED | — | — | — |
