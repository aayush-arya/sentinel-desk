# SentinelDesk

Enterprise customer support & SLA desk platform — the kind of ticketing system a support
organization would actually run its business on, not a CRUD demo.

Built as a from-scratch, production-oriented monorepo: NestJS + Prisma + PostgreSQL on the
backend, Next.js 15 + React 19 + Tailwind v4 + shadcn/ui on the frontend, with real multi-tenant
auth, RBAC, and audit logging already in place.

**Live:** frontend on Vercel, API on Render. See [docs/deployment.md](docs/deployment.md) for
how. Demo accounts below work end to end on the live deployment, not just locally.

> **Status:** feature-complete against the original spec — every item in
> [What's implemented today](#whats-implemented-today) is real, migrated, and has been
> exercised end-to-end, not a stub. See [docs/](docs/) for architecture, ER diagram, and
> deployment details.

## Tech stack

**Frontend** — Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Framer Motion · React Hook Form + Zod · TanStack Query · Zustand · TipTap rich text editor

**Backend** — NestJS · Prisma ORM · PostgreSQL · Redis · BullMQ · Socket.IO · JWT + Passport ·
class-validator · Swagger · Nodemailer · MinIO/S3-compatible storage

**AI** — provider-abstracted (Anthropic today, swappable), used for ticket summarization,
suggested replies, sentiment analysis, priority suggestion, duplicate detection, and tag
suggestion

**Infrastructure** — Docker Compose (Postgres, Redis, MinIO, MailHog) · pnpm workspaces

## Monorepo layout

```
apps/
  backend/     NestJS API (controllers → services → Prisma)
  frontend/    Next.js App Router UI
packages/
  types/       Shared API contract types (frontend + backend agree on these shapes)
  ui/          Reserved for cross-app shared components (not yet needed — one frontend app)
  shared/      Reserved for cross-cutting utilities shared beyond apps/
docker/        docker-compose.yml for local infra
docs/          Architecture notes, diagrams
scripts/       One-off operational scripts
```

## Getting started

**Prerequisites:** Node 20+, pnpm 9+, Docker Desktop.

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Start local infra — Postgres, Redis, MinIO, MailHog
docker compose -f docker/docker-compose.yml up -d

# 3. Configure the backend
cp .env.example apps/backend/.env

# 4. Migrate + seed the database
cd apps/backend
npx prisma migrate dev
npx prisma db seed
cd ../..

# 5. Configure the frontend
cat > apps/frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_APP_NAME=SentinelDesk
EOF

# 6. Run both apps (separate terminals)
pnpm --filter @sentinel-desk/backend dev    # http://localhost:4000/api
pnpm --filter @sentinel-desk/frontend dev   # http://localhost:3000
```

API docs (Swagger): `http://localhost:4000/api/docs`
Outbound email (dev): `http://localhost:8025` (MailHog inbox)
Object storage console (dev): `http://localhost:9001` (MinIO — `sentinel_minio` / `sentinel_minio_password`)

### Demo accounts

The seed script creates one organization ("Acme Corp", slug `acme`) with one user per role,
all using the password `Password123!`:

| Role | Email |
|---|---|
| Admin | `admin@acme.com` |
| Manager | `manager@acme.com` |
| Senior Agent | `senior@acme.com` |
| Support Agent | `agent@acme.com` |
| Customer | `customer@acme.com` |

## What's implemented today

- **Multi-tenant auth**: workspace signup, customer self-signup on a support portal, staff
  invites with role-scoped grant permissions, email verification, forgot/reset password,
  invite acceptance.
- **Sessions**: JWT access + refresh tokens as httpOnly cookies, refresh-token rotation with
  reuse detection, "remember me", multi-session listing, per-session revoke, revoke-all-others.
- **RBAC**: five roles (Customer, Support Agent, Senior Agent, Manager, Admin) enforced by
  role guards and a real Role/Permission/RolePermission schema — not just an enum check.
- **Security**: Helmet, per-route rate limiting, CSRF protection that survives a cross-origin
  frontend/backend split (see [docs/architecture.md](docs/architecture.md#csrf-across-origins)),
  bcrypt password hashing, hashed-at-rest verification/reset/invite tokens/API keys, org-wide
  audit logging of security- and ticket-relevant events.
- **Profile & avatar**: profile editing, avatar upload to S3-compatible storage.
- **Team management**: invite members, change role/status, suspend/reactivate — all
  permission-gated server-side, not just hidden in the UI.
- **Role-specific dashboards**: distinct Customer / Agent / Manager / Admin dashboard content,
  each surfacing the metrics and quick actions relevant to that role, backed by real Recharts
  analytics (ticket volume, SLA compliance, CSAT trends) with CSV/PDF export.
- **Ticket system**: create/edit/reply/reopen, file attachments, assignment & transfer, private
  internal notes, merge & split, escalation, tags, watchers (opt-in notifications on tickets
  you don't own), full per-ticket history timeline, list/kanban board/calendar views, saved
  filters, CSAT rating, saved-reply macros.
- **SLA engine**: timezone-aware business hours + holiday calendar, per-priority response/
  resolution targets, pause/resume, automatic breach detection (cron sweep), automatic
  escalation, SLA compliance dashboard, violation reports, and a simulator to preview due
  dates for a hypothetical ticket before it exists.
- **Realtime layer**: Socket.IO gateway (cookie-JWT authenticated) driving live ticket updates,
  typing indicators, presence, and notification delivery.
- **AI features**: ticket summarization, suggested replies, sentiment detection, priority
  suggestion, duplicate detection, and knowledge-base article recommendation, behind a
  swappable provider interface (Anthropic today, mock for tests/offline dev).
- **Knowledge base**: article CRUD with a draft/published workflow, AI-backed "suggest
  relevant articles" on a ticket.
- **Command palette** (⌘K / Ctrl+K): jump to any ticket, page, or action without the mouse.
- **Extensibility**: outbound webhooks (HMAC-signed) on ticket lifecycle events, public API
  keys as an alternate auth path for programmatic access, organization branding (name/logo/
  primary color) reflected live across the UI.
- **DevOps**: multi-stage Dockerfiles for both apps, GitHub Actions CI (typecheck/build/test
  gate; lint non-blocking), deployed live end to end (Vercel + Render + managed Postgres/Redis).

Full breakdown of how these fit together: [docs/architecture.md](docs/architecture.md) ·
[docs/database.md](docs/database.md) (ER diagram) · [docs/deployment.md](docs/deployment.md).
