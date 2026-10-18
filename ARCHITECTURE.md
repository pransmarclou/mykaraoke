# Architecture

The current vertical slice is Next.js App Router + a private server-side
PostgreSQL connection to the local Supabase database. `src/app/host/page.tsx`
renders from the HttpOnly host cookie. `POST /api/rooms` creates a room and
session in one transaction; `POST /api/rooms/[code]/close` verifies the same
credential and revokes it. `POST /api/rooms/join` validates a name and code,
creates or recovers one scoped guest membership, and sets a separate HttpOnly
guest cookie. The protected presence and leave routes verify host or guest
credentials on every request. `src/lib/rooms/` holds these domain rules.

Phase 5 adds `src/lib/songs/`: a server-only official YouTube Data API boundary,
query/result cache and quota counters, and a transactional queue repository.
Host and guest song UI call checked search and queue routes. The browser never
receives a YouTube key or direct queue-table access. Queue mutations lock the
room row, validate role and version, and broadcast only a version invalidation
to a private random Supabase Realtime topic. Clients refetch the authenticated
snapshot; polling reconciles missed events.

Migrations live in `supabase/migrations/`. The `rooms`, `room_settings`,
`room_sessions`, `room_creation_limits`, `room_members`, `room_presence`, and
`room_join_limits` tables have RLS enabled and no client-facing grants. Guest
membership is durable for the room lifetime; presence is a separate short-lived
heartbeat lease, rendered by server polling. Search cache/usage and queue tables
also deny direct browser DB roles. The local Supabase stack runs database and
Realtime capabilities; account Auth remains deferred.

See [Docs/project.md](Docs/project.md) for the product architecture and
[Docs/build-phases.md](Docs/build-phases.md) for later boundaries.
