# MyKaraoke Functional Build Phases

## Delivery model

MyKaraoke will be built as small end-to-end functional slices. Each phase has a
user-visible outcome, implementation boundary, tests, and an acceptance gate.
Do not begin the next phase merely because code exists; the current phase must
be demonstrably functional or explicitly marked **verification pending** with
the missing environment or hardware named.

The numbered phases below are the execution order. They map to the broader
milestones in the master brief without turning those milestones into large,
untestable batches.

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
| 5 | YouTube discovery and shared queue | MVP | READY FOR REVIEW |
| 6 | Designated TV playback and host controls | MVP | NOT STARTED |
| 7 | MVP reconnection, lifecycle, and multi-device gate | MVP | NOT STARTED |
| 8 | Local Microphone Studio | Microphone Studio | NOT STARTED |
| 9 | Singer and party experience | Party Experience | NOT STARTED |
| 10 | Accounts, entitlements, and paywall | Monetization | NOT STARTED |
| 11 | Experimental phone microphone | Advanced Audio | NOT STARTED |
| 12 | PWA, hardening, compatibility, and launch | Launch Readiness | NOT STARTED |

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

## Phase 10 — Accounts, entitlements, and paywall

### User-facing outcome

A user can understand what is free, encounter a clear paywall only when a Pro
capability requires it, subscribe through an approved billing provider, regain
the interrupted context, and have entitlements enforced consistently across
devices. Essential karaoke, accessibility, and safety controls remain free.

### Scope

- Finalize the Free/Pro capability matrix and current YouTube policy review.
- Add the minimum account requirement needed for durable purchases and restore.
- Select and integrate an approved billing provider with server-verified
  checkout and webhook processing.
- Model subscriptions, entitlement grants, revocation, grace periods, and
  provider event idempotency without storing sensitive payment data.
- Build a distinct MyKaraoke paywall informed by reference behavior but not by
  copied branding, copy, pricing, or visual composition.
- Preserve the user's room/task context through open, cancel, success, failure,
  and restore flows.
- Enforce premium capabilities on the server, not only through hidden UI.
- Document cancellation, refund/contact path, billing recovery, privacy, and
  environment configuration.

### Tests and verification

- Unit: capability matrix, entitlement state transitions, and plan display
  mapping.
- Integration: checkout creation authorization, signed webhook verification,
  duplicate/out-of-order events, cancellation, grace period, revocation, and
  cross-device entitlement refresh.
- Playwright using provider test mode: free user reaches paywall, dismisses and
  returns; successful test subscription unlocks only the correct capability;
  failed/cancelled checkout preserves the party.
- Security review: price IDs are server-controlled, webhook signatures are
  required, premium mutations reject missing entitlements, and no card data is
  handled by MyKaraoke.
- Policy review confirms that sold features do not promise advertisement-free
  YouTube playback or violate current platform terms.

### Acceptance gate

The complete test-mode purchase, restore, cancellation, and entitlement-loss
journeys pass; the free karaoke journey remains functional; production billing
is not enabled until pricing, legal text, and provider configuration are
explicitly approved.

---

## Phase 11 — Experimental phone microphone

### User-facing outcome

A joined phone can explicitly enter experimental microphone mode, grant access,
connect to the host over WebRTC, transmit voice, recover where feasible, and be
muted or adjusted by the host with honest quality indicators.

### Scope

- Define authenticated, room-scoped WebRTC signaling metadata.
- Add `microphone_sessions` and lifecycle authorization without audio storage.
- Establish peer connection, ICE exchange, STUN/TURN configuration, connection
  state, and teardown.
- Receive remote audio at the host, with per-singer mute/level controls.
- Support reconnection and microphone handoff rules.
- Measure one-way/round-trip indicators appropriate to the implementation and
  display meaningful warnings without claiming zero latency.
- Expand to multiple streams only after one remote stream is reliable.

### Tests and verification

- Unit: signaling state machine, permission policy, and quality-state mapping.
- Integration: scoped signaling, unauthorized subscription/mutation denial,
  stale session cleanup, reconnect, and TURN configuration errors.
- Automated two-context WebRTC smoke tests where the browser environment allows.
- Real iOS and Android phones on same-network and TURN-required network paths.
- Recorded latency and dropout measurements by device/browser/network.

### Acceptance gate

The feature remains labelled experimental until the real-device matrix and
latency evidence meet a separately approved production threshold.

---

## Phase 12 — PWA, hardening, compatibility, and launch

### User-facing outcome

MyKaraoke is installable, accessible, observable, rate-limited, documented, and
deployed with a truthful compatibility matrix and reliable failure recovery.

### Scope

- Add manifest, icons, install metadata, service worker, offline shell, and
  explicit offline limitations for YouTube and real-time features.
- Complete WCAG AA review and keyboard/remote-control interaction.
- Optimize loading, bundles, images, Realtime subscriptions, and database paths.
- Add privacy-conscious analytics, error reporting, and operational alerts.
- Perform security and abuse testing; validate cleanup and rate limits.
- Test supported browsers and available phones, laptops, microphones, and TVs.
- Configure Vercel/Supabase environments and production deployment runbooks.
- Finalize public and technical documentation from verified behavior.

### Tests and verification

- PWA install/offline-shell tests on supported mobile and desktop browsers.
- Full regression suite and production build.
- Accessibility audit and manual keyboard/remote pass.
- Performance budgets measured on representative devices and networks.
- Security review, dependency review, RLS policy tests, and secret scan.
- Compatibility matrix that separates passed, failed, limited, and untested.
- Staging deployment smoke test followed by a production launch checklist.

### Acceptance gate

The owner approves the tested compatibility/support claims, operational plan,
known limitations, and production deployment.

---

## Cross-phase completion record

Update this table only with evidence, never optimism.

| Phase | Final status | Automated verification | Manual/device verification | Accepted by/date |
|---|---|---|---|---|
| 0 | ACCEPTED | Document inventory and consistency check passed 2026-10-17 | Not applicable | Owner instruction to proceed through Phase 2, 2026-10-17 |
| 1 | ACCEPTED | REA scenario captures and evidence ledger reviewed 2026-10-17 | In-app browser host refresh and route navigation | Owner instruction to proceed through Phase 2, 2026-10-17; unresolved questions carried forward |
| 2 | ACCEPTED | Lint, typecheck, production build, and 10 Playwright tests passed after branding 2026-10-17 | Desktop and mobile browser render reviewed; no browser page errors observed | Owner instruction to proceed to Phase 3, 2026-10-17 |
| 3 | READY FOR REVIEW | Unit 4/4, integration 5/5, desktop/mobile Playwright 12/12, lint, typecheck, build, DB lint passed 2026-10-17 | Real room and QR reviewed in in-app mobile browser; physical phone scan unavailable | Owner review pending |
| 4 | NOT STARTED | — | — | — |
| 5 | NOT STARTED | — | — | — |
| 6 | NOT STARTED | — | — | — |
| 7 | NOT STARTED | — | — | — |
| 8 | NOT STARTED | — | — | — |
| 9 | NOT STARTED | — | — | — |
| 10 | NOT STARTED | — | — | — |
| 11 | NOT STARTED | — | — | — |
| 12 | NOT STARTED | — | — | — |
