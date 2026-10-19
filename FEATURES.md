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
local database and browser tests.

Verified locally: one live YouTube karaoke search returned results and the
official YouTube sample video played in desktop Chromium on a paired browser.
Two karaoke results returned embed error 150; hosted and physical-TV playback
remain unverified. Not yet implemented: microphone studio, accounts, and paywall.
Phase 7 broad browser/deployment verification is still pending.

Planned sequence: complete the cross-browser web MVP, then build iOS/Android
apps for party actions, app-scanned QR pairing to the web big screen, native
microphone/approved feature parity, and optional native subscriptions.
