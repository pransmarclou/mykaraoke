# Reference Application Research Ledger

## Purpose and boundary

Primary reference target: `https://okevideoke.online/`

Dedicated reference surfaces:

| Surface | Known target | Research purpose |
|---|---|---|
| Main product | `https://okevideoke.online/` | Landing, value proposition, primary entry points, join path, navigation, and upgrade discovery |
| Host | `https://okevideoke.online/host` | Room creation, host controls, QR/share flow, queue, playback, and recovery |
| Paywall | Root entry to `/premium` observed; in-party trigger unresolved | Upgrade entry points, gated capabilities, plans, dismissal, return path, entitlement feedback, and purchase lifecycle |

REA will be used to understand the observable main experience, karaoke hosting,
joining, room-code, QR-code, song-search, queue, playback, and paywall workflows.
The research is an input to product requirements, not a request to reproduce
proprietary code, assets, branding, copy, pricing, or a distinctive layout.

This ledger deliberately separates:

- **Observation:** directly supported by retained evidence or a recorded manual
  check.
- **Inference:** a reasoned interpretation that the evidence does not directly
  establish.
- **MyKaraoke decision:** an independent design or engineering choice.
- **Unknown:** a question not answered within the inspected boundary.

## Current research status

- Status: Phase 1 bounded reconnaissance complete for the Phase 2 shell; deeper
  guest, queue synchronization, and playback research remains open for the
  functional phases that need it
- REA Evidence IDs: Recorded below
- Runtime scenarios captured: Main entry, authenticated sign-in, host initial
  state, host search and add, Scores/Search tabs, premium page, invalid join
  attempt, and the active-singer cheer prompt
- Static assets or application bundles inspected: None
- Credentials used: A user-supplied reference-site test account was used only
  in a temporary REA browser session; no credential value was written to this
  repository or documentation
- Findings approved for implementation: Independent host and join entry
  surfaces, a separate upgrade destination later, and an explicit empty state

Do not convert expected behavior from the master brief into a claimed reference
observation. It remains a MyKaraoke requirement until REA evidence supports a
reference finding.

## Research order

Investigate only the behavior needed by the next approved build phase.

1. Establish the main-site navigation, product entry points, and initial state.
2. Establish the dedicated `/host` state and minimum room-creation scenario.
3. Capture joining through a room link, QR destination, and short code.
4. Capture guest identity and reconnect behavior.
5. Capture song search and queue submission.
6. Capture host queue controls and playback transitions.
7. Discover the ordinary paywall trigger and actual route or presentation.
8. Capture non-destructive paywall states without completing a purchase.
9. Capture playback/room failure states visible without destructive testing.
10. Inspect other behavior only when a later MyKaraoke phase requires it.

Prefer passive browser evidence. Use an active REA browser scenario only for
explicit, bounded actions. Do not submit personal information or probe access
controls outside ordinary product use.

## Functional research questions

### Main product experience

- What does the root page communicate before any interaction?
- Which actions lead to hosting, joining, browsing, signing in, or upgrading?
- Which navigation and calls to action persist across viewport sizes?
- What functionality is usable without an account or purchase?
- Where does the main experience hand off to the dedicated host flow?

### Host creation

- What is visible before room creation?
- Is room creation immediate or does it require configuration?
- What identifiers, QR destinations, and share actions are shown?
- Which host controls appear before and after a guest joins?
- What happens after host refresh or tab restoration?

### Guest joining

- What inputs are required to join?
- How are invalid, expired, or malformed room codes handled?
- Is guest identity retained after refresh?
- How are duplicate display names presented?
- What does the guest see before any song is playing?

### Song discovery and queue

- How is search entered, debounced, paginated, or filtered?
- What metadata is visible before adding a result?
- How is the singer assigned?
- How are duplicate or repeated requests handled?
- What queue state and actions differ between host and guest?
- What feedback confirms that a queue mutation succeeded or failed?

### Playback and TV behavior

- Which device appears authoritative for playback?
- What user action satisfies autoplay restrictions?
- What states appear for loading, ended, unavailable, or non-embeddable videos?
- How are current and next singers communicated?
- What survives refresh or reconnect?

