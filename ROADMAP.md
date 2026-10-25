# Roadmap

Phases 0–2: project context, reference research, and product shell — complete.
Phase 3: secure local room lifecycle — accepted.
Phase 4: real guest joining, sessions, and presence — accepted.
Phase 5: secure song discovery and shared queue — accepted.
Phase 6: designated TV playback and host controls — accepted after owner
instruction to continue; desktop live-player check passed.
Web Phase 7: MVP reconnection and lifecycle gate — implemented locally,
verification pending (full suite, nonproduction deployment, devices).
Web Phase 8: local Microphone Studio — implemented; real hardware verification
pending before acceptance.
Web Phase 9: singer and party experience — implemented, verification pending. Browser-local favorites,
ephemeral rate-limited TV reactions, fair singer rotation, and duet assignment
plus guest permissions/phone remote and audience ratings/live leaderboard are
implemented. Three accessible personal themes plus host-synchronized room
themes are also implemented; dedicated hosted-test, combined multi-context,
migration-history, and physical TV verification remain open.
Web Phase 10: real phone/laptop/TV-browser compatibility, hardening, and web
MVP launch — in build. A public permission-free browser readiness check and
truthful tested-versus-open evidence ledger are implemented, along with tested
security/privacy response headers, a clean runtime dependency audit, branded
TV pairing/waiting states, a five-second singer-ready transition, and
directional remote focus. CSP, deployed smoke, and physical-device evidence
remain open. The web remains usable without an app or payment.

The owner directed Native N1 foundation work to begin on 2026-10-24 while the
web verification gates remain deferred. The Expo/React Native shell and secure
Google-account boundary are implemented; native create/join, queue, and host
controls remain next. N2 adds app-scanned QR pairing to the web big screen; N3 covers
native microphone and approved feature parity; N4 adds optional native store
subscriptions plus the Free rewarded-song-credit model: 10 initial credits and
10 more after an explicitly accepted, verified Google rewarded ad. Premium
removes MyKaraoke ads and provides unlimited MyKaraoke credits; it does not
promise removal of YouTube's in-player ads. N5 handles app-store release and
the app-first transition.
The web display remains the big-screen player. Mandatory app installation and
web host/guest fallback policy need a later owner decision, not an early gate.

Each phase must be tested as a functional slice. The detailed gates are in
[Docs/build-phases.md](Docs/build-phases.md).
