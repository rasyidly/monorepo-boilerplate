import { PgBoss } from 'pg-boss'

import { type AnyTaskDefinition } from './registry'
import { tasks } from './tasks'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const boss = new PgBoss({
  connectionString: DATABASE_URL,
})

await boss.start()

for (const definition of tasks as readonly AnyTaskDefinition[]) {
  await boss.createQueue(definition.id, {
    retryLimit: definition.retryLimit,
    retryDelay: definition.retryDelay,
    retryBackoff: definition.retryBackoff,
  })

  await boss.work<object>(definition.id, async (jobs) => {
    for (const job of jobs) {
      const payload = definition.payload.parse(job.data)
      await definition.run(payload, {
        job,
        send: (id, data) => boss.send(id, data),
      })
    }
  })
}

console.log('Task worker started')
console.log('Registered queues:', tasks.map((task) => task.id).join(', '))

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`)

  await boss.stop({
    graceful: true,
  })

  process.exit(0)
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})