### Permissions and recovery

- Which actions are host-only in the observed UI?
- How are host leave, guest leave, reconnect, and room expiry represented?
- What behavior is visibly rate-limited or guarded against repetition?
- Which claims cannot be established without backend or runtime evidence?

### Paywall and upgrade flow

- Which ordinary user action first reveals the paywall?
- Is it a page, modal, drawer, inline gate, or redirect, and what is its actual
  route when one exists?
- Which capabilities are presented as free, limited, trial, or paid?
- Is an account required before plans or checkout are shown?
- How can a user dismiss the paywall and return to the interrupted task?
- How are an existing entitlement, restoration, cancellation, or billing error
  represented?
- Which pricing or purchase claims cannot be validated without entering a real
  checkout and therefore must remain unresolved?
- Which observed ideas are compatible with YouTube policy and which require an
  independent MyKaraoke policy/legal review?

## Scenario worksheet

Create one row per bounded scenario. Never combine unrelated journeys into one
large capture.

| Scenario ID | User goal | Start state | Declared actions | Expected evidence | Status |
|---|---|---|---|---|---|
| REF-MAIN-01 | Observe the main product entry | Fresh root-site load | Navigate to root; no form submission | Primary actions, navigation, entry routes, visible free/upgrade cues | Observed with REA |
| REF-MAIN-02 | Follow the host entry | Fresh root-site load | Use the ordinary host call to action once | Route transition and handoff into `/host` | Observed in browser UI |
| REF-HOST-01 | Observe initial host screen | Fresh target load | Navigate to target; no form submission | Initial controls, text hierarchy, route, visible states | Observed with REA |
| REF-HOST-02 | Create a room | Fresh host screen | Use ordinary create-room flow | Resulting route, code/QR/share behavior, host state | Partial: room code and QR visible; backend lifecycle unknown |
| REF-JOIN-01 | Join from room link | Fresh reference host and separate browser | Attempt room-code joining with a synthetic code observed on the host | Join states and resulting guest surface | Partial: sign-in gate; successful guest flow not observed |
| REF-JOIN-02 | Reject invalid code | Join entry | Submit a clearly synthetic invalid code once | Validation and recovery state | Observed a premium sign-in modal; expected validation behavior unresolved |
| REF-QUEUE-01 | Add one search result | Valid host and guest test sessions | Search a common song; add one result once | Search metadata, confirmation, synchronized queue | Partial: host add/current playback observed; guest sync unresolved |
| REF-PLAY-01 | Start and end playback | One queued item | Use ordinary playback controls | Authority, transitions, next-item behavior, errors | Partial: current player and skip observed; actual play/end unverified |
| REF-RECOVER-01 | Refresh guest | Joined synthetic guest | Refresh once | Identity and room-state recovery behavior | Not run |
| REF-RECOVER-02 | Refresh host | Active synthetic room | Refresh once | Host/session and playback recovery behavior | Partial: same room code reappeared after browser refresh; backend session behavior unknown |
| REF-PAY-01 | Discover the paywall | Fresh ordinary session | Follow one visible upgrade action or attempt one clearly labelled premium capability | Trigger, actual route/presentation, dismiss behavior | Observed root navigation to `/premium`; premium action during a party unresolved |
| REF-PAY-02 | Compare visible plan states | Open paywall without checkout | Inspect plans and capability labels; do not enter payment data | Free/paid boundaries, account requirement, disclosures, unresolved checkout facts | Observed visible offer and payment instructions; no purchase |
| REF-PAY-03 | Return to the party | Open paywall | Use the ordinary close/back action once | Return destination and preservation of prior state | Browser back returned to root; in-party return unresolved |
| REF-PARTY-01 | Inventory visible party controls | Fresh host surface | Navigate to `/host`; wait for the initial surface; do not click, search, or join | Visible party controls and tabs relevant to Phase 9 | Observed with REA; one initial host state only |
| REF-AUTH-01 | Establish authenticated reference state | Signed-out root | Open the ordinary sign-in modal and submit the user-supplied test account once | Authenticated account indicator and ordinary signed-in navigation | Observed with REA; no account settings, purchase, or recovery action attempted |
| REF-PARTY-02 | Inspect authenticated host tabs | Authenticated host room | Open Scores, then Search; observe each state without modifying account data | Empty-score state and visible discovery controls | Observed with REA; one host state and one viewport only |
| REF-PARTY-03 | Observe the active-singer party prompt | Authenticated host Search tab | Add one visible result and inspect the current-performance surface | Queue confirmation, current singer/player controls, and any reaction guidance | Observed with REA; guest reaction controls, reaction delivery, and scoring effect were not exercised |
| REF-SCORE-01 | Inspect score behavior after a skipped performance | Authenticated host room with one added song | Add the first visible song, use the ordinary Skip control once, then open Scores | Whether skipping creates a score or exposes a score-entry control | Observed with REA; Scores returned to its empty state and no host score form appeared |
| REF-SCORE-02 | Inspect the advertised guest score model | Authenticated mobile root and a newly created room code | Read the signed-in product explanation, then submit the room code once from the temporary mobile session | Stated score ownership and any guest score-entry surface | Partial: marketing text states the singer records a score and everyone sees a live leaderboard; the room expired with the temporary host browser, so the guest interaction was not observed |

