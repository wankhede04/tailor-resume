# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session start — branch policy

At the start of every new session, before doing any work:

1. Check the current branch with `git branch`.
2. If already on a feature branch (not `main`), continue on it.
3. If on `main`, create and switch to a new branch:
   - Infer the task type from the user's first message: `feat`, `fix`, `chore`, or `refactor`.
   - Summarise the task in **≤ 4 words**, lowercase, hyphen-separated.
   - Format: `<type>/<short-task-name>` — e.g. `feat/cover-letter-tabs`, `fix/profile-editor-skills`, `chore/update-deps`.
   - Run: `git checkout -b <branch-name>`
4. Do all work on that branch. Commit regularly. Do **not** push or open a PR unless the user asks.

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

Single Next.js 14 (App Router) app with Prisma/SQLite (dev) or Postgres (prod).

**Resume Tailor** (`/`, `/profiles`, `/applications`) — AI-powered resume tailoring via Claude tool use. Users maintain a profile split into **locked** sections (name, contact, education) and **editable** sections (summary, skills, bullets). Pasting a job description triggers Claude to rewrite only the editable sections; the result is presented as a word-level git-style diff for review before PDF export.

### Key directories

- `src/app/api/v1/` — REST route handlers, versioned
- `src/lib/resume/` — Claude integration, resume schemas, diff computation, PDF renderer
- `src/lib/` — Prisma singleton (`db.ts`), API envelope/errors, auth
- `src/components/resume/` — Resume Tailor UI components
- `prisma/schema.prisma` — Database schema

### Claude integration (`src/lib/resume/claude.ts`)

Uses Anthropic SDK tool use to enforce structured JSON output. Validates that response IDs match input IDs (guards against hallucinated IDs). Model is configurable via `CLAUDE_MODEL` env var (default: `claude-sonnet-4-6`). The locked resume section is passed as read-only context; Claude may only modify editable sections.

### Auth

Demo cookie-based session (`src/lib/auth.ts`). The `resume_user_id` cookie is set by the demo login endpoint. Full auth (NextAuth/JWT) is deferred.

## Environment variables

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Required for Resume Tailor |
| `DATABASE_URL` | Defaults to `file:./dev.db`; set to a Postgres URL in prod |
| `JWT_SECRET` | Required in production |
| `CLAUDE_MODEL` | Defaults to `claude-sonnet-4-6` |

## Testing

Tests live alongside source as `*.spec.ts`. Key test files:
- `src/lib/resume/diff.spec.ts` — diff computation

Tests use a hermetic SQLite DB created per run via `prisma db push`. No mocking of the database layer.

## API conventions

All API responses use the JSON envelope from `src/lib/api.ts`. Errors follow:
```json
{ "error": { "code": "SNAKE_CASE_CODE", "message": "...", "details": {} }, "request_id": "req_..." }
```
Request IDs are ULID-prefixed strings generated in `src/lib/ids.ts`.
