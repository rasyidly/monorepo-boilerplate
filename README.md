# Monorepo Starter

A full-stack, multi-tenant SaaS boilerplate — organizations and memberships, role-based
access, org-scoped content, per-user file storage, structured logs, and a visual
workflow editor — served as a Nuxt 4 SPA dashboard over an Elysia API with a
policy-enforced ZenStack data layer on PostgreSQL. Built as a Bun workspaces monorepo
so the web app, API, and shared packages evolve in one place.

It is a _starter_, not just a skeleton: every layer ships with a working vertical
slice (Posts CMS, organization management, file manager) that demonstrates the intended
pattern end to end, plus reusable UI kit components you build your own screens on.

## What's inside

- **Nuxt 4 SPA dashboard** — Nuxt UI v4 dashboard chrome (navigation, command
  palette, theme), Pinia + Colada for client-side data, schema-aware queries straight
  from the browser, Geist typeface.
- **Full Better Auth stack** — email/password sign-in & sign-up with email
  verification and password reset, organizations (members, invitations, accept flow),
  dynamic role/permission access control, 2FA (TOTP), admin plugin, and an OpenAPI
  spec — mounted on the Elysia API with a ZenStack database adapter.
- **Policy-enforced data API** — ZenStack access policies are applied per request on
  an RPC `/model` endpoint; the policy context is set from the caller's session and
  organization memberships, so every query is authorized server-side.
- **Reusable UI-kit layer** (`apps/web/layers/utils`) — a schema-driven `DataTable`
  (rule-builder filters, nested-relation sorting, column visibility & pinning, row
  selection, pagination, URL-synced state), inline cell editing, ZenStack-backed
  relation pickers, confirmation overlays — plus drag-and-drop `Kanban` and a
  `Vue Flow` workflow node editor as patterns to extend.
- **Object storage service** — `@repo/storage` wraps Bun's S3 client (upload,
  presigned URLs, download, delete, stat, list); the File Manager UI scopes every
  user's files under their own prefix.
- **Structured logging & email** — pino JSON loggers per module (access, auth, db,
  email) written to daily files with an authenticated, auto-refreshing log viewer;
  nodemailer with a dev-mode "log-only" fallback when SMTP is unconfigured.
- **Local infra via Docker** — `docker compose up` brings up PostgreSQL, Adminer, and
  MinIO for local S3.
- **Sample vertical slices** — the Posts CMS (authored content with a draft →
  published → archived lifecycle) demonstrates the data-table pattern; organization
  management, account self-service, and the workflow editor show how auth, orgs, and
  the API compose. The dashboard and AI-agent panel are placeholders.

## Repository layout

| Path               | What it is                                                                   |
| ------------------ | ---------------------------------------------------------------------------- |
| `apps/api`         | Elysia API (port 8000): Better Auth mount, `/model` RPC, `/storage`, `/logs` |
| `apps/web`         | Nuxt 4 SPA (port 3000); `layers/utils` holds the reusable UI kit             |
| `packages/auth`    | Better Auth server config + access-control roles & permissions               |
| `packages/db`      | ZenStack `schema.zmodel`, generated clients, shared enum label maps          |
| `packages/email`   | nodemailer wrapper (real SMTP or log-only)                                   |
| `packages/logger`  | pino per-module loggers + log reader                                         |
| `packages/storage` | Bun S3 object-storage service layer                                          |

## Tech Stack

