import type { Form } from '@nuxt/ui'
import type { TemplateRef } from 'vue'
import type { FetchContext } from 'ofetch'

export function handleError(error: unknown, form?: Readonly<TemplateRef>): void {
  const fetchError = error as FetchContext | undefined
  if (fetchError?.response?._data?.data?.message && form?.value) {
    const messages = typeof fetchError.response._data.data.message === 'string' ? JSON.parse(fetchError.response._data.data.message) : fetchError.response._data.data.message
    if (Array.isArray(messages)) {
      const errors = []
      for (const issue of messages) {
        if (issue.path && issue.path.length > 0) {
          errors.push({
            name: issue.path.join('.'),
            message: issue.message
          })
        }
      }
      (form.value as Form<unknown>)?.setErrors(errors)
      useToast().add({
        icon: 'i-lucide-alert-circle',
        title: errors[0]?.message || 'Validation error, please check the form fields',
        color: 'error'
      })
    } else {
      useToast().add({
        icon: 'i-lucide-alert-circle',
        title: (fetchError as { _data?: { message?: string } })._data?.message || (fetchError as { message?: string }).message || 'An unexpected error occurred',
        color: 'error'
      })
    }
  } else {
    useToast().add({
      icon: 'i-lucide-alert-circle',
      title: (fetchError as { _data?: { message?: string } })._data?.message || (fetchError as { message?: string }).message || 'An unexpected error occurred',
      color: 'error'
    })
  }
}
