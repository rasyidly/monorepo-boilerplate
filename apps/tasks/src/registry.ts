import type { Job } from 'pg-boss'
import type { z } from 'zod'
import type { TaskId, TaskPayload } from './tasks'

export type TaskContext = {
  job: Job
  send: <TId extends TaskId>(
    id: TId,
    payload: TaskPayload<TId>,
  ) => Promise<string | null>
}

export type TaskDefinition<TId extends string = string, TPayload = unknown> = {
  id: TId
  payload: z.ZodType<TPayload>

  retryLimit?: number
  retryDelay?: number
  retryBackoff?: boolean

  run: (
    payload: TPayload,
    context: TaskContext,
  ) => Promise<void>
}

export type AnyTaskDefinition = TaskDefinition<string, any>

export function task<const TId extends string, TPayload>(
  definition: TaskDefinition<TId, TPayload>,
): TaskDefinition<TId, TPayload> {
  return definition
}
