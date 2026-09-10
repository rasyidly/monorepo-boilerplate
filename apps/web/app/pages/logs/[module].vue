<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { DataTableHeader, UBadge, UButton, RelativeTimeCard } from '#components'
import { useRouteQuery } from '@vueuse/router'
import { refDebounced, useCountdown, useDocumentVisibility } from '@vueuse/core'
import { LogLevel } from '@repo/db/enums'
import type { LogEntry } from '@repo/logger'

useHead({ title: 'Logs' })

const { public: { apiUrl: baseURL } } = useRuntimeConfig()
const route = useRoute()

const module = computed(() => route.params.module)
const date = useRouteQuery<string>('date', new Date().toISOString().substring(0, 10))
const search = useRouteQuery<string>('search', '')
const searchDebounced = refDebounced(search, 300)
const levels = useRouteQueryArray<string[]>('levels', LogLevel.map(level => String(level.value)))

const query = computed(() => ({
  module: module.value,
  date: date.value,
  levels: levels.value.length === LogLevel.length ? undefined : levels.value,
  search: searchDebounced.value.trim() || undefined
}))

const { data, pending, refresh } = useFetch<LogEntry[]>('/logs', {
  baseURL,
  query,
  credentials: 'include'
})

const entries = computed(() => data.value ?? [])

const visibility = useDocumentVisibility()
const countdown = useCountdown(10, {
  immediate: true,
  onComplete: () => {
    refresh()
    countdown.start()
  }
})

watch(visibility, state => state === 'visible' ? countdown.resume() : countdown.pause(), { immediate: true })

const columns: TableColumn<LogEntry>[] = [{
  accessorKey: 'time',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Time',
    icon: 'i-lucide-clock',
    noSort: true
  }),
  cell: ({ row }) => {
    const time = row.getValue('time') as number | undefined
    const date = typeof time === 'number' ? new Date(time) : null
    return h(RelativeTimeCard, {
      date,
      label: formatDate(date, 'HH:mm:ss.SSS')
    })
  }
}, {
  id: 'level',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Level',
    icon: 'i-lucide-signal',
    noSort: true
  }),
  cell: ({ row }) => h(UBadge, {
    ...LogLevel.find(level => level.value === row.original.level),
    variant: 'subtle',
    class: 'capitalize'
  })
}, {
  accessorKey: 'msg',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Message',
    icon: 'i-lucide-align-left',
    noSort: true
  }),
  cell: ({ row }) => h('span',
    { class: 'truncate' },
    [row.original.msg, (row.original.err as { message?: string } | undefined)?.message].filter(Boolean).join('. ')
  ),
  meta: { class: { td: '[&_span]:text-wrap [&_span]:line-clamp-2' } }
}, {
  id: 'actions',
  header: '',
  enableHiding: false,
  meta: {
    class: {
      td: 'text-right'
    }
  },
  cell: ({ row }) => h(UButton, {
    'color': 'neutral',
    'variant': 'ghost',
    'size': 'sm',
    'icon': 'i-lucide-copy',
    'aria-label': 'Copy log',
    'onClick': () => useCopy(JSON.stringify(row.original, null, 2))
  })
}]
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <UDashboardPanel
      id="logs-index"
      :ui="{ body: 'p-0!' }"
    >
      <template #header>
        <UDashboardNavbar title="Logs">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <div class="flex items-center gap-1.5 text-sm text-muted text-nowrap">
              <span class="size-1.5 animate-pulse rounded-full bg-success" />
              Refreshing in {{ countdown.remaining }}s
            </div>
          </template>
        </UDashboardNavbar>
        <UDashboardToolbar>
          <UInput
            v-model="date"
            type="date"
            leading
            icon="i-lucide-calendar-days"
            class="w-44"
          />
          <UInput
            v-model="search"
            placeholder="Search logs..."
            leading
            icon="i-lucide-search"
            clear
          />
          <USelectMenu
            v-model="levels"
            :items="LogLevel.map(level => ({ value: String(level.value), label: level.label }))"
            value-key="value"
            multiple
            icon="i-lucide-signal"
            :search-input="false"
            class="w-56"
            :content="{ align: 'end' }"
          />
        </UDashboardToolbar>
      </template>

      <template #body>
        <UTable
          :columns="columns"
          :data="entries"
          :loading="pending"
          sticky="header"
          class="flex-1"
          @select="(_e, row) => row.toggleExpanded()"
        >
          <template #expanded="{ row }">
            <pre
              class="max-h-80 overflow-auto break-all whitespace-pre-wrap rounded-md border border-default/60 bg-background p-3 font-mono text-xs leading-relaxed"
              @click.stop
            >{{ JSON.stringify(row.original, null, 2) }}</pre>
          </template>
        </UTable>
      </template>
    </UDashboardPanel>
  </div>
</template>
