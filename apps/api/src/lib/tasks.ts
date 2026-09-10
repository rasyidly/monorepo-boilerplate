import { PgBoss } from 'pg-boss'
import { getTask, type TaskId, type TaskPayload } from '@repo/tasks'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const boss = new PgBoss({
  connectionString: DATABASE_URL,
  supervise: false,
  schedule: false,
  migrate: false,
})

let started = false

async function getBoss() {
  if (!started) {
    await boss.start()
    started = true
  }

  return boss
}

export async function enqueueTask<TId extends TaskId>(
  taskId: TId,
  payload: TaskPayload<TId>,
) {
  const definition = getTask(taskId)

  if (!definition) {
    throw new Error(`Unknown task: ${taskId}`)
  }

  const data = definition.payload.parse(payload)

  const queue = await getBoss()

  return queue.send(taskId, data)
}

export async function stopTasks() {
  if (!started) return

  await boss.stop({ graceful: true })
  started = false
}
