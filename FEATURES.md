# Features

Implemented: landing and navigation; branded host/join entry; real 24-hour
room creation; six-character code; canonical invite link and QR; same-browser
host recovery after refresh; host-only room closing; guest joining by code/link;
validated display names with numbered duplicates; private guest session;
host/guest roster; 30-second presence leases; guest refresh/reconnect/leave;
invalid and expired-room errors; secure YouTube search boundary and honest
unconfigured state; YouTube video thumbnails in search results and the queue;
search cache/quota controls; singer assignment; shared transactional queue;
host-only reorder/skip/remove; private Realtime queue invalidations and
reconnect snapshots; designated TV pairing, official YouTube playback,
host play/pause/resume/skip, player-error recovery, and current/up-next status;
expiry warning, terminal display on room closure, replay-safe UI retries,
Realtime reconnection, queue-write limits, and a server-side cleanup command;
local Microphone Studio with permission onboarding, browser-visible input
selection, level meter, gain, monitor volume, mute, compression, reverb,
explicit monitoring, and permission/device/audio-suspension recovery; local
browser favorites; fixed, server-rate-limited host/guest reactions delivered
ephemerally to the paired TV with reduced-motion support; optional fair singer
rotation with stable per-performer ordering and manual host override; optional
two-singer duet assignment visible in the queue and playback surfaces; local
database and browser tests.

Verified locally: one live YouTube karaoke search returned results and the
official YouTube sample video played in desktop Chromium on a paired browser.
Two karaoke results returned embed error 150; hosted and physical-TV playback
remain unverified. Microphone flows passed with browser mocks, but real
Mac/Windows, built-in, USB, Bluetooth, feedback, and latency checks are still
required. Not yet implemented: accounts, native billing, Premium entitlements,
song-credit metering, or rewarded ads. Phase 7 broad browser/deployment
verification is still pending.

Planned sequence: complete the cross-browser web MVP, then build iOS/Android
apps for party actions, app-scanned QR pairing to the web big screen, native
microphone/approved feature parity, then Native N4 monetization. The planned
Free tier starts with 10 qualifying song credits and grants 10 more after each
explicitly accepted, verified Google rewarded ad. Premium removes MyKaraoke ads
and provides unlimited MyKaraoke credits; YouTube may still show its own ads.
