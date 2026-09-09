import { LazyConfirmationModal } from '#components'
import type { ButtonProps, ModalProps } from '@nuxt/ui'

type Action = {
  onConfirm?: ButtonProps['onClick']
  onCancel?: ButtonProps['onClick']
  modal?: ModalProps
  cancel?: ButtonProps
  confirm?: ButtonProps
  color?: ButtonProps['color']
  icon?: string
  title?: string
  description?: string
  slots?: {
    body(props?: object): unknown
  }
}

export function useConfirmation(props: Action) {
  const overlay = useOverlay()

  return overlay.create(LazyConfirmationModal, {
    props: {
      color: props.color || 'neutral',
      title: props.title || 'Are you sure?',
      description: props.description || 'This action cannot be undone.',
      icon: props.icon || 'i-lucide-alert-triangle',
      modal: {
        title: 'Confirm Action',
        ...props.modal
      },
      cancel: {
        label: 'Cancel',
        variant: 'subtle',
        onClick: props.onCancel,
        ...props.cancel
      },
      confirm: {
        onClick: props.onConfirm,
        label: 'Yes, continue',
        variant: 'solid',
        color: props.color || 'neutral',
        ...props.confirm
      },
      slots: props.slots
    },
    defaultOpen: true
  })
}
