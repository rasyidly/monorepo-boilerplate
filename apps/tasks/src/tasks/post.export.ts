import { z } from 'zod'
import { zenstack } from '@repo/db'
import * as storage from '@repo/storage'
import { task } from '../registry'

export const postExport = task({
  id: 'post.export',

  payload: z.object({
    userId: z.string().min(1),
    organizationId: z.string().optional(),
  }),

  retryLimit: 3,
  retryDelay: 10,
  retryBackoff: true,

  async run(payload, context) {
    try {
      const posts = await zenstack.post.findMany({
        where: payload.organizationId ? { organizationId: payload.organizationId } : {},
        orderBy: { createdAt: 'desc' },
      })

      const file = new File(
        [JSON.stringify(posts, null, 2)],
        `posts-${Date.now()}.json`,
        { type: 'application/json' },
      )
      const { key, size } = await storage.upload({
        scope: payload.userId,
        file,
      })

      await context.send('notify.web', {
        userId: payload.userId,
        title: 'Post export completed',
        body: `${posts.length} ${posts.length === 1 ? 'post' : 'posts'} exported (${size} bytes).`,
        icon: 'i-lucide-file-json',
        color: 'success',
        url: `/storage/objects/${key}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.'

      console.error({
        task: 'post.export',
        jobId: context.job.id,
        userId: payload.userId,
        err: error,
      })

      try {
        await context.send('notify.web', {
          userId: payload.userId,
          title: 'Post export failed',
          body: message,
          icon: 'i-lucide-alert-triangle',
          color: 'error',
        })
      } catch (sendError) {
        console.error({
          task: 'post.export',
          jobId: context.job.id,
          message: 'failed to enqueue failure notification',
          err: sendError,
        })
      }
    }
  },
})