## Evidence ledger

Add a row for every retained REA result or manual verification source.

| Date | Evidence ID/source | Scenario | Route/target | Type | Supported observation | Limitations/unknowns |
|---|---|---|---|---|---|---|
| 2026-10-17 | `ev_8963a335e1bc54e264d7e0768ea8882033b14009432eb63c74337d72a4f464ab` | REF-MAIN-01 | `/` | REA controlled browser capture | Root offers host, room-code join, sign-in, and Premium entry; page describes one-time upgrade and free limits | Marketing claims do not prove backend enforcement or platform compatibility |
| 2026-10-17 | `ev_668e6d4f3fc343acc8ef05564d7f124078f9024909dde3da635ee82bc1dde152` | REF-HOST-01 | `/host` | REA controlled browser capture | Host view displayed a four-character code, QR image, empty queue, Search/Scores/Up Next tabs, mic and fullscreen controls | One fresh browser session; host authorization and server state not established |
| 2026-10-17 | `ev_36f2434838723acbff2b22838de45ed8b069af10e77c829b17a48487e308059b` | REF-QUEUE-01 | `/host` | REA declared search and add scenario | Search tab showed trending results; adding the first result produced a queue update notice and a current singer/player surface | Does not establish successful playback, queue concurrency, or guest synchronization |
| 2026-10-17 | `ev_4a52495bc5e3d4f39c78cfe498294ca409cb6d21485ecd7b38e423e3a880d416` | REF-JOIN-02 | `/` | REA declared invalid-code scenario | Entering synthetic code ZZZZ and clicking Join Room opened a sign-in modal titled “Sign In to Premium” | Reason for gate unclear; cannot infer valid-code or anonymous-join behavior |
| 2026-10-17 | `ev_41227f8a3aeb6de0159e438b1658ca1c7f3ca5409b3fb609a59c661a8375088e` | REF-PAY-01/02 | `/premium` | REA controlled browser capture | Visible one-time GCash offer requests sign-in and payment screenshot upload | No payment, account, approval, entitlement, or refund behavior observed |
| 2026-10-17 | Browser UI observation | REF-MAIN-02/RECOVER-02/PAY-03 | `/`, `/host`, `/premium` | In-app browser actions | Root Start Session reached `/host`; host refresh retained displayed code; browser back from premium returned to root | Supplemental UI observation, not retained REA Evidence; no backend claim |
| 2026-10-18 | `ev_b9cc1bd9fef9b00baf678731467a1554dd472993eacbedd3fdd97978efdcf17c` | REF-JOIN-01 preparation | `/host` | REA controlled fresh browser capture | Host displayed a four-character code and QR in a fresh temporary browser profile | Capture did not establish QR destination or whether room persisted after browser cleanup |
| 2026-10-18 | `ev_0b6bf2a9bede95d91ecdd7be4af6a5be5564beaf38b1bcd0ad1d51db458c96b5` | REF-JOIN-01 attempted | `/` | REA declared fill/click scenario in a separate fresh browser | Submitting the previously displayed synthetic host code opened a “Sign In to Premium” modal; no guest room appeared | Code validity across temporary browser profiles was not established; no credentials entered; anonymous join and identity recovery remain unknown |
| 2026-10-18 | `ev_22a5b34124c0482c7a28ea2bdc1d5bf402311fbb568aeb4efb4ed3b3fc89c3b4` | REF-PLAY-01 partial | `/host` | REA bounded search/add scenario | Adding a visible result moved it to a current singer surface with a YouTube iframe and host skip control | The capture does not prove video actually played, ended, or advanced; no TV authority or player-error state established |
| 2026-10-20 | `ev_703e372df7ab63718e48be292ad8a2ec62a40361384d17b61c5c4d86555a72f6` | REF-PARTY-01 | `/host` | REA passive controlled browser capture | Fresh host surface exposed Sing/mic, fullscreen, Up Next, Scores, Search, an empty queue, room code, and QR | One fresh state only; rotation, duets, reactions, favorites, permissions, and themes were not visible, which does not prove they are absent elsewhere |
| 2026-10-20 | `ev_1292c50f51cf37a99325de94f41563a1bb556748bdea637fa94890f87dbf7b1b` | REF-AUTH-01 preparation | `/` | REA controlled browser capture | The ordinary Sign In action opened a “Sign In to Premium” modal with email/password, Google, sign-up, and recovery choices | Modal inventory only; no authentication result in this evidence item |
| 2026-10-20 | `ev_7f78df765996a30b503b2532effb8c4892af06f448edba08299427dab0380745` | REF-AUTH-01 | `/` | REA declared credential submission in a temporary browser | The user-supplied test account authenticated and the root displayed its account label plus Sign Out | No account settings, entitlement, payment, or recovery behavior inspected; credential values were not retained in project files |
| 2026-10-20 | `ev_ae6003a9a29fc61a535d45215f6709f73a88ed271a2322f75f8459e8ede2d82d` | REF-PARTY-02 preparation | `/host` | REA authenticated navigation | Start Session opened an authenticated host room with code/QR, Sing, fullscreen, Up Next, Scores, and Search | Initial authenticated host state only |
| 2026-10-20 | `ev_27e9451264bf8b7c1fab7fa8f75563cff0c73e8e929dd8f057cc26dea3bbc149` | REF-PARTY-02 | `/host` | REA authenticated tab inspection | Scores displayed an empty-state message; Search displayed a query control and a “Hot Right Now” result list | Final thumbnail wait matched multiple elements and ended the bounded run; tab observations before that point completed |
| 2026-10-20 | Built-in browser text read (not REA) | REF-MAIN-01 refresh | `/`, `/host` | Passive page-text read, signed out | Root marketing copy says phones act as remote controls, guests queue from phones, and a scoring/leaderboard and Premium tier exist; signed-out `/host` showed Up Next, Scores, and Search tabs | Marketing copy only; no guest remote control, permission setting, or score flow was exercised; no credentials entered |
| 2026-10-20 | `ev_5a9ff9d3688b48ce4754df220b36ef6c6b682178c3e0214bc9ce93ee643b55fa` | REF-PARTY-03 | `/host` | REA authenticated search/add scenario | Adding a visible result produced a queue-update confirmation, embedded player/current singer, skip control, and guidance that phone users can cheer the singer to boost score | No guest reaction UI or delivered reaction was observed; the score effect is a reference claim, not verified behavior |
| 2026-10-20 | `ev_cc0a310265480a9555f32ebd441b8ee97f5084c533c3eb5580470d1e31e0553b` | REF-SCORE-01 | `/host` | REA authenticated add/skip/Scores scenario | Adding the first visible song showed Host as current singer; after Skip, Scores showed its no-scores empty state and no host score-entry control | One song and one host-side path only; this does not establish natural completion, guest scoring, cheer weighting, or hidden score rules |
| 2026-10-20 | `ev_8a9555e1b28c07f2b98efb223880646c25013b9f3abb29520fc9012e97e64853` | REF-SCORE-02 | `/`, `/guest/<room-code>?name=<account-label>` | REA authenticated mobile viewport and declared join attempt | Signed-in root text says the singer records a score after a performance, guests can cheer, and a live leaderboard is visible to everyone | The temporary host browser had already ended the room, so the guest route returned Room not found; no guest score form or submitted score was observed |
| 2026-10-20 | `ev_dbf6c6596f0a5d3f234dfefbe1aed9bc097c22ec7f5f288916e3392055ba19bc` plus passive in-app browser reads | REF-MAIN-01/REF-HOST-01 refresh | `/`, `/host`, `/premium` | Fresh REA root capture and passive route inspection | The current public entry keeps Host and Join as adjacent primary cards; the fresh host surface is stage-first with a persistent code/QR and compact Up Next, Scores, and Search tabs | Visual structure only. This evidence does not authorize copying the reference background image, colors, branding, text, prices, payment UI, or exact composition; no payment or room mutation was performed |
| 2026-10-21 | Browser UI observation after REA CDP connection failed | REF-HOST-01 focused TV-layout refresh | `/host` | Passive authenticated visual inspection; no account or room mutation | The current host display uses a wide rounded stage beside a fixed utility rail. The rail has Up Next, Scores, and Search tabs, keeps a room-code/QR join card pinned below every tab, and the top bar exposes mic and fullscreen actions. Search shows a query field and thumbnail result list; empty Up Next and Scores states are centered in the rail | Supplemental observation, not retained REA Evidence. The inspected room was empty, so populated queue and active playback composition were not re-observed. Reference branding, background media, colors, text, and exact dimensions remain out of scope |
| 2026-10-21 | Owner-supplied TV screenshot | REF-HOST-01 focused TV-layout follow-up | Reference host display | Static screenshot supplied in the project conversation | The visible display keeps a scan/code instruction above the stage and a room QR/code card pinned below the right-side utility area during an active song | Static pixels do not prove animation timing, start-notification behavior, QR destination, authorization, synchronization, or behavior after the song changes; reference branding and exact composition remain out of scope |