| Layer                       | Technology                                                           |
| --------------------------- | -------------------------------------------------------------------- |
| Runtime / package manager   | [Bun](https://bun.sh) (`bun`, workspaces)                            |
| Web app                     | Nuxt 4 (SPA, `ssr: false`), Nuxt UI v4, Vue 3, TypeScript            |
| Client data                 | Pinia Colada + `zenstack-pinia-colada` (typed queries over `/model`) |
| Tables / drag / node editor | TanStack Vue Table, vue-draggable-plus, Vue Flow                     |
| API                         | Elysia (port 8000), `@zenstackhq/server` RPC handlers                |
| Data                        | ZenStack 3 (policy plugin) + `pg` / PostgreSQL 18                    |
| Auth                        | Better Auth 1.7 (orgs, roles, 2FA, admin, OpenAPI)                   |
| Object storage              | Bun `S3Client` + MinIO (local)                                       |
| Email / Logging             | nodemailer 9 / pino 10                                               |

## Prerequisites

- **Bun ≥ 1.x** — `curl -fsSL https://bun.sh/install | bash`
- **Docker + Docker Compose** (for local Postgres + MinIO; alternatively point
  `DATABASE_URL` at any Postgres and configure any S3-compatible store)
- Node.js is _not_ required — Bun runs everything.

## Installation

```sh
# 1. Install workspace dependencies (from repo root)
bun install

# 2. Create the environment file
cp .env.example .env   # if present; otherwise create .env from the table below

# 3. Start Postgres (5432) + Adminer (8080) + MinIO (9000 API / 9001 console)
docker compose up -d

# 4. Create the database schema (ZenStack syncs schema.zmodel → Postgres)
bun run db:push

# 5. Run the app (API :8000 + web :3000, watch mode)
bun run dev
```

Required `.env` keys (repo root; loaded via `bun --env-file=../../.env`):

| Variable                                | Example                                                  | Notes                                                                                    |
| --------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | `postgresql://postgres:postgres@localhost:5432/postgres` | Postgres connection string                                                               |
| `APP_URL`                               | `http://localhost:3000`                                  | Web origin (CORS + trusted origin)                                                       |
| `API_URL`                               | `http://localhost:8000`                                  | API origin (auth base URL, CORS)                                                         |
| `NUXT_PUBLIC_SITE_URL`                  | `http://localhost:3000`                                  | Public site URL                                                                          |
| `BETTER_AUTH_SECRET`                    | (run `bunx better-auth secret`)                          | Auth cookie/session signing key                                                          |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | —                                                        | SMTP creds; when unset, email is logged only                                             |
| `SMTP_PORT` / `SMTP_FROM`               | `587` / `noreply@example.com`                            | Optional; `SMTP_FROM` defaults to the current sender                                     |
| `S3_ENDPOINT`                           | `http://127.0.0.1:9000`                                  | MinIO/S3 endpoint (scheme + host + API port) used by `@repo/storage`                     |
| `S3_REGION`                             | `us-east-1`                                              | Optional; defaults to `us-east-1`                                                        |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`       | `minioadmin` / `minioadmin`                              | S3 credentials; must match the MinIO root credentials below                              |
| `S3_BUCKET`                             | `repo`                                                   | Bucket `@repo/storage` targets; create it once in the MinIO console                      |
| `S3_ROOT_USER` / `S3_ROOT_PASSWORD`     | `minioadmin` / `minioadmin`                              | MinIO root credentials — set in `docker-compose.yml` (must equal the key/password above) |

> `S3_ROOT_USER` / `S3_ROOT_PASSWORD` (and `DATABASE_PASSWORD`) are consumed by
> `docker-compose.yml`, not by the app. Keep them consistent with `S3_ACCESS_KEY` /
> `S3_SECRET_KEY` and `DATABASE_URL` respectively.

## Usage

| Command                                | What it does                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `bun run dev`                          | API `:8000` + web `:3000` (watch mode)                                          |
| `bun run dev:web` / `bun run dev:api`  | Run a single app                                                                |
| `bun run db:generate`                  | Regenerate ZenStack clients from `packages/db/zenstack/schema.zmodel`           |
| `bun run db:push`                      | Push the schema to the database (dev only)                                      |
| `bun run auth:generate`                | Regenerate the Better Auth models fragment (`packages/db/zenstack/auth.zmodel`) |
| `bun run --filter @repo/web typecheck` | `nuxt typecheck`                                                                |
| `bun run --filter @repo/web lint`      | `eslint . --fix`                                                                |
| `bun run --filter @repo/web build`     | Production build (`nuxt build`)                                                 |

Open the web app at `http://localhost:3000`:

- `/auth/*` — sign in, sign up, verify email, reset password, accept an invitation
- `/core` — dashboard (placeholder); `/core/posts` — the Posts CMS demo table;
  `/core/organization` and `/core/organization/members[/invitations]` — org settings
- `/users` — the active organization's roster (users table)
- `/workflows` — visual workflow editor scaffold (trigger/action nodes)
- `/storage` — File Manager (per-user files on MinIO)
- `/logs` — log viewer (per-module pages, `/logs/access` by default)
- `/account` — profile, password, email, and account deletion

## Contributing

The repository lives at [rasyidly/monorepo-boilerplate](https://github.com/rasyidly/monorepo-boilerplate).

1. Open an issue describing the problem or feature before starting work.
2. Branch from `main`: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
3. Use conventional commit messages, e.g. `feat(db): add Post.archivedAt`.
4. Ensure `bun run --filter @repo/web typecheck` and `bun run --filter @repo/web lint` pass.
5. Open a pull request with a short description of the change and why.

## License

Not specified — the repository contains no `LICENSE` file. Contact the maintainer
before reusing or distributing any part of this codebase.
