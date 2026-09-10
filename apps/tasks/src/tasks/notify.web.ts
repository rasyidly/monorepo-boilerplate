import { z } from 'zod'
import { zenstack } from '@repo/db'
import { task } from '../registry'

export const notifyWeb = task({
  id: 'notify.web',

  payload: z.object({
    userId: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    icon: z.string().optional(),
    color: z.enum(['success', 'error', 'warning', 'info', 'neutral']).optional(),
    url: z.string().optional(),
  }),

  retryLimit: 3,
  retryDelay: 10,
  retryBackoff: true,

  async run(payload, context) {
    console.log({
      task: 'notify.web',
      jobId: context.job.id,
      userId: payload.userId,
      title: payload.title,
    })

    await zenstack.notification.create({
      data: {
        userId: payload.userId,
        channels: ['WEB'],
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        color: payload.color,
        url: payload.url,
      },
    })
  },
})
