FROM oven/bun:1

WORKDIR /app

# Workspace manifests needed to resolve apps/tasks' dependency graph before
# installing. apps/web is intentionally omitted (not used at runtime).
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/tasks/package.json ./apps/tasks/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/storage/package.json ./packages/storage/package.json

RUN bun install --frozen-lockfile

COPY apps/api ./apps/api
COPY apps/tasks ./apps/tasks
COPY packages ./packages
COPY tsconfig.json ./tsconfig.json

WORKDIR /app/apps/tasks

CMD ["bun", "run", "src/index.ts"]
