# FlowBoard — Technical Specification

> **Audience:** Claude Code (and other coding agents) building the FlowBoard application end-to-end.
> **Source PRD:** `FlowBoard_PRD.docx`
> **Status:** Build-ready spec, v1.0
> **Last updated:** May 2026

This document is the single source of truth for implementation. It is written in dense, prescriptive form. When in doubt, follow this doc; if this doc is silent or contradictory, ask before inventing.

-----

## 0. How to Use This Document

1. Read sections 1–3 first (overview, stack, repo layout) before generating any code.
1. For each feature, the section includes: data model → API contract → service logic → UI requirements → test cases.
1. Conventions section (§4) is non-negotiable — naming, error handling, logging, and testing standards apply to every file you produce.
1. When implementing, work in this order: **data layer → service layer → API → integration (Slack) → UI**. Don’t scaffold the UI before the API contract is wired and tested.
1. Every endpoint must ship with: input validation, integration test, OpenAPI entry, and audit log emission where applicable.

-----

## 1. Product Overview (Compressed)

FlowBoard is a Slack-native Kanban task tracker. Three things make it different from generic todo apps:

- **Bidirectional Slack integration** — tasks created from Slack messages (slash command, message action, @mention, emoji reaction), notifications and replies flow back through Slack.
- **Drag-and-drop Kanban** with customizable columns, WIP limits, swimlanes, and real-time multi-user updates.
- **Rich tickets** with title, Markdown description, multiple assignees, due dates, priority, labels, attachments, threaded comments, and immutable activity log.

Target users: engineering and cross-functional teams of 5–50 already living in Slack.

-----

## 2. Tech Stack (Authoritative)

|Layer               |Technology                                                 |Notes                                                    |
|--------------------|-----------------------------------------------------------|---------------------------------------------------------|
|Web client          |Next.js 14 (App Router), React 18, TypeScript 5            |Server components where possible                         |
|Styling             |Tailwind CSS + Radix UI primitives                         |shadcn/ui patterns                                       |
|Drag & drop         |`@dnd-kit/core` + `@dnd-kit/sortable`                      |NOT react-beautiful-dnd (deprecated)                     |
|State               |TanStack Query for server state, Zustand for local UI state|No Redux                                                 |
|API gateway         |NestJS 10, TypeScript                                      |REST + WebSocket gateway                                 |
|Core service        |NestJS 10                                                  |Owns tickets, projects, workflows                        |
|Notification service|Go 1.22                                                    |Kafka consumer, fan-out                                  |
|Slack connector     |Go 1.22, `slack-go/slack`                                  |Bolt-equivalent patterns                                 |
|Database            |PostgreSQL 16                                              |Primary store, multi-tenant via `workspace_id`           |
|Migrations          |`node-pg-migrate` (Node services), `goose` (Go services)   |SQL-first migrations                                     |
|ORM                 |Prisma (TypeScript services)                               |No raw SQL except for performance-critical board query   |
|Cache / pub-sub     |Redis 7 (cluster mode)                                     |Sessions, rate limits, WebSocket fan-out                 |
|Object storage      |S3-compatible (AWS S3 prod, MinIO dev)                     |Pre-signed URLs only                                     |
|Event bus           |Apache Kafka 3.x                                           |Topics partitioned by ticket_id                          |
|Search (v1)         |Postgres `tsvector` + GIN                                  |Elasticsearch deferred to v2                             |
|Auth                |NextAuth.js + Slack OAuth + email magic link               |JWT sessions, 7d expiry, refresh on activity             |
|Observability       |OpenTelemetry → Grafana Tempo, Loki, Prometheus            |Structured JSON logs only                                |
|CI/CD               |GitHub Actions → ECR → Kubernetes (EKS)                    |Helm charts in `/deploy/helm`. Full pipeline spec in §23.|
|IaC                 |Terraform                                                  |`/infra` directory                                       |

**Hard rules:**

- TypeScript `strict: true`, no `any` without `// @reason: ...` comment.
- Go modules use `golangci-lint` with the project config; no naked returns; errors wrapped with `fmt.Errorf("...: %w", err)`.
- No `console.log` in production code paths — use the logger.

-----

## 3. Monorepo Layout

```
flowboard/
├── apps/
│   ├── web/                      # Next.js client
│   ├── api-gateway/              # NestJS, public REST + WS
│   ├── core-service/             # NestJS, business logic
│   ├── notification-service/     # Go
│   └── slack-connector/          # Go
├── packages/
│   ├── shared-types/             # TS types generated from OpenAPI
│   ├── eslint-config/
│   ├── tsconfig/
│   └── ui/                       # Shared React components
├── proto/                        # OpenAPI specs + Kafka event schemas (Avro)
├── deploy/
│   ├── helm/
│   └── docker-compose.dev.yml
├── infra/                        # Terraform
├── scripts/                      # Repo-wide tooling
├── .github/workflows/
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

**Tooling:** pnpm workspaces + Turborepo for the TS side, Go workspaces (`go.work`) for the Go services.

-----

## 4. Conventions (Non-Negotiable)

### 4.1 Naming

- IDs: `{prefix}_{ulid}`, e.g. `tkt_01HXYZ...`, `prj_01...`, `wsp_01...`. Public ticket numbers (`FB-1234`) are *display-only* and per-project.
- Database tables: `snake_case`, plural (`tickets`, `project_members`).
- TypeScript: `PascalCase` for types/classes, `camelCase` for variables/functions, `SCREAMING_SNAKE` for constants.
- API paths: `/v1/{resource}` lowercase, plural. Sub-resources nest one level max.
- Kafka topics: `{domain}.{entity}.{event}` e.g. `tickets.ticket.status_changed`.

### 4.2 Errors

- Every API error returns:
  
  ```json
  { "error": { "code": "TICKET_NOT_FOUND", "message": "...", "details": {} }, "request_id": "..." }
  ```
- Error codes are `SCREAMING_SNAKE_CASE`, defined once in `packages/shared-types/errors.ts`.
- HTTP status mapping: 400 validation, 401 auth, 403 permission, 404 not found, 409 conflict (WIP limit, version conflict), 422 business rule, 429 rate limit, 5xx unexpected.
- Never leak internal stack traces to clients in production; always log them server-side with the `request_id`.

### 4.3 Logging

- JSON only. Required fields: `timestamp`, `level`, `service`, `request_id`, `workspace_id` (when known), `user_id` (when known), `message`.
- Log levels: `debug`, `info`, `warn`, `error`. No `fatal` in services — let the orchestrator restart.
- PII rules: never log full email, full names of users in non-error paths. Log `user_id` instead.

### 4.4 Tests

- Every service: unit tests (jest/Go testing), integration tests against ephemeral Postgres + Redis (testcontainers), e2e for critical flows.
- Coverage gates: 80% lines on core-service and slack-connector; 70% elsewhere.
- Test file naming: `*.spec.ts` (unit), `*.e2e.spec.ts` (e2e), `*_test.go` (Go).
- Use factories, never raw fixtures: `packages/test-factories/`.

### 4.5 Auth on Every Endpoint

- Every API handler must declare its auth requirement via decorator (`@Public()`, `@Authenticated()`, `@RequireRole('admin')`, `@RequireProjectAccess('member')`). Default behavior with no decorator is deny.
- Slack inbound webhooks verify the `X-Slack-Signature` header before any other processing. See §9.5.

-----

## 5. Domain Model

### 5.1 Entity Relationships

```
Workspace 1───* Project 1───* Ticket 1───* Comment
    │             │             │
    │             └───* WorkflowColumn
    │             └───* SlackChannelLink
    │
    └───* User (via WorkspaceMember)
              │
              └───* ProjectMember
