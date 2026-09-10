import { z } from 'zod'
import { task } from '../registry'

export const notifyEmail = task({
  id: 'notify.email',

  payload: z.object({
    to: z.email(),
    subject: z.string().min(1),
    html: z.string().min(1),
  }),

  retryLimit: 5,
  retryDelay: 10,
  retryBackoff: true,

  async run(payload, context) {
    console.log({
      task: 'notify.email',
      jobId: context.job.id,
      to: payload.to,
      subject: payload.subject,
    })

    // TODO:
    // gunakan packages/email di sini

    console.log(`Sending email to ${payload.to}`)
  },
})
