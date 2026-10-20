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
Web Phase 9: singer and party experience — in build. Browser-local favorites,
ephemeral rate-limited TV reactions, fair singer rotation, and duet assignment
are implemented; dedicated hosted-test verification plus themes and permissions
remain open.
Web Phase 10: real phone/laptop/TV-browser compatibility, hardening, and web
MVP launch — not started. The web remains usable without an app or payment.

Only after the web MVP is accepted: native N1 builds iOS/Android core party
actions; N2 adds app-scanned QR pairing to the web big screen; N3 covers
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