```

### 5.2 Postgres Schema (DDL)

> All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Where soft delete applies, `deleted_at TIMESTAMPTZ`.

```sql
-- Workspaces (tenants)
CREATE TABLE workspaces (
  id              TEXT PRIMARY KEY,                 -- wsp_<ulid>
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  slack_team_id   TEXT UNIQUE,                       -- Slack workspace mapping
  plan            TEXT NOT NULL DEFAULT 'free',      -- free|pro|business|enterprise
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (global, not tenant-scoped; can belong to multiple workspaces)
CREATE TABLE users (
  id              TEXT PRIMARY KEY,                 -- usr_<ulid>
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('admin','member','viewer','guest')),
  slack_user_id   TEXT,                              -- linked Slack user
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_wm_user ON workspace_members(user_id);
CREATE INDEX idx_wm_slack ON workspace_members(workspace_id, slack_user_id);

-- Projects
CREATE TABLE projects (
  id              TEXT PRIMARY KEY,                 -- prj_<ulid>
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,                     -- e.g. 'FB' for ticket prefix
  name            TEXT NOT NULL,
  description     TEXT,
  estimate_unit   TEXT NOT NULL DEFAULT 'points',    -- points|hours
  ticket_seq      INTEGER NOT NULL DEFAULT 0,        -- next ticket number
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);

-- Project members (separate from workspace; finer-grained)
CREATE TABLE project_members (
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('admin','member','viewer')),
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Workflow columns (per project; ordered)
CREATE TABLE workflow_columns (
  id              TEXT PRIMARY KEY,                 -- col_<ulid>
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL,                  -- order on the board
  category        TEXT NOT NULL CHECK (category IN ('todo','in_progress','done')),
  wip_limit       INTEGER,                           -- NULL = unlimited
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, position)
);

-- Tickets
CREATE TABLE tickets (
  id              TEXT PRIMARY KEY,                 -- tkt_<ulid>
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number          INTEGER NOT NULL,                  -- per-project sequence (display: FB-123)
  title           TEXT NOT NULL CHECK (length(title) <= 200),
  description     TEXT,                              -- Markdown
  status_column_id TEXT NOT NULL REFERENCES workflow_columns(id),
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('lowest','low','medium','high','urgent')),
  reporter_id     TEXT NOT NULL REFERENCES users(id),
  due_date        DATE,
  start_date      DATE,
  estimate        NUMERIC(6,2),
  epic_id         TEXT REFERENCES tickets(id),
  rank            TEXT NOT NULL,                     -- fractional index for board ordering
  search_vector   tsvector,
  archived_at     TIMESTAMPTZ,
  version         INTEGER NOT NULL DEFAULT 1,        -- optimistic locking
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, number)
);
CREATE INDEX idx_tickets_project_status ON tickets(project_id, status_column_id);
CREATE INDEX idx_tickets_workspace ON tickets(workspace_id);
CREATE INDEX idx_tickets_search ON tickets USING GIN(search_vector);
CREATE INDEX idx_tickets_due_date ON tickets(due_date) WHERE due_date IS NOT NULL AND archived_at IS NULL;