## Finding ledger

Findings must cite evidence rows. Confidence describes only the stated finding,
not the completeness of the application analysis.

| Finding ID | Classification | Finding | Evidence | Confidence | MyKaraoke consequence |
|---|---|---|---|---|---|
| F-01 | Observation | Main site separates Host and Join entry and exposes a Premium route | Root REA evidence | High for visible UI | MyKaraoke will offer clear, separate host/join entry points |
| F-02 | Observation | A fresh host view displays a room code, QR, and empty queue immediately | Host REA evidence | High for visible UI | Design an informative host empty state; secure creation belongs to Phase 3 |
| F-03 | Observation | Host can open Search and add a visible result, which moves to current performance | Search/add REA evidence | High for this single run | Queue and playback will be separate tested phases |
| F-04 | Observation | Premium is a dedicated `/premium` route with visible account and manual payment instructions | Premium REA evidence | High for visible UI | Keep a distinct future upgrade flow; choose independent billing design |
| F-05 | Unknown | Guest join behavior and reason for premium sign-in gate are unresolved | Invalid-code and separate-browser join-attempt REA evidence | Low for any general rule | Do not reproduce this gate; implement MyKaraoke's no-account requirement independently |
| F-06 | MyKaraoke decision | Free starts with 10 qualifying song credits; each explicitly accepted and verified Google rewarded ad grants 10 more; Premium removes MyKaraoke ads and provides unlimited MyKaraoke credits, without promising ad-free YouTube playback | Product brief, owner decision, and platform boundary | Product decision | Monetization is deferred until native N4 after the complete web MVP and requires provider-policy review, trusted reward verification, and independent tests |
| F-07 | MyKaraoke decision | A host room is persisted for 24 hours and controlled by a private browser credential, never by its public code | F-02 and the bounded host-refresh UI observation establish only visible code/QR/recovery, not backend security | Product decision | Phase 3 implements independently tested persistence, invite destination, and host authorization |
| F-08 | Observation | Host add can show a current singer, embedded YouTube frame, and skip control | Phase 6 REA search/add capture | High for visible controls; low for actual playback | MyKaraoke implements and tests designated-device playback independently |
| F-09 | MyKaraoke decision | Browser-local song favorites are an independent Phase 9 feature; stored metadata is refreshed through the existing YouTube search boundary before queueing | REF-PARTY-01 did not expose a favorite interaction on the inspected state | Product decision | Do not copy an unobserved reference interaction; persist only versioned, bounded metadata and keep account sync out of this slice |
| F-10 | Observation | In an authenticated active-song state, the reference tells phone users to cheer the current singer and claims that cheering boosts score | REF-PARTY-03 | High for the visible guidance; no evidence for delivery mechanics or score calculation | MyKaraoke may offer independent reactions, but must not infer or reproduce an unverified scoring algorithm |
| F-11 | MyKaraoke decision | Reactions are four fixed values, authorized by the existing room session, server-rate-limited, ephemeral, and briefly animated on the paired TV with reduced-motion support | F-10 establishes only the concept of cheering an active singer | Product decision | Deliver reactions independently of scoring; store only short-window abuse budgets, never a reaction history |
| F-12 | MyKaraoke decision | Fair rotation is an optional server-authoritative round-robin over normalized singer names; it preserves per-singer request order and a host manual move turns it off | No inspected reference state established a rotation rule | Product decision | Make fairness behavior explicit and testable instead of inferring hidden reference scheduling |
| F-14 | MyKaraoke decision | Guest phones can act as a TV remote (start, pause, resume, skip) only when the host turns that permission on; add-songs, queue management, and reactions are separate host switches, each enforced at its server boundary | The 2026-10-20 root-page read establishes only a marketing claim that phones act as remotes; who may control playback in the reference is unknown | Product decision | Defaults preserve existing behavior (add songs and reactions on, remote and queue management off); guest remote commands share the per-guest mutation budget |
| F-15 | MyKaraoke decision | Scores are audience star ratings: each host or guest gives the live or just-finished song 1–5 stars (changeable, one per participant), ratings group by performer with duet pairs as one performer, and the leaderboard ranks by average then rating count; reactions never change scores | REF-SCORE-02 states that the reference singer records a score and F-10 states that cheering affects scores; REF-SCORE-01 did not expose either mechanism after host Skip | Product decision | The exact reference input and cheer-weighting rules remain unobserved, so MyKaraoke uses its own transparent audience-rating model behind a host "Rate performances" switch |
| F-16 | MyKaraoke decision | The guest phone uses a room bar, search-first entry, now-playing card, and tabs (Popular, Queue, Stage, Scores, My songs, Favorites) with a floating cheer button, in MyKaraoke's own visual language; popular songs require requests from at least two rooms | Owner-supplied 2026-10-21 phone screenshot of the reference guest view (structure only; no REA capture) | Product decision | The reference's daily free-song counter and remote TV-fullscreen control were not built: monetization is deferred to N4 and fullscreen cannot be triggered remotely by a browser |
| F-13 | MyKaraoke decision | A queue item may have one optional, distinct duet partner; the pair shares one fair-rotation turn and both names remain visible through playback | The retained Phase 9 host/search/current-singer evidence showed only one visible singer and did not establish a duet interaction | Product decision | Implement an accessible two-name assignment within MyKaraoke's existing protected queue boundary; do not claim the reference uses this model |
| F-16 | MyKaraoke decision | Stage Glow, Electric Blue, and Velvet Gold are fixed accessible design-token themes; personal selection is browser-local outside rooms, while the host's room choice synchronizes to authenticated guests and the paired TV | REF-PARTY-01 did not expose theme controls, so no reference theme behavior was established | Product decision | Keep theme behavior transparent, host-authorized, allowlisted, and independent of the reference application's visual identity |
| F-17 | Observation and MyKaraoke translation | The reference makes its two entry choices immediately actionable and keeps active-room controls in a compact tabbed rail beside the stage | Fresh 2026-10-20 root/host inspection and retained host evidence | High for visible hierarchy; no claim about hidden behavior | MyKaraoke uses the same user-centered hierarchy—direct Host/Join entry and one tabbed host console—while retaining its own supplied logos, gradient tokens, copy, assets, control names, and independently implemented workflows |
| F-18 | MyKaraoke decision | A joined phone gets a persistent Songs, Stage, Scores, and People dock; Songs stays first, and Stage contains reactions plus host-authorized remote controls | Reference evidence establishes phone queueing, score/cheer concepts, and a marketing claim that phones can act as remotes, but the complete guest-phone control screen was not observed | Product decision | Keep the dock touch-first and preserve every existing authorization boundary instead of claiming or copying an unobserved reference layout |
| F-19 | Observation and MyKaraoke translation | The reference host surface keeps the performance stage visually dominant and presents the public room code near compact secondary controls | Retained authenticated host-stage evidence from the bounded Phase 9 inspection | High for visible hierarchy; the reference's separate-TV authorization and complete waiting-screen behavior remain unresolved | MyKaraoke gives its already-secure paired display a stage-first layout with large-distance type, room code, join QR, fullscreen, now playing, next singer, scores, and reactions while keeping all host authority off the TV |
| F-20 | MyKaraoke decision | Each newly cued performance shows a five-second singer-ready transition, then enables the browser-required player action; TV arrow keys move through display actions, Enter selects, and Back exits fullscreen | The inspected reference states did not establish a countdown or TV-remote key model | Product decision | Keep timing local and presentational, preserve the server as playback authority, and verify exact remote behavior only on named physical TV browsers |
| F-21 | Owner-directed translation | The MyKaraoke TV should keep the reference-inspired stage-first hierarchy while also presenting the ordered queue and supporting room information | The retained reference capture establishes an Up Next area but not the complete populated-list layout; a fresh REA target was unavailable because the loopback CDP endpoint was not running | Product requirement with incomplete fresh reference evidence | Use MyKaraoke's own responsive queue rail, typography, colors, scores, security model, and API; do not claim exact visual parity or copy reference trade dress |
| F-22 | Observation and MyKaraoke translation | The current reference display keeps its stage and utility rail visible together, switches Up Next, Scores, and Search within that rail, and pins the join QR/card under all three panels | 2026-10-21 passive authenticated browser observation plus retained REF-HOST evidence | High for the empty-room desktop composition; active/populated states remain only partially retained | MyKaraoke mirrors the information architecture with its own assets and styling. Its paired TV can perform read-only song discovery, while queue addition stays on the phone so the display credential does not silently become host authority |
| F-23 | MyKaraoke decision | The empty TV stage may use original brand-owned ambient media, but never the reference application's background asset | The reference's background media was visible during passive inspection but was not copied, downloaded, or treated as implementation material | Product decision | Use the separately generated silent Higgsfield Filipino-family videoke loop, preserve legible overlays and a gradient fallback, and stop the loop for reduced-motion users |
| F-24 | Observation and MyKaraoke decision | The reference screenshot keeps a stage-top join instruction and a persistent rail QR visible during an active song; the owner additionally requires a start notice | Owner-supplied 2026-10-21 screenshot plus owner direction | High for the visible static hierarchy; start-notification behavior is a product requirement, not an observed reference fact | MyKaraoke keeps its existing secure join QR pinned below every rail tab, adds original join copy in an accessible reduced-motion-aware header ticker, and replaces it briefly with the newly current title/singer without copying reference branding or claiming which authorized controller initiated the transition |
| F-25 | Observation, unknown, and MyKaraoke decision | Owner-supplied screenshots show a dark full-height landing hero with two immediate entry actions and an active stage beside a persistent information rail. A fresh REA browser capture failed before navigation, so the claim that a signed-in reference account restores and starts a saved queue remains unverified. | Owner-supplied 2026-10-21 screenshots; retained REF-MAIN/REF-HOST evidence; failed fresh REA browser-provider attempt | High for the visible static hierarchy; none for account-queue persistence or automatic playback | MyKaraoke adopts only the broad stage-first and immediate-action hierarchy using its own brand, media, copy, spacing, and controls. Pairing a TV now atomically cues a queue already present in the active room and attempts policy-compliant playback with a manual fallback. Cross-device account queue restoration remains separate work because MyKaraoke has no account identity layer yet. |

