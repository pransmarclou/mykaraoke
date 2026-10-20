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
- Phase 8 gate: manually verify permission, input switching, monitoring,
  feedback safety, disconnect recovery, and measured latency on actual Mac and
  Windows hardware with built-in, USB/audio-interface, and available Bluetooth
  devices. Record exactly which combinations were tested.
- Phase 9 reaction/rotation/duet gate: apply all three additive Phase 9 migrations to the
  dedicated hosted test project, then run the authored integration and
  host/guest/TV Playwright journeys. Apply all three migrations in order before any
  production code deployment; do not run those suites against live MVP data.
- Phase 9 guest-permission gate: apply `20261020050000_guest_permissions.sql`
  to the dedicated hosted test project, run `tests/integration/permissions.test.ts`
  and `tests/e2e/permissions.spec.ts`, then apply it to production before
  deploying the code that reads the new columns.
- Continue Phase 9 with the independently testable standard-theme slice.
- Scores and leaderboard: owner-requested new scope; add it to
  `Docs/build-phases.md` as its own slice before building.
- Finish the cross-browser web MVP through Phase 10 before building the native
  app. Do not add a web paywall or mandatory app-install gate in that stage.
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
