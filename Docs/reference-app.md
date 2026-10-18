# Reference Application Research Ledger

## Purpose and boundary

Primary reference target: `https://okevideoke.online/`

Dedicated reference surfaces:

| Surface | Known target | Research purpose |
|---|---|---|
| Main product | `https://okevideoke.online/` | Landing, value proposition, primary entry points, join path, navigation, and upgrade discovery |
| Host | `https://okevideoke.online/host` | Room creation, host controls, QR/share flow, queue, playback, and recovery |
| Paywall | Route/trigger not yet observed | Upgrade entry points, gated capabilities, plans, dismissal, return path, entitlement feedback, and purchase lifecycle |

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
- Runtime scenarios captured: Main entry, host initial state, host search and
  add, premium page, invalid join attempt
- Static assets or application bundles inspected: None
- Credentials used: None
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
| REF-PLAY-01 | Start and end playback | One queued item | Use ordinary playback controls | Authority, transitions, next-item behavior, errors | Not run |
| REF-RECOVER-01 | Refresh guest | Joined synthetic guest | Refresh once | Identity and room-state recovery behavior | Not run |
| REF-RECOVER-02 | Refresh host | Active synthetic room | Refresh once | Host/session and playback recovery behavior | Partial: same room code reappeared after browser refresh; backend session behavior unknown |
| REF-PAY-01 | Discover the paywall | Fresh ordinary session | Follow one visible upgrade action or attempt one clearly labelled premium capability | Trigger, actual route/presentation, dismiss behavior | Observed root navigation to `/premium`; premium action during a party unresolved |
| REF-PAY-02 | Compare visible plan states | Open paywall without checkout | Inspect plans and capability labels; do not enter payment data | Free/paid boundaries, account requirement, disclosures, unresolved checkout facts | Observed visible offer and payment instructions; no purchase |
| REF-PAY-03 | Return to the party | Open paywall | Use the ordinary close/back action once | Return destination and preservation of prior state | Browser back returned to root; in-party return unresolved |

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
| F-06 | MyKaraoke decision | Essential karaoke and accessibility remain free; no ad-free YouTube promise | Product brief and platform boundary | Product decision | Paywall implementation deferred to Phase 10 |
| F-07 | MyKaraoke decision | A host room is persisted for 24 hours and controlled by a private browser credential, never by its public code | F-02 and the bounded host-refresh UI observation establish only visible code/QR/recovery, not backend security | Product decision | Phase 3 implements independently tested persistence, invite destination, and host authorization |

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