Phase 3 reused the existing host-code, QR, and refresh evidence. No new REA
capture was needed or claimed. The reference still does not establish its QR
destination, backend session model, or room expiration policy; MyKaraoke chose
those independently and tests its own behavior.

Phase 4 made one bounded fresh-host and separate-browser join attempt with REA.
The observed modal is not evidence that valid reference rooms require payment
or an account: the code's server validity after the host browser closed is
unknown. MyKaraoke's anonymous guest sessions and presence rules are product
decisions verified against its own implementation, not reference claims.

Phase 5 reused the bounded host Search/add capture `ev_36f243...`. It supports
only the visible search-result-to-queue transition. No new reference capture
was needed or claimed. Singer assignment, queue ordering and authorization,
Realtime synchronization, quota behavior, and guest search remain MyKaraoke
decisions verified in MyKaraoke tests, not observations of the reference.

Phase 6 made a bounded `/host` REA search/add capture. The visible iframe and
skip control informed the flow, but did not establish player success, an end
event, or device authority. MyKaraoke independently chose an expiring TV
pairing code and separate device session; its own tests provide those claims.

The reference application's Premium marketing does not establish control over
ads served inside an embedded YouTube player. MyKaraoke therefore defines
"no ads" as no MyKaraoke-owned display or rewarded ads. YouTube advertising,
availability, and playback policy remain controlled by YouTube and are outside
the Premium entitlement promise.