-- Many-to-many: assignees, labels, watchers
CREATE TABLE ticket_assignees (
  ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE ticket_watchers (
  ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE TABLE labels (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,                          -- hex
  UNIQUE (project_id, name)
);

CREATE TABLE ticket_labels (
  ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  label_id    TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, label_id)
);

-- Comments (threaded one level)
CREATE TABLE comments (
  id              TEXT PRIMARY KEY,                 -- cmt_<ulid>
  ticket_id       TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  parent_id       TEXT REFERENCES comments(id),
  author_id       TEXT NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,                     -- Markdown
  slack_message_ts TEXT,                             -- if mirrored from Slack
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_ticket ON comments(ticket_id, created_at);

-- Activity log (immutable)
CREATE TABLE activity_events (
  id              TEXT PRIMARY KEY,
  ticket_id       TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id        TEXT REFERENCES users(id),         -- NULL = system
  event_type      TEXT NOT NULL,                     -- status_changed, assignee_added, etc.
  payload         JSONB NOT NULL,                    -- { from, to, ... }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_ticket ON activity_events(ticket_id, created_at);

-- Attachments
CREATE TABLE attachments (
  id              TEXT PRIMARY KEY,
  ticket_id       TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  uploader_id     TEXT NOT NULL REFERENCES users(id),
  filename        TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL CHECK (size_bytes <= 26214400),  -- 25MB
  s3_key          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slack channel links (per project)
CREATE TABLE slack_channel_links (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slack_channel_id TEXT NOT NULL,
  notification_types TEXT[] NOT NULL,                -- ['digest','status_change','overdue']
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, slack_channel_id)
);

-- Notification preferences (per user)
CREATE TABLE notification_preferences (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  preferences     JSONB NOT NULL,                    -- see §10.2 schema
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  PRIMARY KEY (user_id, workspace_id)
);

-- Slack OAuth tokens (encrypted at rest via app-level KMS)
CREATE TABLE slack_workspace_tokens (
  workspace_id    TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  bot_token_enc   BYTEA NOT NULL,
  bot_user_id     TEXT NOT NULL,
  app_id          TEXT NOT NULL,
  scope           TEXT NOT NULL,
  installed_by    TEXT NOT NULL REFERENCES users(id),
  installed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency keys for inbound webhooks and writes
CREATE TABLE idempotency_keys (
  key             TEXT PRIMARY KEY,
  scope           TEXT NOT NULL,                     -- 'slack_event', 'api_request'
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

### 5.3 Search Vector Maintenance

Trigger updates `tickets.search_vector` on insert/update of `title` or `description`:

```sql
CREATE FUNCTION tickets_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description ON tickets
FOR EACH ROW EXECUTE FUNCTION tickets_search_vector_update();
```

### 5.4 Fractional Indexing for `rank`

Use the `fractional-indexing` library (`npm: fractional-indexing` for TS, port for Go). Generate a key between two existing keys without renumbering. Initial rank: `a0`. On rebalance threshold (key length > 50), run a background job to re-rank a column.

-----

## 6. API Contract

### 6.1 Conventions

- Base path: `/v1`.
- All requests authenticated unless explicitly noted (Slack webhooks, OAuth callbacks, healthcheck).
- Pagination: cursor-based. Query params `?limit=50&cursor=...`. Response: `{ data: [...], next_cursor: "..." | null }`.
- Idempotency: `Idempotency-Key` header on POST endpoints; required for ticket creation from Slack.
- Versioning: URL-versioned (`/v1`). Breaking changes require `/v2`.
- Standard headers in every response: `X-Request-Id`, `X-RateLimit-Remaining`.

### 6.2 Endpoints

#### Workspaces

- `GET /v1/workspaces/me` — current user’s workspaces
- `POST /v1/workspaces` — create workspace (after Slack install or email signup)
- `GET /v1/workspaces/{id}` — workspace detail
- `PATCH /v1/workspaces/{id}` — update settings (admin only)

#### Projects

- `GET /v1/workspaces/{wid}/projects` — list
- `POST /v1/workspaces/{wid}/projects` — create
- `GET /v1/projects/{id}` — detail
- `PATCH /v1/projects/{id}` — update (admin)
- `DELETE /v1/projects/{id}` — soft delete (admin)
- `GET /v1/projects/{id}/board` — full board snapshot (see §6.3 for response shape)
- `GET /v1/projects/{id}/members` — list members
- `POST /v1/projects/{id}/members` — add member

#### Workflow Columns

- `GET /v1/projects/{id}/columns` — list
- `POST /v1/projects/{id}/columns` — create
- `PATCH /v1/columns/{id}` — update name, wip_limit, position
- `DELETE /v1/columns/{id}` — delete (must be empty)
- `POST /v1/projects/{id}/columns/reorder` — bulk reorder; body: `{ "column_ids": ["col_a","col_b",...] }`

#### Tickets

- `POST /v1/projects/{id}/tickets` — create
- `GET /v1/projects/{id}/tickets` — list with filters: `?assignee=usr_x&priority=high&due_before=2026-06-01&label=bug&q=keyword`
- `GET /v1/tickets/{id}` — detail
- `PATCH /v1/tickets/{id}` — update; client must send `If-Match: <version>` header for optimistic locking
- `POST /v1/tickets/{id}/transitions` — move ticket; body `{ "target_column_id": "col_x", "rank": "a5" }` (rank optional; server computes if absent)
- `DELETE /v1/tickets/{id}` — archive
- `POST /v1/tickets/{id}/assignees` — body `{ "user_ids": [...] }` replaces full set
- `POST /v1/tickets/{id}/labels` — body `{ "label_ids": [...] }` replaces full set
- `POST /v1/tickets/{id}/watchers` — body `{ "user_ids": [...] }` replaces

#### Comments

- `GET /v1/tickets/{id}/comments`
- `POST /v1/tickets/{id}/comments` — body `{ "body": "...", "parent_id": null }`
- `PATCH /v1/comments/{id}` — author or admin only
- `DELETE /v1/comments/{id}`

#### Attachments

- `POST /v1/tickets/{id}/attachments/presign` — returns `{ upload_url, s3_key, attachment_id }`. Client PUTs to `upload_url` directly to S3.
- `POST /v1/tickets/{id}/attachments/{attachment_id}/finalize` — confirms upload; server verifies the object exists.
- `GET /v1/attachments/{id}/download` — returns pre-signed download URL valid for 5 minutes.

#### Search

- `GET /v1/search?q=...&workspace_id=...&type=ticket&limit=20`

#### Notifications

- `GET /v1/notifications/me` — in-app inbox
- `POST /v1/notifications/{id}/read`
- `POST /v1/notifications/read-all`
- `GET /v1/notification-preferences/me`
- `PATCH /v1/notification-preferences/me`

#### Slack (inbound, no auth header — verified by signature)

- `POST /v1/slack/events` — Events API
- `POST /v1/slack/commands` — slash commands
- `POST /v1/slack/interactivity` — block kit interactions, modals
- `GET /v1/slack/oauth/callback` — OAuth redirect

#### Health

- `GET /healthz` — liveness (no auth)
- `GET /readyz` — readiness; checks DB, Redis, Kafka

### 6.3 Board Snapshot Response

```json
{
  "project": { "id": "prj_x", "key": "FB", "name": "FlowBoard" },
  "columns": [
    {
      "id": "col_a", "name": "To Do", "position": 0, "wip_limit": null,
      "tickets": [
        {
          "id": "tkt_1", "number": 12, "title": "...", "priority": "high",
          "assignees": [{ "id": "usr_x", "name": "...", "avatar_url": "..." }],
          "labels": [{ "id": "lbl_x", "name": "bug", "color": "#ef4444" }],
          "due_date": "2026-05-15", "comment_count": 3, "rank": "a3"
        }
      ]
    }
  ]
}
```

This endpoint is the single hot path. Optimize: one query joins tickets + assignees + labels (LATERAL subqueries), one query for columns. Cache invalidated on any ticket write to that project.

### 6.4 Validation Rules (DTOs)

Every NestJS DTO uses `class-validator`. Examples:

```ts
// CreateTicketDto
@IsString() @MaxLength(200) title: string;
@IsOptional() @IsString() @MaxLength(50000) description?: string;
@IsString() statusColumnId: string;
@IsOptional() @IsEnum(Priority) priority?: Priority;
@IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) assigneeIds?: string[];
@IsOptional() @IsArray() @IsString({ each: true }) labelIds?: string[];
@IsOptional() @IsDateString() dueDate?: string;
@IsOptional() @IsNumber() @Min(0) @Max(999) estimate?: number;
```

-----

## 7. Service Logic — Core Behaviors

### 7.1 Ticket Creation Flow

1. Authenticate, resolve user → workspace → project membership.
1. Begin transaction.
1. Increment `projects.ticket_seq` with `RETURNING ticket_seq` → assigned to new ticket’s `number`.
1. Compute initial `rank`: append to bottom of target column (rank > current max in column).
1. Insert ticket; insert assignees, labels, watchers (always include reporter + assignees as watchers).
1. Insert `activity_events` row: `event_type='ticket_created'`.
1. Commit.
1. Emit Kafka event `tickets.ticket.created`.
1. Invalidate board cache key `board:{project_id}`.
1. Return ticket DTO.

### 7.2 Ticket Move (Transition)

1. Load ticket with `FOR UPDATE` lock; verify `version` if `If-Match` header sent.
1. Validate target column belongs to same project.
1. Check WIP limit on target column. If exceeded: return 409 with code `WIP_LIMIT_EXCEEDED`. Admins can bypass with `?override_wip=true`.
1. Compute new `rank` (use provided or generate between neighbors).
1. Update `status_column_id`, `rank`, `version = version + 1`, `updated_at`.
1. Insert `activity_events`: `status_changed` with `{ from: oldColId, to: newColId }`.
1. Commit, emit `tickets.ticket.status_changed`, invalidate cache, broadcast WS event.

### 7.3 Optimistic Locking

- Every ticket has `version`. PATCH and transitions require client to send `If-Match: <version>` header.
- Mismatch → 409 `VERSION_CONFLICT` with current state in response body. Client refetches and retries.

### 7.4 Permission Checks (centralized)

A `PermissionService` exposes:

```ts
canViewProject(userId, projectId): boolean
canEditTicket(userId, ticketId): boolean
canMoveTicket(userId, ticketId, targetColumnId): boolean
canDeleteProject(userId, projectId): boolean
canBypassWipLimit(userId, projectId): boolean
```

All resolved via single SQL query with joins on `workspace_members` and `project_members`. Cached in request scope.

### 7.5 Audit Log

Every state change writes to `activity_events`. Event types:

- `ticket_created`, `ticket_updated`, `ticket_archived`
- `status_changed`, `assignee_added`, `assignee_removed`
- `priority_changed`, `due_date_changed`, `label_added`, `label_removed`
- `comment_added`, `attachment_uploaded`

Payload schema in `proto/activity_events.json`.

-----

## 8. Real-Time Updates (WebSocket)

### 8.1 Connection

- Endpoint: `wss://api.flowboard.app/v1/realtime`
- Auth: JWT in connection query param `?token=...` (validated on upgrade).
- Heartbeat: client sends `ping` every 30s; server replies `pong`. Idle > 90s → disconnect.

### 8.2 Subscription Model

Client sends after connect:

```json
{ "type": "subscribe", "channel": "project:prj_x" }
```

Allowed channels:

- `project:{id}` — board updates for that project
- `ticket:{id}` — comments and updates on a single ticket
- `user:{id}` — personal notifications (only own user_id allowed)

### 8.3 Event Types Pushed to Clients

```json
{ "type": "ticket.updated", "ticket": { ... } }
{ "type": "ticket.moved", "ticket_id": "...", "from_column_id": "...", "to_column_id": "...", "new_rank": "..." }
{ "type": "ticket.created", "ticket": { ... } }
{ "type": "ticket.archived", "ticket_id": "..." }
{ "type": "comment.created", "comment": { ... } }
{ "type": "notification.new", "notification": { ... } }
```

### 8.4 Fan-Out

- Redis Pub/Sub channel per logical channel (`ws:project:prj_x`).
- API gateway subscribes once per channel and multiplexes to connected sockets.
- Notification service publishes events on relevant Redis channels after Kafka consumption.

-----

## 9. Slack Integration

### 9.1 OAuth Install Flow

1. User clicks “Add to Slack” → redirect to `https://slack.com/oauth/v2/authorize?...&scope=...&state=<csrf_token>`.
1. Required scopes: `commands`, `chat:write`, `im:write`, `users:read`, `users:read.email`, `channels:read`, `groups:read`, `reactions:read`, `app_mentions:read`.
1. Callback at `/v1/slack/oauth/callback` exchanges code → bot token.
1. Encrypt bot token with KMS (AES-256-GCM), store in `slack_workspace_tokens.bot_token_enc`.
1. Create or attach workspace by `slack_team_id`.
1. Redirect user to FlowBoard web app, authenticated.

### 9.2 Inbound Triggers (Task Creation)

#### Slash command `/flowboard create`

- Parse: `/flowboard create <title>` → opens modal pre-filled with title.
- Modal fields: project (dropdown), assignee (user select), priority (radio), due date.
- On submit: call core service `POST /v1/projects/{id}/tickets`.
- Reply ephemerally with link to ticket.

#### Message action “Create FlowBoard Task”

- Configured in Slack app manifest as `message` shortcut.
- Opens modal with description pre-filled from message text + permalink.

#### App mention `@FlowBoard <command>`

- Parser supports: `@FlowBoard create [title] in [#project]` or natural language.
- For v1: only the explicit `create` syntax. NL parsing deferred.

#### Emoji reaction trigger

- Workspace setting: configurable trigger emoji (default `:ticket:`).
- On `reaction_added` event with matching emoji, fetch the message, open modal in DM with reactor.
- Default project = first project the reactor is a member of (or config in workspace settings).

### 9.3 Outbound Notifications (DM and Channel)

DM card on assignment:

```
Block Kit:
  Header: "📌 Assigned to you: [FB-123] Title"
  Section: First 200 chars of description
  Context: "Due May 15  •  Priority: High  •  in Project FlowBoard"
  Actions: [Mark Done] [Snooze] [Reassign] [Open in FlowBoard]
```

All buttons fire to `/v1/slack/interactivity`. Handlers:

- **Mark Done** → POST transition to `done` column
- **Snooze** → opens modal with duration; sets a delayed re-notification job
- **Reassign** → opens user-select modal
- **Open in FlowBoard** → URL action to web app

Channel digest (daily, 9am workspace timezone):

- Header: project name + date
- Sections: “🔥 Overdue” / “📅 Due today” / “✅ Done yesterday” / “🚧 In progress”

### 9.4 Two-Way Sync

- When DM card is posted, store `slack_message_ts` on a new `notification_messages` table tied to `ticket_id`.
- Replies in that thread (Events API `message.channels` or `message.im` with `thread_ts`) are mirrored as comments via `slack_message_ts` field.
- Subsequent ticket updates (title, status) trigger `chat.update` to refresh the original card.

### 9.5 Signature Verification

Every Slack inbound request:

```ts
const timestamp = req.headers['x-slack-request-timestamp'];
if (Math.abs(Date.now()/1000 - timestamp) > 300) reject(); // replay attack
const sigBase = `v0:${timestamp}:${rawBody}`;
const expected = `v0=${hmacSHA256(sigBase, SLACK_SIGNING_SECRET)}`;
if (!timingSafeEqual(expected, req.headers['x-slack-signature'])) reject();
```

The `rawBody` must be captured before any JSON parsing.

### 9.6 3-Second Ack Rule

Slack requires acknowledgment within 3 seconds. Pattern:

1. Verify signature.
1. Push event to Kafka topic `slack.inbound.events`.
1. Return 200 immediately.
1. `slack-connector` Go service consumes and processes asynchronously.

For modals (slash commands and shortcuts), the initial response opens the modal (must be < 3s). Modal submissions are processed similarly via async pattern.

### 9.7 Idempotency

Slack event payload’s `event_id` is used as `idempotency_keys.key` with `scope='slack_event'`. TTL: 24 hours. Duplicate events → no-op return 200.

-----

## 10. Notification Service

### 10.1 Architecture

- Go service consuming Kafka topics: `tickets.*`, `comments.*`.
- For each event, apply routing rules, generate notifications, dispatch via:
  - In-app (insert into `notifications` table → push WS event)
  - Slack (call slack-connector via internal gRPC)
  - Email (enqueue to SES)

### 10.2 Preferences Schema (JSONB)

```json
{
  "events": {
    "assigned": { "in_app": true, "slack": true, "email": false },
    "mentioned": { "in_app": true, "slack": true, "email": false },
    "comment_on_watched": { "in_app": true, "slack": false, "email": false },
    "due_soon": { "in_app": true, "slack": true, "email": false },
    "overdue": { "in_app": true, "slack": true, "email": true },
    "status_changed_on_reported": { "in_app": true, "slack": false, "email": false }
  },
  "digest": { "daily": true, "weekly": false }
}
```

### 10.3 Quiet Hours

- Stored as `quiet_hours_start` / `quiet_hours_end` in user’s local timezone.
- Non-urgent Slack notifications (anything except `mentioned` or explicit DM) buffered until quiet hours end.
- Implementation: a Redis sorted set keyed by `notif:queued:{user_id}` with score = unix_ts to deliver.

### 10.4 Debouncing

- Per-user debounce window (default 60s configurable).
- Multiple events to the same user within window are coalesced into one Slack DM with grouped content.
- Implemented as: on event → SETNX Redis key `debounce:{user_id}` with TTL=60s; if set, append to list `debounce:{user_id}:items`; on TTL expiry (Redis keyspace notification), flush the list.

### 10.5 Due-Date Reminders

- Cron job every 15 minutes scans `tickets` for `due_date` within 24h, not done, not yet notified.
- Maintain `due_reminders_sent` table to avoid duplicates: `(ticket_id, kind: '24h'|'overdue', sent_at)`.

-----

## 11. Web Client

### 11.1 Routing (App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── slack-callback/page.tsx
├── (app)/
│   ├── layout.tsx                # auth guard, sidebar
│   ├── workspace/[wid]/
│   │   ├── page.tsx              # workspace home (project list)
│   │   ├── projects/[pid]/
│   │   │   ├── page.tsx          # board view
│   │   │   ├── tickets/[tid]/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── my-work/page.tsx      # cross-project assigned to me
│   │   └── settings/page.tsx
└── api/                          # Next.js API routes only for auth callbacks
```

### 11.2 Board Page Components

```
components/board/
├── Board.tsx                     # owns dnd-kit context
├── Column.tsx                    # droppable container
├── TicketCard.tsx                # draggable
├── ColumnHeader.tsx              # name, count, wip badge
├── BoardFilters.tsx              # filter chips
├── SwimlaneToggle.tsx
└── BoardSkeleton.tsx
```

### 11.3 Drag-and-Drop Implementation

- Use `@dnd-kit/core`’s `DndContext` with `SortableContext` per column.
- `closestCorners` collision detection.
- On `onDragEnd`:
1. Optimistic: update Zustand store.
1. Compute new rank using fractional indexing helper.
1. Call `POST /v1/tickets/{id}/transitions`.
1. On failure: rollback store, toast error.
- Multi-select: Shift+click adds to selection; drag any selected card moves the group (sequential API calls or batched endpoint — defer batching to v1.1).

### 11.4 Real-Time Sync

- Open WS on board mount. Subscribe to `project:{id}`.
- Incoming events → dispatch to Zustand reducer.
- Reconnect with exponential backoff (1s, 2s, 4s, capped at 30s).
- On reconnect, refetch board snapshot to reconcile.

### 11.5 Accessibility

- All drag operations have keyboard alternatives: focus a card, press Space to “pick up”, arrow keys to navigate, Space to drop.
- Color is never the sole indicator (priority and status use icons + text).
- Focus management on modal open/close.
- Test with axe-core in CI.

### 11.6 Markdown Rendering

- `react-markdown` with `remark-gfm`, sanitized via `rehype-sanitize`.
- Custom components: mentions render as pills, ticket references (`FB-123`) auto-link.

-----

## 12. Search

### 12.1 v1: Postgres tsvector

- Query: `SELECT * FROM tickets WHERE workspace_id = $1 AND search_vector @@ plainto_tsquery('english', $2) ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC LIMIT 20`.
- Combined with filters (assignee, label, etc.) as additional WHERE clauses.

### 12.2 Power Query Syntax

Parser in `core-service/src/search/query-parser.ts` handles:

- `assignee:@me` → `assignee_id = current_user`
- `assignee:usr_xyz` or `assignee:"Name"`
- `priority:high`, `priority:>=high` (ordinal comparison)
- `due:<7d`, `due:>2026-05-01`
- `label:bug`
- `is:open`, `is:done`, `is:overdue`
- Free-text terms = full-text match
- Implicit AND between clauses

Output: AST that compiles to parameterized SQL.

-----

## 13. Kafka Event Schemas

All schemas in `proto/events/*.json` (JSON Schema; Avro adapter optional).

### 13.1 Topic List

|Topic                          |Partition Key  |Retention|
|-------------------------------|---------------|---------|
|`tickets.ticket.created`       |`ticket_id`    |7 days   |
|`tickets.ticket.updated`       |`ticket_id`    |7 days   |
|`tickets.ticket.status_changed`|`ticket_id`    |7 days   |
|`tickets.ticket.archived`      |`ticket_id`    |7 days   |
|`comments.comment.created`     |`ticket_id`    |7 days   |
|`slack.inbound.events`         |`slack_team_id`|24 hours |
|`notifications.dispatch`       |`user_id`      |24 hours |

### 13.2 Example: ticket.status_changed

```json
{
  "event_id": "evt_01HXYZ",
  "occurred_at": "2026-05-01T10:00:00Z",
  "workspace_id": "wsp_x",
  "project_id": "prj_x",
  "ticket_id": "tkt_x",
  "actor_user_id": "usr_x",
  "from_column_id": "col_a",
  "from_column_category": "todo",
  "to_column_id": "col_b",
  "to_column_category": "in_progress"
}
```

### 13.3 Consumer Rules

- Every consumer is idempotent (use `event_id` to dedupe via Redis SETNX).
- DLQ topic suffixed with `.dlq` for poison messages after 5 retries.
- Consumer group naming: `{service}-{topic-purpose}`, e.g. `notification-service-status-changes`.

-----

## 14. Auth & Sessions

### 14.1 JWT Structure

```json
{
  "sub": "usr_x",
  "wsp": ["wsp_a", "wsp_b"],
  "iat": 1234567890,
  "exp": 1234567890,
  "jti": "session_x"
}
```

- Signed RS256, key rotation supported via `kid` header.
- Sessions stored in Redis `session:{jti}` for revocation; checked in middleware.

### 14.2 Login Methods

- **Slack OAuth** (primary): post-install, user is auto-logged in.
- **Email magic link**: POST `/v1/auth/magic-link` → email with token → GET `/v1/auth/magic-link/verify?token=...` → JWT.

### 14.3 CSRF

Web app uses SameSite=Lax cookies for the session JWT. Mutating endpoints additionally require `X-CSRF-Token` header echoing a token issued at login.

-----

## 15. Rate Limiting

- Per IP: 100 req/min on auth endpoints.
- Per user: 600 req/min general, 1200 req/min on board read.
- Per workspace on Slack outbound: token bucket sized by Slack’s tier 3 limits (20 req/min sustained, burst to 50).
- Implemented via Redis `INCR` with TTL; returns 429 with `Retry-After` header.

-----

## 16. Observability

### 16.1 Logging

- Pino (Node) and zerolog (Go) configured to emit JSON to stdout.
- Standard fields: `timestamp`, `level`, `service`, `request_id`, `workspace_id`, `user_id`, `route`, `latency_ms`, `status`.

### 16.2 Tracing

- OpenTelemetry SDK in every service.
- Spans cover: HTTP handler, DB query (one span per query > 50ms), Kafka produce/consume, external HTTP (Slack API).
- Trace context propagated through Kafka headers (`traceparent`, `tracestate`).

### 16.3 Metrics (Prometheus)

- RED per HTTP route: rate, errors, duration histogram.
- Custom: `flowboard_tickets_created_total`, `flowboard_slack_events_processed_total{result}`, `flowboard_notification_dispatched_total{channel}`, `flowboard_board_render_seconds`.

### 16.4 Alerts (sample)

- API 5xx rate > 1% over 5m → page
- Kafka consumer lag > 10k messages → page
- Slack signature verification failures > 10/min → warn (likely misconfig)
- Postgres connection saturation > 80% → warn

-----

## 17. Security Requirements

- TLS 1.2+ everywhere; HSTS on web origin.
- Secrets via AWS Secrets Manager / Vault, never in env files committed to repo.
- Slack tokens, JWT private keys: KMS-encrypted at rest, in-memory only at runtime.
- Pre-signed S3 URLs scoped to a single object, 5-minute expiry.
- Content security policy on web: default-src ‘self’, strict.
- Dependency scanning: `npm audit`, `govulncheck`, Dependabot, weekly.
- Penetration test before GA.
- No PII in logs (rule §4.3).
- Soft-delete only for user-facing entities; physical purge after 30-day retention.

-----

## 18. Testing Strategy

### 18.1 Pyramid

- **Unit (70%)**: pure functions, validators, parsers, permission service.
- **Integration (25%)**: API endpoints with real Postgres + Redis (testcontainers); Slack webhook signature verification; Kafka producer/consumer.
- **E2E (5%)**: Playwright covering: signup → install Slack → create project → create ticket from Slack → drag ticket → receive Slack notification.

### 18.2 Required Tests Per Feature

- Happy path
- Validation failure (missing fields, oversize inputs)
- Permission denied
- Concurrent modification (version conflict)
- Idempotency (duplicate request returns same result)
- Rate limit exceeded
- For Slack: signature failure, replay attack, malformed payload

### 18.3 Test Data

- Factories using `@faker-js/faker` (TS) and equivalent in Go.
- Each test runs in its own DB schema or transaction (rollback on cleanup).

-----

## 19. Local Dev

### 19.1 Setup

```bash
# Prerequisites: Node 20, Go 1.22, Docker, pnpm, golangci-lint
git clone ...
cd flowboard
pnpm install
go work sync

cp .env.example .env
docker-compose -f deploy/docker-compose.dev.yml up -d  # Postgres, Redis, Kafka, MinIO
pnpm db:migrate
pnpm db:seed                                            # creates demo workspace
pnpm dev                                                # runs all TS apps
go run ./apps/notification-service/cmd                  # in another terminal
go run ./apps/slack-connector/cmd                       # in another terminal
```

### 19.2 Slack Local Testing

- Use ngrok (or Cloudflare Tunnel) to expose `slack-connector` (port 4001).
- Slack app manifest at `proto/slack-app-manifest.yml` — install in a dev Slack workspace.
- Set `SLACK_SIGNING_SECRET` in `.env`.

### 19.3 Seed Data

`scripts/seed.ts` creates: 1 workspace, 1 project, 5 columns, 30 tickets across columns and assignees, 3 users, sample comments. Idempotent — safe to re-run.

-----

## 20. Phased Implementation Order (For Claude Code)

This is the strict order for building. Don’t move on to a phase until the previous one passes its acceptance tests.

### Phase 1: Foundations

1. Monorepo scaffolding (pnpm workspaces, turbo, go.work, ESLint, Prettier, golangci-lint).
1. Docker compose with Postgres, Redis, Kafka, MinIO.
1. Migrations skeleton + initial schema (§5.2).
1. Shared types package + OpenAPI base.
1. Health endpoints on every service.

### Phase 2: Core CRUD

1. Auth: email magic link only (defer Slack OAuth to Phase 5).
1. Workspaces, projects, project members.
1. Workflow columns CRUD.
1. Tickets: create, read, update, list with filters.
1. Comments CRUD.
1. Activity log emission.
1. Permissions service.
1. **Acceptance:** can manage a project end-to-end via API + Postman collection.

### Phase 3: Web Client (Static)

1. Auth pages, layout, sidebar.
1. Project list page.
1. Board page with static data (no DnD yet).
1. Ticket detail panel (sliding drawer).
1. **Acceptance:** can view a board and ticket detail pulled from API.

### Phase 4: Drag-and-Drop + Real-Time

1. Wire `@dnd-kit/core` to board.
1. Implement `POST /v1/tickets/{id}/transitions` with WIP-limit + optimistic locking.
1. Fractional indexing helper + tests.
1. WebSocket gateway with subscription model.
1. Redis pub/sub fan-out.
1. Optimistic UI + rollback on failure.
1. **Acceptance:** two browsers see the same drag in real time; WIP limits enforced.

### Phase 5: Slack Integration

1. OAuth install flow + token storage.
1. Signature verification middleware.
1. Slash command `/flowboard create` + modal.
1. Message action.
1. Reaction trigger.
1. Notification service: assignment DM with action buttons.
1. Two-way sync: Slack thread reply → comment.
1. **Acceptance:** full flow demoed in a real Slack workspace.

### Phase 6: Notifications & Polish

1. Notification preferences + quiet hours.
1. Debouncing / coalescing.
1. Due-date reminder cron.
1. Daily channel digests.
1. In-app notification center.
1. Email digests.
1. **Acceptance:** all event types in §10.2 fire correctly per preferences.

### Phase 7: Search, Filters, Saved Views

1. tsvector + trigger.
1. Query-parser AST.
1. Saved filters (per user) + Smart Views (project-shared).
1. **Acceptance:** queries from §12.2 return correct results within 200ms p95.

### Phase 8: Hardening for GA

1. Rate limiting.
1. Audit log retention policies.
1. SSO (SAML) for Business tier.
1. Observability: dashboards, alerts.
1. Penetration test fixes.
1. Load test: 10k tickets / project, 100 concurrent users on a board.
1. **Acceptance:** SLO targets in §17 met under load test.

-----

## 21. Out of Scope for v1

Listed explicitly so they’re not implemented by mistake:

- Native mobile apps (iOS/Android).
- Gantt charts, resource leveling.
- Time tracking with billable hours.
- Custom fields beyond what’s in §5.2.
- Workflow automation rules (post-GA, v1.1).
- Microsoft Teams / Discord integrations.
- Jira / Linear import.
- AI features (auto-categorization, suggested assignees).

-----

## 22. Open Decisions (Flag These to the Human)

These should be confirmed before implementation:

1. **Ticket ID scoping**: per-project (`FB-123`) — confirmed in this spec.
1. **Pricing model** — does not affect code in v1; ignore for now.
1. **Email provider**: AWS SES assumed; confirm or swap.
1. **Region**: us-east-1 for MVP; multi-region post-GA.
1. **Slack workspace mapping**: 1 Slack team = 1 FlowBoard workspace. Confirmed; multi-team workspaces deferred.

-----

## 23. Deployment & CI/CD (GitHub Actions)

Deployment is GitHub Actions end-to-end. No separate CI server. This section is build-ready: a coding agent should be able to produce the workflow files directly from what’s here.

### 23.1 Environments

|Environment |Branch                            |URL                  |Auto-Deploy|Approval           |
|------------|----------------------------------|---------------------|-----------|-------------------|
|`dev`       |every push to `main`              |dev.flowboard.app    |Yes        |None               |
|`staging`   |tag `staging-*` or manual dispatch|staging.flowboard.app|Yes        |None               |
|`production`|tag `v*.*.*` (semver)             |flowboard.app        |Yes        |1 reviewer required|

Each environment is a separate AWS account (or at minimum, separate VPC + EKS cluster). Secrets are scoped per GitHub Environment.

### 23.2 Repository Structure for CI/CD

```
.github/
├── workflows/
│   ├── ci.yml                    # PR validation: lint, test, typecheck, build
│   ├── cd-dev.yml                # auto-deploy main → dev
│   ├── cd-staging.yml            # tag-triggered → staging
│   ├── cd-production.yml         # tag-triggered → production (gated)
│   ├── db-migrate.yml            # manual dispatch, runs migrations against target env
│   ├── infra.yml                 # Terraform plan/apply on infra/ changes
│   ├── security-scan.yml         # weekly + on PR: trivy, govulncheck, npm audit
│   └── release.yml               # creates GitHub release + changelog from semver tag
├── actions/
│   ├── setup-node-pnpm/          # composite: pnpm + Node 20 + cache
│   ├── setup-go/                 # composite: Go 1.22 + module cache
│   ├── ecr-login/                # composite: configure AWS creds + ECR login
│   └── helm-deploy/              # composite: helm upgrade --install with checks
├── CODEOWNERS
└── dependabot.yml
```

### 23.3 Branching & Tagging Model

- Trunk-based. `main` is always deployable.
- Feature work on short-lived branches → PR → squash merge to `main`.
- Releases via annotated tags following semver: `v1.4.2`. Tag triggers production deploy.
- Hotfixes branch from the production tag, merge back to `main` and to `release/x.y` if a maintenance branch exists.
- Branch protection on `main`: require passing CI, 1 review, signed commits, no direct push.

### 23.4 Required GitHub Repository Secrets

Defined per-environment under **Settings → Environments → {env} → Secrets**:

|Secret                     |Purpose                            |Notes                                 |
|---------------------------|-----------------------------------|--------------------------------------|
|`AWS_ROLE_ARN`             |Role for OIDC assume-role          |Use OIDC, not long-lived keys         |
|`AWS_REGION`               |Region                             |e.g. `us-east-1`                      |
|`ECR_REGISTRY`             |ECR registry URL                   |`1234.dkr.ecr.us-east-1.amazonaws.com`|
|`EKS_CLUSTER_NAME`         |Target cluster                     |per env                               |
|`KUBE_NAMESPACE`           |k8s namespace                      |`flowboard-{env}`                     |
|`HELM_VALUES_FILE`         |Path to env values file            |`deploy/helm/values-{env}.yaml`       |
|`SLACK_DEPLOY_WEBHOOK`     |Notify deploys to ops Slack channel|optional                              |
|`SENTRY_AUTH_TOKEN`        |Source-map upload                  |per env                               |
|`TURBO_TOKEN`, `TURBO_TEAM`|Remote build cache                 |speeds builds 5–10x                   |

**Repository-level (not per env):**

- `CODECOV_TOKEN` (if using Codecov)
- `DEPENDABOT_*` if needed

**No long-lived AWS keys.** Use GitHub OIDC → AWS IAM role assumption. The role’s trust policy must restrict `sub` to `repo:{org}/flowboard:environment:{env}`.

### 23.5 CI Workflow (`ci.yml`)

Runs on every PR and push to `main`. Must pass before merge.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      core: ${{ steps.filter.outputs.core }}
      go-services: ${{ steps.filter.outputs.go-services }}
      infra: ${{ steps.filter.outputs.infra }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web: 'apps/web/**'
            api: 'apps/api-gateway/**'
            core: 'apps/core-service/**'
            go-services: 'apps/notification-service/** | apps/slack-connector/**'
            infra: 'infra/**'

  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm lint
      - run: pnpm typecheck

  test-ts:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: flowboard_test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm db:migrate
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/flowboard_test }
      - run: pnpm test:ci
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/flowboard_test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v4
        with: { token: ${{ secrets.CODECOV_TOKEN }}, fail_ci_if_error: false }

  test-go:
    runs-on: ubuntu-latest
    needs: detect-changes
    if: needs.detect-changes.outputs.go-services == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-go
      - run: golangci-lint run ./...
      - run: go test -race -coverprofile=coverage.out ./...

  build-images:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, test-ts]
    if: github.event_name == 'pull_request'
    strategy:
      matrix:
        service: [web, api-gateway, core-service, notification-service, slack-connector]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/${{ matrix.service }}/Dockerfile
          push: false                  # PR builds don't push
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}

  e2e:
    runs-on: ubuntu-latest
    needs: [test-ts]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env: { CI: true }
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }
```

**CI runtime budget:** full pipeline must complete in under 12 minutes on PR. If it grows beyond that, parallelize further or move e2e to a nightly job triggered separately.

### 23.6 Build & Push (Reusable)

Image build and push happens only on `main` and tags. Reusable workflow `_build-and-push.yml` (called by all CD workflows):

```yaml
name: _build-and-push
on:
  workflow_call:
    inputs:
      service: { required: true, type: string }
      image_tag: { required: true, type: string }
      environment: { required: true, type: string }
    outputs:
      image:
        value: ${{ jobs.build.outputs.image }}

permissions:
  id-token: write   # for OIDC
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - uses: docker/setup-buildx-action@v3
      - id: meta
        run: echo "image=${{ secrets.ECR_REGISTRY }}/flowboard/${{ inputs.service }}:${{ inputs.image_tag }}" >> $GITHUB_OUTPUT
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/${{ inputs.service }}/Dockerfile
          push: true
          tags: |
            ${{ steps.meta.outputs.image }}
            ${{ secrets.ECR_REGISTRY }}/flowboard/${{ inputs.service }}:latest
          cache-from: type=gha,scope=${{ inputs.service }}
          cache-to: type=gha,mode=max,scope=${{ inputs.service }}
          provenance: true             # SLSA build provenance
          sbom: true                   # generate SBOM
      - name: Sign image with cosign
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes ${{ steps.meta.outputs.image }}
```

**Image tag scheme:**

- Dev: `dev-{git-sha-short}-{run-number}`
- Staging: `staging-{semver}` (e.g. `staging-1.4.0-rc.1`)
- Production: `{semver}` (e.g. `1.4.0`)
- All images additionally tagged `latest` for the env (mutable convenience tag, never used in deploy specs).

### 23.7 Deploy Workflows

#### `cd-dev.yml`

```yaml
name: CD — dev
on:
  push: { branches: [main] }
concurrency: { group: cd-dev, cancel-in-progress: false }

permissions: { id-token: write, contents: read }

jobs:
  build:
    strategy:
      matrix: { service: [web, api-gateway, core-service, notification-service, slack-connector] }
    uses: ./.github/workflows/_build-and-push.yml
    with:
      service: ${{ matrix.service }}
      image_tag: dev-${{ github.sha }}
      environment: dev
    secrets: inherit

  migrate:
    needs: build
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_ROLE_ARN }}, aws-region: ${{ secrets.AWS_REGION }} }
      - name: Run migrations as a one-shot Job
        run: |
          aws eks update-kubeconfig --name ${{ secrets.EKS_CLUSTER_NAME }}
          helm upgrade --install flowboard-migrate deploy/helm/migrate \
            -n ${{ secrets.KUBE_NAMESPACE }} \
            --set image.tag=dev-${{ github.sha }} \
            --wait --timeout 5m

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/helm-deploy
        with:
          cluster: ${{ secrets.EKS_CLUSTER_NAME }}
          namespace: ${{ secrets.KUBE_NAMESPACE }}
          values_file: deploy/helm/values-dev.yaml
          image_tag: dev-${{ github.sha }}

  smoke:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS https://dev.flowboard.app/healthz
      - run: curl -fsS https://dev.flowboard.app/readyz
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with: { payload: '{"text":"dev deploy ${{ job.status }}: ${{ github.sha }}"}' }
        env: { SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }} }
```

#### `cd-staging.yml`

- Trigger: tag `staging-*` or manual `workflow_dispatch`.
- Identical structure to dev, but `environment: staging`.
- Adds a smoke-test job running a small Playwright suite (`pnpm test:smoke`) against the deployed staging URL.
- Runs k6 load test against staging weekly via separate scheduled workflow.

#### `cd-production.yml`

- Trigger: semver tag `v*.*.*`.
- Same structure plus:
  - **Approval gate**: `environment: production` is configured in GitHub with a required reviewer list (CODEOWNERS for `/deploy`).
  - **Deploy strategy**: Helm with `--atomic --timeout 10m`. Helm rollback automatic on failure.
  - **Canary** (optional, post-GA): use Argo Rollouts to send 10% traffic for 5 minutes, promote on healthy metrics. For MVP, do straight rolling update with `maxUnavailable: 0`.
  - **Post-deploy job**: run smoke tests, notify Slack, create GitHub Release with auto-generated changelog (from `release-drafter`).

### 23.8 Database Migrations

Migrations are the riskiest part of any deploy. Rules:

1. **Migrations run as a Kubernetes Job, not as part of the app pod startup.** The deploy workflow runs migrations in a dedicated step before rolling out new app pods.
1. **Forward-compatible migrations only.** Old app code must work against new schema (so a partial rollout doesn’t break). Concretely:
- Add columns as nullable; backfill in a separate migration; mark NOT NULL in a later release.
- Never drop a column in the same release that stops writing to it; drop one release later.
- Renaming = add new + dual-write + backfill + remove old, across multiple releases.
1. **Locking discipline:** `lock_timeout = '5s'` and `statement_timeout = '60s'` set at the migration tool level. A migration that can’t get a lock fails fast rather than blocking writes.
1. **Manual dispatch fallback:** `db-migrate.yml` workflow allows running a specific migration revision against a chosen environment with manual approval, used for rollback or when the auto-migrate step needs replay.

Migration tool config:

- Node services: `node-pg-migrate` with directory `apps/{service}/migrations`.
- Go services: `goose` with directory `apps/{service}/migrations`.
- Each service owns its migrations; no shared migration directory. The DB itself has separate schemas per service if needed (e.g., `core`, `notifications`).

### 23.9 Helm Charts

Located in `deploy/helm/`. One umbrella chart `flowboard/` with subcharts per service. Values files per env:

```
deploy/helm/
├── flowboard/
│   ├── Chart.yaml
│   ├── values.yaml                 # defaults
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   ├── values-production.yaml
│   └── charts/                     # service subcharts
│       ├── web/
│       ├── api-gateway/
│       ├── core-service/
│       ├── notification-service/
│       └── slack-connector/
└── migrate/                        # one-shot migration Job chart
```

Per-service values include: image, replicas, resources, HPA config, env-from-secret references. Secrets are mounted from AWS Secrets Manager via External Secrets Operator (declared in `infra/`, not in Helm values).

### 23.10 Infrastructure (Terraform via GitHub Actions)

`infra/` is Terraform. CI workflow `infra.yml`:

- On PR touching `infra/`: `terraform plan` and post the plan as a PR comment.
- On merge to `main`: `terraform apply` against dev.
- Tags `infra-staging-*` and `infra-prod-*` apply to those envs (production gated by approval).
- State in S3 with DynamoDB locking, separate state file per env.
- OIDC role assumption — no static AWS credentials in the workflow.

Resources owned by Terraform: VPC, EKS cluster, RDS Postgres, ElastiCache Redis, MSK (Kafka), S3 buckets, IAM roles, Route53 records, ACM certs, Secrets Manager entries.

### 23.11 Rollback Strategy

|Failure                                        |Rollback Action                                                                                                                     |
|-----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|App deploy fails health check                  |Helm `--atomic` auto-rolls back. No manual step.                                                                                    |
|App deploys but bug discovered                 |Re-tag previous semver and run `cd-production.yml` against it. ETA: 5 minutes.                                                      |
|Migration fails partway                        |Migration tool transactional where possible. If not (e.g., `CREATE INDEX CONCURRENTLY`), run inverse migration via `db-migrate.yml`.|
|Bad migration that’s already applied + breaking|Roll forward with a fix migration; do not attempt down-migrations in production.                                                    |
|Infra change breaks something                  |`terraform apply` previous state file revision via dispatch workflow.                                                               |

Document each production rollback in a postmortem within 48h. Template in `/docs/postmortems/`.

### 23.12 Security in CI/CD

- **Image scanning:** `aquasecurity/trivy-action` runs on every built image; fails the build on HIGH or CRITICAL CVEs in app dependencies (base image findings logged but not failing).
- **Secret scanning:** GitHub native secret scanning + `gitleaks` action on PRs.
- **SBOM:** generated by `docker buildx` (`--sbom=true`) and uploaded as a workflow artifact. Stored 90 days.
- **Image signing:** `cosign` signs every pushed image with keyless OIDC. Production cluster admission controller (`policy-controller`) verifies signatures before allowing pulls.
- **Dependency updates:** Dependabot daily for npm and Go; weekly grouped PR for minor/patch, individual PRs for major.
- **CODEOWNERS** required for `.github/workflows/`, `deploy/`, `infra/`, and any migration directory. Changes need owner approval.
- **Branch protection** on `main`: required signed commits, required passing checks, no force pushes, no deletions.

### 23.13 Observability of Deploys

Every deploy emits a marker event:

- Datadog/Grafana annotation via API call in the post-deploy step.
- Sentry release created with source maps uploaded (web service).
- Custom Prometheus metric `flowboard_deploy_total{env, service, sha}` incremented.
- Slack message in `#deploys` with: env, service, sha, actor, duration, status.

Alert rule: if error rate or p95 latency rises by > 50% within 15 minutes after a deploy marker, page the on-call engineer with the deploy reference.

### 23.14 Cost & Concurrency Controls

- `concurrency` blocks on every CD workflow keyed by env (`cd-${env}`) prevent overlapping deploys.
- CI uses `cancel-in-progress: true` so superseded PR commits don’t waste minutes.
- `paths-filter` limits matrix builds to changed services on PRs (full matrix only on `main`).
- Self-hosted runners considered post-GA if monthly Actions minutes exceed budget; for MVP, GitHub-hosted runners are sufficient.

### 23.15 Required Files Checklist (For Claude Code)

When implementing this section, produce these files:

- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/_build-and-push.yml`
- [ ] `.github/workflows/cd-dev.yml`
- [ ] `.github/workflows/cd-staging.yml`
- [ ] `.github/workflows/cd-production.yml`
- [ ] `.github/workflows/db-migrate.yml`
- [ ] `.github/workflows/infra.yml`
- [ ] `.github/workflows/security-scan.yml`
- [ ] `.github/workflows/release.yml`
- [ ] `.github/actions/setup-node-pnpm/action.yml`
- [ ] `.github/actions/setup-go/action.yml`
- [ ] `.github/actions/ecr-login/action.yml`
- [ ] `.github/actions/helm-deploy/action.yml`
- [ ] `.github/CODEOWNERS`
- [ ] `.github/dependabot.yml`
- [ ] `apps/{service}/Dockerfile` for each service (multi-stage, distroless final stage where possible)
- [ ] `deploy/helm/flowboard/` umbrella chart and subcharts
- [ ] `deploy/helm/migrate/` job chart
- [ ] `infra/` Terraform with `envs/{dev,staging,prod}/` overlays

-----

## 24. Glossary

- **Workspace**: top-level tenant, 1:1 with a Slack team.
- **Project**: container for tickets, has its own board and workflow.
- **Column**: workflow stage. Maps to status.
- **Ticket**: the work item. Display ID: `{project_key}-{number}`.
- **Rank**: fractional-index string for ordering tickets within a column.
- **Epic**: a parent ticket grouping child tickets.
- **WIP Limit**: cap on tickets in a column.
- **Watcher**: user subscribed to ticket updates without being an assignee.

-----

**End of spec.** Any deviation from this document during implementation must be raised as a question, not silently resolved.