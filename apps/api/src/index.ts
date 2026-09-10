import { Elysia, t } from "elysia";
import { auth } from "@repo/auth";
import { cors } from "@elysiajs/cors";
import { RPCApiHandler } from '@zenstackhq/server/api';
import { createElysiaHandler } from '@zenstackhq/server/elysia';
import { db, zenstack, schema } from '@repo/db';
import { LogModule } from '@repo/db/enums';
import { logger, readLogs } from '@repo/logger';
import * as storage from '@repo/storage';
import { chat } from './chat';
import { enqueueTask, stopTasks } from "./lib/tasks";

const AuthService = new Elysia({ name: "better-auth" })
  .mount(auth.handler);

export const AuthMacro = new Elysia({ name: "auth-macro" })
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers: headers as HeadersInit
        });

        if (!session) return status(401)

        const members = await zenstack.member.findMany({
          where: { userId: session.session.userId },
          select: { organizationId: true, role: true },
        });

        return {
          user: session.user,
          session: session.session,
          members,
        }
      }
    }
  })

const AccessLog = new Elysia({ name: "access-log" })
  .derive(({ request }) => ({
    requestStart: performance.now(),
  }))
  .onAfterHandle(({ request, set, requestStart, server }) => {
    logger.access.info({
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
      durationMs: Math.round(performance.now() - requestStart!),
      ip: server?.requestIP(request)?.address,
    }, 'request handled')
  })
  .onError(({ request, set, requestStart, server, error }) => {
    logger.access.error({
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
      durationMs: Math.round(performance.now() - requestStart!),
      ip: server?.requestIP(request)?.address,
      err: error,
    }, 'request failed')
  })

const app = new Elysia()
  .use(
    cors({
      origin: process.env.APP_URL || 'http://localhost:3000',
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(AccessLog)
  .use(AuthService)
  .use(AuthMacro)
  .get('/logs', ({ query }) => readLogs({
    ...query,
    levels: query.levels?.map(Number),
  }), {
    query: t.Object({
      module: t.Union(LogModule.map((module) => t.Literal(module.value))),
      date: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
      levels: t.Optional(t.Array(t.String(), { maxItems: 8 })),
      search: t.Optional(t.String({ maxLength: 200 })),
    }),
    auth: true
  })
  .group('/model', (app) =>
    app.use(
      createElysiaHandler({
        apiHandler: new RPCApiHandler({ schema }),
        basePath: '/model',
        getClient: async ({ headers }) => {
          const session = await auth.api.getSession({
            headers: headers as HeadersInit
          });

          if (!session) return db

          const members = await zenstack.member.findMany({
            where: { userId: session.session.userId },
            select: { organizationId: true, role: true },
          });

          return db.$setAuth({
            id: session.session.userId,
            members,
          } as any)
        }
      })
    )
  )
  .group('/storage', (app) =>
    app
      .post('/presign', ({ body }) => ({
        key: body.key,
        url: storage.presign(body.key, body),
      }), {
        body: t.Object({
          key: t.String({ minLength: 1, maxLength: 1024 }),
          method: t.Optional(t.Union([
            t.Literal('GET'), t.Literal('POST'), t.Literal('PUT'),
            t.Literal('DELETE'), t.Literal('HEAD'),
          ])),
          expiresIn: t.Optional(t.Number({ minimum: 1, maximum: 7 * 24 * 60 * 60 })),
          type: t.Optional(t.String({ maxLength: 255 })),
          contentDisposition: t.Optional(t.String({ maxLength: 255 })),
        }),
        auth: true,
      })
      .post('/upload', ({ body, user }) =>
        storage.upload({ scope: user.id, key: body.key, file: body.file }), {
        body: t.Object({
          file: t.File({ maxSize: '100m' }),
          key: t.Optional(t.String({ minLength: 1, maxLength: 1024 })),
        }),
        auth: true,
      })
      .get('/objects/*', async ({ params }) => {
        const s3file = await storage.download(params['*']);
        return s3file ? new Response(s3file) : { error: 'Not found' };
      }, {
        auth: true,
      })
      .delete('/objects/*', async ({ params }) => storage.removeObject(params['*']), {
        auth: true,
      })
      .get('/stat/*', async ({ params }) => storage.statObject(params['*']), {
        auth: true,
      })
      .get('/list', async ({ query }) => storage.listObjects(query), {
        query: t.Object({
          prefix: t.Optional(t.String({ maxLength: 1024 })),
          maxKeys: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        }),
        auth: true,
      })
  )
  .group('/tasks', (app) =>
    app
      .post('/posts/export', ({ body, user }) => enqueueTask('post.export', {
        userId: user.id,
        organizationId: body.organizationId,
      }), {
        body: t.Object({
          organizationId: t.Optional(t.String()),
        }),
        auth: true,
      })
  )
  .use(chat)
  .listen(8000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);

  await app.stop();
  await stopTasks();

  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
