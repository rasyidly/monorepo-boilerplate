import { useDateFormat, type UseDateFormatOptions } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { nextTick, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'

export function useEnum<T extends readonly { value?: string | number | boolean | null }[]>(
  enumArray: T,
  value: string | number | boolean | null
): T[number] | undefined {
  return enumArray.find(item => item.value === value)
}

export function useCopy(text: string): void {
  void navigator.clipboard.writeText(text)
  useToast().add({
    icon: 'i-lucide-check',
    title: 'Copied to clipboard'
  })
}

export function isPast(date: string): boolean {
  return new Date(date) < new Date()
}

export function formatCurrency(amount: string | number, options?: Intl.NumberFormatOptions): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(num)
}

export function formatDate(date?: string | Date | null, format: string = 'DD MMM YYYY', options?: UseDateFormatOptions): string | undefined {
  return date
    ? useDateFormat(date, format, {
      locales: 'id-ID',
      ...options
    }).value
    : undefined
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function hideText(text: string, visibleChars: number = 4, hideChar: string = '*'): string {
  const len = text.length
  if (len <= visibleChars * 2) return hideChar.repeat(len)
  return text.slice(0, visibleChars) + hideChar.repeat(len - visibleChars * 2) + text.slice(len - visibleChars)
}

export function flattenObject(obj: object, parentKey?: string): Record<string, unknown> {
  let result = {}
  Object.entries(obj).forEach(([key, value]) => {
    const _key = parentKey ? parentKey + '.' + key : key
    if (typeof value === 'object' && value !== null) {
      result = { ...result, ...flattenObject(value, _key) }
    } else {
      (result as Record<string, unknown>)[_key] = value
    }
  })
  return result
}

export function toArray<T>(item?: T | T[]): T[] {
  if (item === undefined) return []
  return Array.isArray(item) ? item : [item]
}

export function useRouteQueryArray<T extends (string | number)[] = string[]>(...props: Parameters<typeof useRouteQuery<string[]>>): Ref<T, T> {
  return useRouteQuery(props[0], props[1], {
    transform: toArray,
    ...props[2]
  }) as Ref<T, T>
}

export function useRouteQueryJSON<T extends object = Record<string, unknown>>(key: string, defaultValue: T = {} as T): Ref<T> {
  const raw = useRouteQuery(key)
  return computed<T>({
    get: () => {
      try {
        return raw.value && typeof raw.value === 'string' ? JSON.parse(raw.value) : defaultValue
      } catch {
        return defaultValue
      }
    },
    set: (val) => {
      raw.value = Object.keys(val ?? {}).length ? JSON.stringify(val) : ''
    }
  })
}

/**
 * URL-backed JSON state that is deeply reactive: mutate any nested property
 * (e.g. `state.value.filter = …` or `<component v-model="state.filter">`) and
 * the change propagates to the UI, the query refetch, and the URL.
 *
 * Unlike `useRouteQueryJSON` (a computed that parses a fresh object on every
 * read), this returns a Ref whose `.value` is a persistent reactive proxy,
 * so `v-model` on its members actually works.
 */
export function useRouteFilter<T extends object = Record<string, unknown>>(key: string, defaultValue: T = {} as T): Ref<T> {
  const raw = useRouteQueryJSON<T>(key, defaultValue)
  const state = ref(reactive<T>(raw.value ?? {})) as Ref<T>

  let syncing = false

  // URL → state (navigation, browser back/forward)
  watch(raw, (v) => {
    if (syncing) return
    const next = v ?? defaultValue
    if (JSON.stringify(next) !== JSON.stringify(state.value)) {
      state.value = reactive(next) as T
    }
  })

  // state → URL (any deep mutation)
  watch(state, (v) => {
    syncing = true
    raw.value = { ...v }
    nextTick(() => {
      syncing = false
    })
  }, { deep: true })

  return state
}

export function terbilang(number: number, suffix?: string): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']

  function toWords(n: number): string {
    let words
    if (n < 12) {
      words = satuan[n]!
    } else if (n < 20) {
      words = toWords(n - 10) + ' belas'
    } else if (n < 100) {
      words = toWords(Math.floor(n / 10)) + ' puluh ' + toWords(n % 10)
    } else if (n < 200) {
      words = 'seratus ' + toWords(n - 100)
    } else if (n < 1000) {
      words = toWords(Math.floor(n / 100)) + ' ratus ' + toWords(n % 100)
    } else if (n < 2000) {
      words = 'seribu ' + toWords(n - 1000)
    } else if (n < 1000000) {
      words = toWords(Math.floor(n / 1000)) + ' ribu ' + toWords(n % 1000)
    } else if (n < 1000000000) {
      words = toWords(Math.floor(n / 1000000)) + ' juta ' + toWords(n % 1000000)
    } else if (n < 1000000000000) {
      words = toWords(Math.floor(n / 1000000000)) + ' miliar ' + toWords(n % 1000000000)
    } else {
      words = toWords(Math.floor(n / 1000000000000)) + ' triliun ' + toWords(n % 1000000000000)
    }
    return words.trim()
  }

  if (number === 0) return 'nol' + (suffix ? ' ' + suffix : '')
  return toWords(number) + (suffix ? ' ' + suffix : '')
}
