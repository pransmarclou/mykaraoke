# Next work

- Before hosted deployment, configure a restricted YouTube Data API key in the
  hosted secret store and verify search there. Rotate or restrict the key
  shared in chat before production use; local live search is already verified.
- Phase 7 gate: diagnose intermittent local 503s under the full browser suite;
  rerun lint, typecheck, integration, Playwright, and local DB lint. Then
  validate a separately allowlisted hosted test deployment and real
  phone/TV-browser checks before asking for owner acceptance. The production
  cleanup schedule is configured; its first natural invocation remains an
  operational check rather than a reason to mutate live data manually.
- Phase 8 gate: the owner confirmed audible USB EarPods monitoring. Separately
  characterize latency, then verify disconnect recovery and the remaining
  Windows and available Bluetooth combinations. Record exactly which devices
  and routes were tested.
- Phase 9 reaction/rotation/duet gate: apply all three additive Phase 9 migrations to the
  dedicated hosted test project, then run the authored integration and
  host/guest/TV Playwright journeys. Apply all three migrations in order before any
  production code deployment; do not run those suites against live MVP data.
- Phase 9 guest-permission gate: apply `20261020050000_guest_permissions.sql`
  to the dedicated hosted test project, then run
  `tests/integration/permissions.test.ts` and `tests/e2e/permissions.spec.ts`.
  The hosted MVP columns are present; reconcile migration history before the
  deployment review.
- Phase 9 theme gate: Stage Glow, Electric Blue, and Velvet Gold pass focused
  desktop/mobile personal persistence, overflow, and accessibility checks.
  Room-wide host/guest/TV synchronization is implemented. The hosted MVP
  column is present; apply
  `20261020070000_party_theme.sql` to the dedicated hosted test project and run
  `tests/integration/themes.test.ts` plus `tests/e2e/themes.spec.ts`. Apply the
  migration to every other target before code deployment and reconcile hosted
  migration history.
- Phase 9 scores gate: apply `20261020060000_performance_ratings.sql` to the
  dedicated hosted test project, run `tests/integration/scores.test.ts` and
  `tests/e2e/scores.spec.ts`, and reconcile migration history. The hosted MVP
  table and rating-permission column are already present.
- Finish the cross-browser web MVP through Phase 10 before building the native
  app. Do not add a web paywall or mandatory app-install gate in that stage.
- Phase 10 readiness gate: use `/compatibility` as the honest browser-side
  preflight, then fill the named physical iPhone, Android, Windows, TV-browser,
  Bluetooth, latency, disconnect, and Firefox evidence gaps. API detection is
  not device acceptance.
- Phase 10 security gate: response hardening, runtime dependency audit, and an
  enforced per-request nonce CSP pass locally (production build). Recheck the
  CSP on the deployed HTTPS origin, including `upgrade-insecure-requests`,
  Realtime on the hosted Supabase project, and Safari/Firefox/TV browsers. Do not
  apply npm's suggested breaking downgrade for the dev-only
  `eslint-config-next -> braces` advisory; recheck for a compatible upstream
  release.
- After the web gate, decide the native stack and account migration, then build
  app-scanned QR pairing to a web-display claim before subscriptions.
- For Native N4, implement the documented Free/Premium model: 10 initial
  qualifying song credits, then an optional verified Google rewarded ad for
  another 10; Premium has unlimited MyKaraoke credits and no MyKaraoke ads.
  Keep YouTube's own ads outside the entitlement promise.
- Before Native N4 implementation, decide the credit reset window/timezone,
  rewarded-block and frequency caps, no-fill fallback, account/device/room
  ownership, Premium price/billing period, and cross-platform restore rules.
  Use provider test ads during development, require an explicit reward prompt,
  and design idempotent server-side reward verification before granting credit.
- Before the app-first launch, decide whether web host/guest flows remain a
  fallback and how existing anonymous rooms/users transition.
- Test a real karaoke embed, smart-TV browser, remote controls, and regional
  availability on the intended devices; error 150 occurred for two karaoke
  results despite Data API embeddability metadata.
- Review and repair hosted Supabase migration history, confirm project ownership
  and backups, provision a separate hosted test project, and configure the same
  additive migrations there before running destructive integration/E2E suites.
- Before release acceptance: verify the first natural cleanup invocation in
  Vercel runtime logs and retain only privacy-safe operational fields.
- When a physical phone and deployed HTTPS origin are available, scan the QR,
  join from that phone, and verify real multi-device/reconnect behavior;
  localhost QR is same-computer only.
- Recheck the development-only ESLint dependency advisory documented in
  [Docs/memory.md](Docs/memory.md).
