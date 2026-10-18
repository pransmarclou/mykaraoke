# Next work

- Before hosted deployment, configure a restricted YouTube Data API key in the
  hosted secret store and verify search there. Rotate or restrict the key
  shared in chat before production use; local live search is already verified.
- Owner review of Phase 5 queue behavior before Phase 6 playback begins.
- Before deployment: create a MyKaraoke-specific hosted Supabase project, set
  a private production database connection and HTTPS `APP_ORIGIN`, verify a
  trusted client-IP header for creation limits, and schedule expired-row cleanup.
- When a physical phone and deployed HTTPS origin are available, scan the QR,
  join from that phone, and verify real multi-device/reconnect behavior;
  localhost QR is same-computer only.
- Recheck the development-only ESLint dependency advisory documented in
  [Docs/memory.md](Docs/memory.md).
