# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Production build (Next.js standalone output)
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (run once)
pnpm test:watch       # Vitest in watch mode

pnpm db:push          # Sync Prisma schema to DB
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:seed          # Populate demo data (idempotent)
pnpm db:reset         # Wipe DB and reseed
```

Node >= 20 required. Use `pnpm` (not npm/yarn).

## Architecture

Single Next.js 14 (App Router) monolith hosting two features that share one Prisma/SQLite (dev) or Postgres (prod) database.

**Resume Tailor** (`/`, `/profiles`, `/applications`) — AI-powered resume tailoring via Claude tool use. Users maintain a profile split into **locked** sections (name, contact, education) and **editable** sections (summary, skills, bullets). Pasting a job description triggers Claude to rewrite only the editable sections; the result is presented as a word-level git-style diff for review before PDF export.

**FlowBoard** (`/workspace`) — Kanban board with drag-and-drop, WIP limits, optimistic locking, and an audit log.

### Key directories

- `src/app/api/v1/` — REST route handlers, versioned
- `src/lib/resume/` — Claude integration, resume schemas, diff computation, PDF renderer, Zustand store
- `src/lib/` — Shared: Prisma singleton (`db.ts`), API envelope/errors, auth, tickets (transactional logic), board snapshot, fractional-index rank helpers
- `src/components/resume/` — Resume Tailor UI components
- `src/components/board/` — FlowBoard UI (Board, Column, Card, Drawer, Modal)
- `prisma/schema.prisma` — Single schema for both features

### Claude integration (`src/lib/resume/claude.ts`)

Uses Anthropic SDK tool use to enforce structured JSON output. Validates that response IDs match input IDs (guards against hallucinated IDs). Model is configurable via `CLAUDE_MODEL` env var (default: `claude-sonnet-4-6`). The locked resume section is passed as read-only context; Claude may only modify editable sections.

### Ticket optimistic locking

Every `Ticket` has a `version` integer. Clients send `If-Match: <version>` on transition requests. The server rejects stale updates with `409 Conflict`. WIP limits are enforced server-side; admins can bypass with `?override_wip=true`.

### Board ordering

Card rank is a string field using fractional indexing (`fractional-indexing` package), enabling O(1) drag-and-drop reordering without re-ranking sibling rows.

### Intentional deviations from a microservice TechSpec

- Single Next.js app instead of separate NestJS services (schema is portable)
- SQLite locally instead of Postgres (swap `provider` in `schema.prisma`)
- Demo cookie-based session instead of NextAuth/JWT (seam is `src/lib/auth.ts`)
- TanStack Query polling (15s) instead of WebSockets
- Activity log (`ActivityEvent`) is in place but Kafka/Slack phases are not implemented

## Environment variables

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Required for Resume Tailor |
| `DATABASE_URL` | Defaults to `file:./dev.db`; set to a Postgres URL in prod |
| `JWT_SECRET` | Required in production |
| `CLAUDE_MODEL` | Defaults to `claude-sonnet-4-6` |

## Testing

Tests live alongside source as `*.spec.ts`. Key test files:
- `src/lib/tickets.spec.ts` — integration tests: creation, transitions, WIP limits, version conflicts, activity log
- `src/lib/fractional-index.spec.ts` — unit tests for rank helpers
- `src/lib/resume/diff.spec.ts` — diff computation

Tests use a hermetic SQLite DB created per run via `prisma db push`. No mocking of the database layer.

## API conventions

All API responses use the JSON envelope from `src/lib/api.ts`. Errors follow:
```json
{ "error": { "code": "SNAKE_CASE_CODE", "message": "...", "details": {} }, "request_id": "req_..." }
```
Request IDs are ULID-prefixed strings generated in `src/lib/ids.ts`.
