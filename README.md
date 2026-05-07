# Tailor Resume

AI-powered resume tailoring. Pick a candidate profile, paste a job description, let Claude rewrite the editable sections, review every change in a Git-style diff, manually override what you want, and export a PDF — every application logged with its diff snapshot.

---

## Quick start

```bash
pnpm install
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY — get one at https://console.anthropic.com/
pnpm db:push
pnpm db:seed     # creates 3 sample profiles: anurag-fullstack, shreya-backend, shivani-frontend
pnpm dev         # http://localhost:3000
```

End-to-end flow:

1. Open `/` — see the seeded profiles.
2. Click a profile → **Tailor for a job**.
3. Paste a JD, hit **Tailor with AI**. Claude rewrites the editable sections; the locked section (name, contact, education, job titles, companies, dates) is sent as read-only context and validated on the way back.
4. The diff review screen shows every changed line with word-level highlights. Per-line: **keep AI**, **revert**, or **edit inline**. Bulk: **Accept all / Reject all**.
5. Click **Finalize** — the application is logged at `/applications` with its full diff snapshot.

---

## Features

| Feature | Where |
| --- | --- |
| JSON Profile Store (locked vs editable) | `src/lib/resume/schema.ts`, `prisma/schema.prisma` |
| JD-Driven AI Tailoring | `src/lib/resume/claude.ts`, `POST /api/v1/resume/applications` |
| LaTeX / PDF Export | `src/lib/resume/pdfDocument.tsx`, `GET /api/v1/resume/applications/{id}/pdf` |
| Git-Diff Change Review | `src/lib/resume/diff.ts`, `src/components/resume/ReviewClient.tsx` |
| Inline Manual Edit | Per-line keep / revert / edit controls in `ReviewClient` |
| Application Tracker | `src/app/applications/`, `ResumeApplication` model |

---

## Resume JSON schema

Each profile has two top-level buckets:

```jsonc
{
  "profileId": "vijay-backend",
  "locked": {
    "name": "Vijay Wankhede",
    "contact": { "email": "...", "phone": "...", "location": "...", "linkedin": "...", "github": "..." },
    "education": [{ "institution": "...", "degree": "...", "field": "...", "startYear": "...", "endYear": "..." }],
    // Job titles / companies / dates are facts — Claude may not change these.
    "experienceFacts": [{ "id": "exp-acme", "title": "...", "company": "...", "startDate": "...", "endDate": "..." }]
  },
  "editable": {
    "summary": "...",
    "skills": ["..."],
    // Same ids as locked.experienceFacts — bullets are tailorable, role facts are not.
    "experience": [{ "id": "exp-acme", "bullets": ["..."] }],
    "projects": [{ "id": "proj-x", "name": "...", "description": "...", "bullets": ["..."], "techStack": ["..."] }]
  }
}
```

The Anthropic call uses tool use to enforce structured JSON output, plus a post-validation step that rejects any response whose experience IDs don't match the input.

---

## Configuration

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Required for AI tailoring. |
| `CLAUDE_MODEL` | Model override. Default: `claude-sonnet-4-6`. |
| `DATABASE_URL` | Defaults to `file:./dev.db`. Postgres works — change `provider` in `prisma/schema.prisma`. |
| `JWT_SECRET` | Required in production. |

---

## REST API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/resume/profiles` | List profiles |
| POST | `/api/v1/resume/profiles` | Create profile |
| GET | `/api/v1/resume/profiles/{id}` | Get profile |
| PATCH | `/api/v1/resume/profiles/{id}` | Update profile |
| DELETE | `/api/v1/resume/profiles/{id}` | Delete profile + applications |
| GET | `/api/v1/resume/applications` | List applications |
| POST | `/api/v1/resume/applications` | Tailor a profile against a JD (calls Claude) |
| GET | `/api/v1/resume/applications/{id}` | Get application + diff |
| PATCH | `/api/v1/resume/applications/{id}` | Save manual edits; optionally `finalize: true` |
| GET | `/api/v1/resume/applications/{id}/pdf` | Render PDF |

All responses use the envelope:

```json
{ "data": {}, "request_id": "req_01HXYZ..." }
```

Errors:

```json
{ "error": { "code": "SNAKE_CASE", "message": "..." }, "request_id": "req_01HXYZ..." }
```

---

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── healthz, readyz
│   │   └── v1/
│   │       ├── auth/           demo-login, me
│   │       └── resume/         profiles, applications, pdf
│   ├── profiles/               profile list, create, edit, tailor
│   ├── applications/           application list, review diff
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── resume/                 Nav, ProfileEditor, TailorForm, ReviewClient
│   └── providers/QueryProvider.tsx
└── lib/
    ├── resume/
    │   ├── claude.ts           Anthropic SDK integration
    │   ├── diff.ts             word-level diff computation
    │   ├── schema.ts           Zod schemas for locked/editable resume
    │   ├── store.ts            profile + application CRUD
    │   ├── pdfDocument.tsx     PDF renderer
    │   ├── seedData.ts         sample profiles
    │   └── templates/          TemplateA–E
    ├── api.ts                  JSON envelope + request IDs
    ├── auth.ts                 session cookie helper
    ├── db.ts                   Prisma singleton
    ├── errors.ts               ApiError
    └── ids.ts                  ULID-prefixed IDs
```

---

## Commands

```bash
pnpm dev          # start dev server at http://localhost:3000
pnpm build        # prisma generate + next build
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm db:push      # apply schema to DB
pnpm db:seed      # seed sample profiles (idempotent)
pnpm db:reset     # wipe + reseed
```

---

## Deployment

The repo ships a GitHub Actions pipeline that publishes a production-ready multi-arch image to **GitHub Container Registry (GHCR)**.

> **For step-by-step deployment instructions see [`DEPLOYMENT.md`](./DEPLOYMENT.md).**

### Pipeline

| Workflow | Trigger | Result |
| --- | --- | --- |
| CI (`.github/workflows/ci.yml`) | every PR + push to `main` | lint, typecheck, test, build, Docker smoke test |
| Release (`.github/workflows/release.yml`) | push to `main`, semver tag, manual dispatch | multi-arch image (`linux/amd64`, `linux/arm64`) pushed to GHCR with provenance + SBOM |

### Run with Docker

```bash
# Compose (recommended)
docker compose up -d

# Or plain docker run
docker run -d \
  --name tailor-resume \
  -p 3000:3000 \
  -v tailor-data:/data \
  -e DATABASE_URL="file:/data/tailor.db" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  ghcr.io/wankhede04/tailor-resume:latest
```

The image runs as a non-root user, persists SQLite at `/data/tailor.db`, runs `prisma db push` on every boot, and exposes `/api/healthz` + `/api/readyz`.

### Cutting a release

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The Release workflow runs the test gate, builds the image, and creates a GitHub Release with auto-generated notes.
