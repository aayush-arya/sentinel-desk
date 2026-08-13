# SentinelDesk

Enterprise customer support & SLA desk platform — the kind of ticketing system a support
organization would actually run its business on, not a CRUD demo.

Built as a from-scratch, production-oriented monorepo: NestJS + Prisma + PostgreSQL on the
backend, Next.js 15 + React 19 + Tailwind v4 + shadcn/ui on the frontend, with real multi-tenant
auth, RBAC, and audit logging already in place.

> **Status:** actively under construction, milestone by milestone. See [Roadmap](#roadmap) for
> what's live today versus what's next. Nothing described as "done" below is a stub — it's
> implemented, migrated, and has been exercised end-to-end.

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
- **Security**: Helmet, per-route rate limiting, double-submit CSRF on cookie-authenticated
  mutations, bcrypt password hashing, hashed-at-rest verification/reset/invite tokens, audit
  logging of security-relevant events.
- **Profile & avatar**: profile editing, avatar upload to MinIO (S3-compatible).
- **Team management**: invite members, change role/status, suspend/reactivate — all
  permission-gated server-side, not just hidden in the UI.
- **Frontend**: branded marketing page, full auth flow UI, dashboard shell with role-aware
  navigation, light/dark theming, all wired to the real API (no mock data).
- **Ticket system**: create/edit/reply/reopen, file attachments, assignment & transfer, private
  internal notes, merge & split, escalation, tags, full per-ticket history timeline.
- **SLA engine**: timezone-aware business hours + holiday calendar, per-priority response/
  resolution targets, pause/resume, automatic breach detection (cron sweep), automatic
  escalation, SLA compliance dashboard, violation reports.
- **Realtime layer**: Socket.IO gateway (cookie-JWT authenticated) driving live ticket updates,
  typing indicators, presence, and notification delivery.
- **AI features**: ticket summarization, suggested replies, sentiment detection, priority
  suggestion, duplicate detection, and tag suggestion, behind a swappable provider interface.

## Roadmap

- [x] Monorepo scaffold, Docker infra, CI-ready tooling
- [x] Multi-tenant auth, RBAC, sessions, audit logging
- [x] Frontend auth UI + dashboard shell
- [x] Ticket system: CRUD, comments, attachments, assignment, merge/split, escalation
- [x] SLA engine: business hours, holiday calendar, breach detection, auto-escalation
- [x] Realtime layer: Socket.IO presence, typing indicators, live updates
- [x] AI features: summarization, suggested replies, sentiment, priority, duplicate detection
- [ ] Role-specific dashboards (Customer / Agent / Manager / Admin) with real analytics — one
      generic dashboard exists today; Recharts is installed but not yet wired up
- [ ] Command palette (Ctrl+K) and kanban board — `cmdk` and `react-dnd` are installed
      dependencies, not yet implemented
- [ ] Knowledge base module (article CRUD + AI recommendations)
- [ ] Global full-text search, saved filters, CSAT, saved-reply macros
- [ ] CSV/PDF export, webhooks, API keys, public REST API
- [ ] Audit log coverage for ticket actions (currently only in per-ticket history, not the
      org-wide audit log)
- [ ] Dockerfiles for containerized deploys, GitHub Actions CI, architecture & ER diagrams
