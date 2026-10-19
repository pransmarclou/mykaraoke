# MyKaraoke contributor guide

Read [Docs/agents.md](Docs/agents.md) before changing the project. The product
context, current state, reference evidence, and functional phase gates live in
`Docs/project.md`, `Docs/memory.md`, `Docs/reference-app.md`, and
`Docs/build-phases.md`.

Current scope: Phase 8 Local Microphone Studio is implemented in the host room
with mocked browser verification. Real Mac/Windows, built-in, USB, Bluetooth,
latency, and feedback checks remain required before acceptance. Phase 7's
deployment/device verification also remains open. Keep controls honest and
update `Docs/memory.md` at each gate.
Hosted Supabase is the MVP source of truth. Do not start or depend on the local
Supabase stack for normal work, and never run database-mutating test suites
against live MVP data; use a separately allowlisted hosted test project.
Finish the cross-browser web MVP before the later iOS/Android app and native
subscription track; see `Docs/build-phases.md` for the revised gates.
Do not start Phase 9 until the remaining Phase 7 and Phase 8 gates are reviewed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
