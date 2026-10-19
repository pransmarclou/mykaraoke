# MyKaraoke Agent Working Agreement

This file is the operating guide for every human or AI contributor working on
MyKaraoke. Read this file first, followed by `project.md`, `memory.md`,
`reference-app.md`, and `build-phases.md`.

## Current instruction

Phases 0–6 are accepted by the owner's requests to continue. Phase 7 recovery
and lifecycle work is implemented locally but its release gate is still open:
the broad browser suite hit intermittent local 503s, and hosted/device checks
are unavailable. Do not start Phase 8 before Phase 7 review and verification.

Work one functional phase at a time. A phase is complete only after its
behavior is implemented, tested, documented, and accepted. Do not build all
screens first and postpone integration or testing.

Delivery order is now explicit: finish the cross-browser web MVP through
Phase 10 before starting native N1–N5. During the web stage, hosting, joining,
and playback must remain usable without installing an app. The later app-first
iOS/Android stage uses the web as a big-screen display paired by an app-scanned
QR; native subscriptions follow core app and display functionality. Do not
implement a web paywall or mandatory app-install gate during the web MVP.

## Product rules

- Build a distinct product named **MyKaraoke** by **Nook Studio**.
- The tagline is **Your songs. Your stage. Your party.**
- Use the reference application to understand behavior and workflow only.
- Never copy proprietary source code, branding, assets, text, or a distinctive
  layout from the reference application.
- Do not create fake functionality. A visible control must work, be explicitly
  disabled with an explanation, or be marked as an isolated prototype.
- Mock data is allowed only in clearly named test fixtures or isolated stories.
- Never claim a device, browser, microphone, network condition, or deployment
  was tested without evidence that it was actually tested.

## Required work sequence

For every functional phase:

1. Read the current state and decisions in `memory.md`.
2. Read the relevant acceptance gate in `build-phases.md`.
3. Review applicable reference evidence in `reference-app.md`.
4. State the smallest end-to-end behavior being delivered.
5. Implement only the code needed for that behavior.
6. Add or update automated tests in the same change.
7. Run the relevant lint, type, unit, integration, and end-to-end checks.
8. Perform the documented manual checks where hardware or browser policy is
   involved.
9. Record results, limitations, decisions, and the next phase in `memory.md`.
10. Stop at the phase gate and request owner review before expanding scope.

If a phase is too large to test as one unit, divide it into smaller vertical
slices. Do not split a slice into a nonfunctional frontend followed much later
by its backend.

## REA reference-analysis protocol

Use Reverse Engineer Anything (REA) for the supplied reference web application
when the current phase depends on observed behavior.

- Primary product target: `https://okevideoke.online/`
- Host-flow target: `https://okevideoke.online/host`
- Paywall target: discover and record the actual route/trigger through bounded
  REA observation; do not invent a route or assume purchase behavior.
- Start with a small, explicit question or scenario.
- Prefer passive inspection first. Only execute declared browser actions needed
  for that scenario.
- Record the REA Evidence ID, target/route, date, method, observations,
  limitations, and unresolved questions in `reference-app.md`.
- Label every statement as an **observation**, **inference**, or **MyKaraoke
  design decision**.
- Static evidence does not prove runtime behavior. A bounded search with no
  result does not prove that a feature does not exist.
- Do not enter real credentials, personal data, payment details, or secrets in
  the reference application.
- Do not test destructive, abusive, rate-limit-evading, or access-control-
  bypass behavior.
- Do not broaden an REA capture beyond the user-owned target and declared
  scenario.

REA findings inform requirements; they do not override MyKaraoke's security,
accessibility, legal, brand, or product constraints.

## Engineering boundaries

- Use Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide,
  Motion, Zustand, and TanStack Query only where each tool has a clear role.
- Use Supabase PostgreSQL, Realtime, Auth, RLS, and secure server-side or Edge
  Function boundaries.
- Keep secrets and YouTube API credentials on the server.
- Use official YouTube Data and IFrame Player APIs. Never download, extract, or
  alter YouTube media streams.
- Keep YouTube playback and microphone processing in separate audio paths.
- Send microphone audio over WebRTC, never through Supabase Realtime.
- Treat server state as authoritative for permissions and queue mutations.
- Treat the host or designated playback device as authoritative for actual
  player state. Do not use client clocks as the source of truth.
- Room codes are identifiers, not administrator credentials.
- Do not store microphone audio unless a future, explicit opt-in recording
  feature is approved.
- Prefer domain-oriented modules and typed service boundaries over large route
  components or premature abstractions.

## Testing standard

Every phase must define and satisfy all applicable layers:

- Unit tests for pure rules, parsing, ordering, and state transitions.
- Integration tests for database constraints, RLS, API boundaries, and
  concurrent mutations.
- Playwright end-to-end tests for real user journeys.
- Manual checks for YouTube policy behavior, autoplay, media permissions,
  audio hardware, remote controls, smart TVs, and real network interruptions.

A phase cannot be called complete when required credentials or hardware are
missing. It may be marked **implemented, verification pending** with the exact
missing verification listed.

## Security and repository hygiene

- Never commit secrets, tokens, private keys, service-role keys, or user data.
- Add configuration names and safe examples to `.env.example` when
  implementation begins.
- Preserve unrelated user changes.
- Use additive database migrations; never rewrite an applied migration.
- Validate and authorize every server-side mutation.
- Add rate limits and abuse controls at the boundary appropriate to the phase.
- Keep accessibility and safety controls available to free users.

## Documentation ownership

- `project.md`: stable product and architecture context.
- `memory.md`: current state, decisions, blockers, verification, and handoff.
- `reference-app.md`: REA questions, evidence, findings, and unknowns.
- `build-phases.md`: ordered functional slices and their acceptance gates.

When implementation begins, add the owner-requested public and engineering
documentation (`README.md`, `ARCHITECTURE.md`, `FEATURES.md`, `ROADMAP.md`,
`TODO.md`, and `.env.example`) in the phase where their contents can be kept
accurate.
