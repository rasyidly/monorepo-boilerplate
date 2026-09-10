import { Elysia, t } from 'elysia'
import { streamText, convertToModelMessages, tool, zodSchema, isStepCount, createUIMessageStreamResponse, toUIMessageStream } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { pool, schema } from '@repo/db'
import { logger } from '@repo/logger'

function describeSchema(): string {
  const modelNames = new Set(Object.keys(schema.models))
  const enums = new Set(Object.keys(schema.enums ?? {}))
  return Object.values(schema.models)
    .map((model: any) => {
      const fields = Object.values(model.fields as Record<string, any>)
        .filter((field: any) => !field.isArray)
        .map((field: any) => {
          let type = String(field.type)
          if (modelNames.has(type)) type = `relates to ${type}`
          else if (enums.has(type)) type = `${type} [${Object.keys((schema.enums as any)[type].values).join(' | ')}]`
          if (field.id) type = `${type} PK`
          if (field.unique) type = `${type} UNIQUE`
          return `${field.name}: ${type}`
        })
      return `${model.name} { ${fields.join(', ')} }`
    })
    .join('\n')
}

const FORBIDDEN = /(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|do|call|vacuum|reindex|pg_)/i

function assertReadOnly(sql: string): void {
  const statement = sql.replace(/;\s*$/, '')
  const isSelect = /^\s*(select|with)\b/i.test(statement)
  const singleStatement = !statement.includes(';')
  if (!isSelect || !singleStatement || FORBIDDEN.test(statement)) {
    throw new Error('Only a single read-only SELECT statement is allowed')
  }
}

function userQuestion(messages: any[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role !== 'user') continue
    const text = (messages[i].parts ?? [])
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join(' ')
    if (text) return text
  }
}

const SYSTEM_PROMPT = [
  'You are a data assistant for this application (PostgreSQL via Docker).',
  'Database schema:',
  describeSchema(),
  '',
  'Use the `query_database` tool to answer questions that require data.',
  'Table names are always lowercase and must be used as-is in SQL (e.g. "user", "post", "member").',
  'For large datasets, prefer aggregations (COUNT, SUM, GROUP BY) over returning raw rows.',
  'Answer in the same language as the user, in plain, non-technical language for business users.',
  'Never mention SQL, queries, tables, columns, tools, database names, or any technical jargon.',
  'Present numbers clearly and concisely with the most relevant highlights.',
  'If there is no data, say so simply.',
].join('\n')

export const chat = new Elysia({ prefix: '/chat' }).post(
  '/message',
  async ({ body }) => {
    const start = performance.now()
    let queryCount = 0

    logger.ai.info({ question: userQuestion(body.messages), messages: body.messages.length }, 'chat request')

    const result = streamText({
      model: gateway('xiaomi/mimo-v2.5'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(body.messages),
      stopWhen: isStepCount(5),
      tools: {
        query_database: tool<{ sql: string }, any, any>({
          description: 'Execute a SQL query against the PostgreSQL database.',
          inputSchema: zodSchema(z.object({
            sql: z.string().describe('SQL query, SELECT only'),
          })),
          execute: async ({ sql }) => {
            queryCount++
            const queryStart = performance.now()
            try {
              assertReadOnly(sql)
              const { rows } = await pool.query(sql)
              const payload = JSON.parse(JSON.stringify(rows.slice(0, 200), (_key, value) =>
                typeof value === 'bigint' ? value.toString() : value,
              ))
              logger.ai.debug({ sql, rows: payload.length, durationMs: Math.round(performance.now() - queryStart) }, 'query executed')
              return payload
            } catch (error) {
              logger.ai.error({ err: error, sql, durationMs: Math.round(performance.now() - queryStart) }, 'query failed')
              throw error
            }
          },
        }),
      },
      onFinish: ({ usage, steps }) => {
        logger.ai.info({
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          steps: steps.length,
          queries: queryCount,
          durationMs: Math.round(performance.now() - start),
        }, 'chat completed')
      },
      onError: ({ error }) => {
        logger.ai.error({ err: error, durationMs: Math.round(performance.now() - start) }, 'chat failed')
      },
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  },
  {
    body: t.Object(
      {
        messages: t.Array(t.Any()),
        id: t.Optional(t.String()),
      },
      { additionalProperties: true },
    ),
  },
)
