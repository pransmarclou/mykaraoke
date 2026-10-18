# MyKaraoke contributor guide

Read [Docs/agents.md](Docs/agents.md) before changing the project. The product
context, current state, reference evidence, and functional phase gates live in
`Docs/project.md`, `Docs/memory.md`, `Docs/reference-app.md`, and
`Docs/build-phases.md`.

Current scope: Phase 5 YouTube discovery and shared queue is implemented
locally and ready for owner review after a live search smoke test. Playback,
microphones, and payments are not implemented. Keep controls honest and update
`Docs/memory.md` at each gate.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
