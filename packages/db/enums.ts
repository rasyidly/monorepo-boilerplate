import { schema } from './schema'

type EnumValues<T extends keyof typeof schema.enums> = keyof typeof schema.enums[T]['values']

export interface EnumOption<T extends string | number = string> {
  value: T
  label: string
  description?: string
  icon?: string
  color?: "error" | "success" | "primary" | "secondary" | "info" | "warning" | "neutral" | undefined
}

export const PostStatus: EnumOption<EnumValues<'PostStatus'>>[] = [
  { value: 'DRAFT', label: 'Draft', color: 'neutral' },
  { value: 'PUBLISHED', label: 'Published', color: 'success' },
  { value: 'ARCHIVED', label: 'Archived', color: 'error' }
]

export const NotificationChannel: EnumOption<EnumValues<'NotificationChannel'>>[] = [
  { value: 'WEB', label: 'Web', icon: 'i-lucide-globe', color: 'info' },
  { value: 'EMAIL', label: 'Email', icon: 'i-lucide-mail', color: 'success' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: 'i-lucide-message-circle', color: 'success' }
]

export const MemberRole: EnumOption<'owner' | 'admin' | 'member'>[] = [
  { value: 'owner', label: 'Owner', color: 'warning' },
  { value: 'admin', label: 'Admin', color: 'primary' },
  { value: 'member', label: 'Member', color: 'neutral' }
]

export const InvitationStatus: EnumOption<'pending' | 'accepted' | 'rejected' | 'canceled' | 'expired'>[] = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'accepted', label: 'Accepted', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'canceled', label: 'Canceled', color: 'neutral' },
  { value: 'expired', label: 'Expired', color: 'neutral' }
]

export const LogModule: EnumOption<'access' | 'auth' | 'db' | 'email' | 'ai'>[] = [
  { value: 'access', label: 'Access', icon: 'i-lucide-door-open', color: 'warning' },
  { value: 'auth', label: 'Auth', icon: 'i-lucide-shield', color: 'primary' },
  { value: 'db', label: 'Database', icon: 'i-lucide-database', color: 'info' },
  { value: 'email', label: 'Email', icon: 'i-lucide-mail', color: 'success' },
  { value: 'ai', label: 'AI', icon: 'i-lucide-sparkles', color: 'primary' }
]

export const LogLevel: EnumOption<number>[] = [
  { value: 10, label: 'Trace', color: 'neutral' },
  { value: 20, label: 'Debug', color: 'neutral' },
  { value: 30, label: 'Info', color: 'info' },
  { value: 40, label: 'Warn', color: 'warning' },
  { value: 50, label: 'Error', color: 'error' },
  { value: 60, label: 'Fatal', color: 'error' }
]
