import { schema as _schema } from './zenstack/schema';
import { Pool } from 'pg';
import { ZenStackClient } from '@zenstackhq/orm';
import { PostgresDialect } from '@zenstackhq/orm/dialects/postgres';
import { PolicyPlugin } from '@zenstackhq/plugin-policy';
import { logger } from '@repo/logger';

export type { ZenStackClient, ModelResult } from '@zenstackhq/orm';

export type * from '@zenstackhq/schema'
export type * from '@zenstackhq/orm';

export const schema = _schema;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => logger.db.error({ err }, 'database pool error'));

const dialect = new PostgresDialect({
  pool,
});

export const zenstack = new ZenStackClient(schema, { dialect });

export const db = zenstack.$use(new PolicyPlugin());
