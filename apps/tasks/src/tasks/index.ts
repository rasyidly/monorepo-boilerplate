import type { z } from 'zod'
import { notifyEmail } from './notify.email'
import { notifyWeb } from './notify.web'
import { postExport } from './post.export'
import type { AnyTaskDefinition } from '../registry'

export * from '../registry'

export const tasks = [notifyEmail, postExport, notifyWeb] as const

type TaskList = (typeof tasks)[number]

export type TaskId = TaskList['id']

export type TaskPayload<TId extends TaskId> = z.infer<
  Extract<TaskList, { id: TId }>['payload']
>

export function getTask(id: string): AnyTaskDefinition | undefined {
  return tasks.find((task) => task.id === id)
}
