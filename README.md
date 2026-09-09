# MathOlek

A web application for teams to organize and track their work — users, organizations,
posts with review states, and role-based access — served as a Nuxt dashboard over an
Elysia API with a policy-enforced ZenStack data layer on PostgreSQL. Built as a Bun
workspaces monorepo so frontend, API, and shared packages evolve in one place.

The product is under active development: auth, organizations, and data tables are
live; the workflows surface is scaffolded and "coming soon".

## Key Features

- **Nuxt 4 SPA dashboard** — Nuxt UI v4 components, Pinia + Colada data fetching, Geist typeface.
- **Full authentication** — email/password, email verification, password reset, organizations, 2FA (TOTP), admin plugin, OpenAPI spec. Built on Better Auth.
- **Policy-enforced data API** — ZenStack access policies applied per-request on an RPC `/model` endpoint; queries are authorized by the caller's session and organization membership.
- **Organizations & roles** — members, invitations, `owner`/`admin`/`member` roles with fine-grained permissions.
- **Three-layer data tables** — reusable `DataTable` core + ZenStack-bound variant with filter rule-builder, sort, column visibility, pagination, and URL-synced state (see ADR-0001).
- **Structured logging & email** — pino JSON loggers per domain; nodemailer with a dev-mode "log-only" fallback when SMTP is unconfigured.
- **Postgres via Docker** — `docker compose up` with the bundled Adminer for quick inspection.

## Tech Stack

| Layer                     | Technology                                                |
| ------------------------- | --------------------------------------------------------- |
| Runtime / package manager | [Bun](https://bun.sh) (`bun`, workspaces)                 |
| Web app                   | Nuxt 4 (SPA, `ssr: false`), Nuxt UI v4, Vue 3, TypeScript |
| API                       | Elysia (port 8000), `@zenstackhq/server` RPC handlers     |
| Data                      | ZenStack 3 (policy plugin) + `pg` / PostgreSQL 18         |
| Auth                      | Better Auth 1.7 (orgs, 2FA, admin, OpenAPI)               |
| Email / Logging           | nodemailer 9 / pino 10                                    |

## Prerequisites

- **Bun ≥ 1.x** — `curl -fsSL https://bun.sh/install | bash`
- **Docker + Docker Compose** (for local Postgres; alternatively point `DATABASE_URL` at any Postgres)
- Node.js is _not_ required — Bun runs everything.

## Installation

```sh
# 1. Install workspace dependencies (from repo root)
bun install

# 2. Create the environment file
cp .env.example .env   # if present; otherwise create .env from the table below

# 3. Start Postgres (port 5432) + Adminer (port 8080) + MinIO (ports 9000/9001)
docker compose up -d

# 4. Create the database schema (ZenStack syncs schema.zmodel → Postgres)
bun run db:push

# 5. Run the app
bun run dev
```

Required `.env` keys (root of the repo; loaded via `bun --env-file=../../.env`):

| Variable                                | Example                                                  | Notes                                                                    |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                          | `postgresql://postgres:postgres@localhost:5432/postgres` | Postgres connection string                                               |
| `APP_URL`                               | `http://localhost:3000`                                  | Web origin (CORS + trusted origin)                                       |
| `API_URL`                               | `http://localhost:8000`                                  | API origin (auth base URL, CORS)                                         |
| `NUXT_PUBLIC_SITE_URL`                  | `http://localhost:3000`                                  | Public site URL                                                          |
| `BETTER_AUTH_SECRET`                    | (run `bunx better-auth secret`)                          | Auth cookie/session signing key                                          |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | —                                                        | SMTP creds; when unset, email is logged only                             |
| `SMTP_PORT` / `SMTP_FROM`               | `587` / `noreply@cekstatus.id`                           | Optional; `SMTP_FROM` defaults to the current sender                     |
| `S3_ENDPOINT`                           | `127.0.0.1`                                              | MinIO host; use the public endpoint when presigned URLs are used in prod |
| `S3_PORT` / `S3_USE_SSL`                | `9000` / `false`                                         | MinIO API port and TLS flag                                              |
| `S3_ROOT_USER` / `S3_ROOT_PASSWORD`     | `minioadmin` / `minioadmin`                              | Match `S3_ROOT_*` in `docker-compose.yml`                                |
| `S3_BUCKET`                             | `repo`                                                   | Default bucket; created on first use                                     |

## Usage

| Command                                | What it does                                                          |
| -------------------------------------- | --------------------------------------------------------------------- |
| `bun run dev`                          | API `:8000` + web `:3000` (watch mode)                                |
| `bun run dev:web` / `bun run dev:api`  | Run a single app                                                      |
| `bun run db:generate`                  | Regenerate ZenStack clients from `packages/db/zenstack/schema.zmodel` |
| `bun run db:push`                      | Push the schema to the database (dev only)                            |
| `bun run auth:generate`                | Regenerate Better Auth models into `schema.zmodel`                    |
| `bun run --filter @repo/web typecheck` | `nuxt typecheck`                                                      |
| `bun run --filter @repo/web lint`      | `eslint . --fix`                                                      |
| `bun run --filter @repo/web build`     | Production build (`nuxt build`)                                       |

Open the web app at `http://localhost:3000` (routes: `/auth/signin`, `/core`, `/users`, `/account`, `/workflows`); the API listens on `http://localhost:8000`.

## Contributing

The repository is not hosted on a remote yet, so issues and PRs are coordinated
directly with the maintainer for now. When a hosted remote is added:

1. Open an issue describing the problem or feature before starting work.
2. Branch from `main`: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
3. Use conventional commit messages, e.g. `feat(db): add Post.archivedAt`.
4. Ensure `bun run --filter @repo/web typecheck` and `bun run --filter @repo/web lint` pass.
5. Open a pull request with a short description of the change and why.

## License

Not specified — the repository contains no `LICENSE` file. Contact the maintainer
before reusing or distributing any part of this codebase.