Phase 9 began with a passive fresh-host control inventory. It supports only the
listed visible controls and does not establish whether other party features
exist in later room states. MyKaraoke therefore treats local favorites as an
independent product decision and verifies its behavior against MyKaraoke's own
storage and search boundaries.

A later authenticated Phase 9 pass observed the reference's active-singer
cheer guidance. It did not establish the guest control, payload, throttling,
animation, delivery guarantees, or scoring mechanics. MyKaraoke therefore
implements a distinct fixed reaction set over its existing private room topic,
keeps the event ephemeral, and deliberately leaves scoring unchanged.

A bounded score pass then added one song, skipped it, and reopened Scores. The
reference returned to its empty-score state and exposed no host score-entry
control. A separate signed-in mobile read stated that the singer records a
score after a performance and that the room has a live leaderboard, but the
temporary room had already ended before its guest route was opened. These are
observations of visible behavior and product copy, not evidence of the score
input, validation, storage, or cheer-weighting algorithm. MyKaraoke therefore
keeps its independently specified audience-star model and tests that model
against its own boundaries.

The inspected reference states did not establish singer-rotation behavior.
MyKaraoke's optional stable-round algorithm and explicit manual-host override
are therefore independent product decisions verified against MyKaraoke rules,
not a claim about the reference application.

