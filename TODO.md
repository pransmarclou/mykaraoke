# Next work

- Before hosted deployment, configure a restricted YouTube Data API key in the
  hosted secret store and verify search there. Rotate or restrict the key
  shared in chat before production use; local live search is already verified.
- Phase 7 gate: diagnose intermittent local 503s under the full browser suite;
  rerun lint, typecheck, integration, Playwright, and local DB lint. Then
  validate a nonproduction HTTPS deployment with a scheduled cleanup run and
  real phone/TV-browser checks before asking for owner acceptance.
- Finish the cross-browser web MVP through Phase 10 before building the native
  app. Do not add a web paywall or mandatory app-install gate in that stage.
- After the web gate, decide the native stack and account migration, then build
  app-scanned QR pairing to a web-display claim before subscriptions.
- Before the app-first launch, decide whether web host/guest flows remain a
  fallback and how existing anonymous rooms/users transition.
- Test a real karaoke embed, smart-TV browser, remote controls, and regional
  availability on the intended devices; error 150 occurred for two karaoke
  results despite Data API embeddability metadata.
- Before deployment: create a MyKaraoke-specific hosted Supabase project, set
  a private production database connection and HTTPS `APP_ORIGIN`, verify a
  trusted client-IP header for creation limits, and schedule expired-row cleanup.
- When a physical phone and deployed HTTPS origin are available, scan the QR,
  join from that phone, and verify real multi-device/reconnect behavior;
  localhost QR is same-computer only.
- Recheck the development-only ESLint dependency advisory documented in
  [Docs/memory.md](Docs/memory.md).
