import { schema } from './zenstack/schema';
import { createSchemaFactory } from '@zenstackhq/zod';

const factory = createSchemaFactory(schema);

export {
  schema,
  factory,
};

export type SchemaType = typeof schema;

export * from './zenstack/models';