The same retained reference states did not expose a duet assignment control.
That bounded absence is not evidence that the reference lacks duets elsewhere.
MyKaraoke's two-singer queue record, validation, display, and fair-rotation
semantics are an independent product decision.

## Design translation checklist

Before a reference finding affects implementation, confirm that it:

- Solves a real user need in MyKaraoke.
- Does not copy protected code, copywriting, imagery, branding, or distinctive
  visual composition.
- Fits MyKaraoke's mobile, desktop-host, and TV surface responsibilities.
- Preserves stronger security and authorization boundaries.
- Meets accessibility requirements.
- Respects YouTube and browser platform policies.
- Has an acceptance test independent of the reference application.

## Research acceptance gate

Reference reconnaissance for the first implementation milestone is complete
only when:

- The main, host, join, queue, playback, refresh, and paywall questions have
  evidence or are explicitly marked unresolved.
- Evidence IDs and search/runtime boundaries are recorded.
- Observations, inferences, decisions, and unknowns are distinct.
- The MyKaraoke behavior derived from each accepted finding is stated in
  product terms.
- No credentials, personal information, proprietary assets, or copied code were
  retained.

### Remaining Phase 1 questions

The bounded pass did not establish valid guest joining, room-code authorization,
QR destination, queue synchronization, true player success/end behavior, or
checkout/entitlement lifecycle. Revisit each in its functional implementation
phase. The Phase 2 shell depends only on the observed entry routes and empty
states.
