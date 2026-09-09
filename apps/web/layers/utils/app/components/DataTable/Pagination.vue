<script setup lang="ts">
const page = defineModel<number>('page', { default: 1 })
const limit = defineModel<number>('limit', { default: 50 })

const props = withDefaults(defineProps<{
  total?: number
  limitOptions?: number[]
}>(), {
  total: 0,
  limitOptions: () => [50, 100, 250, 500]
})

const currentPage = computed(() => Math.max(1, page.value ?? 1))
const totalPages = computed(() => Math.ceil((props.total || 0) / (limit.value ?? 50)) || 1)
</script>

<template>
  <UDashboardToolbar>
    <UButton
      v-if="currentPage > 1"
      size="sm"
      icon="i-lucide-arrow-left"
      variant="outline"
      @click="page = currentPage - 1"
    />
    <div class="text-xs text-muted">
      Page
    </div>
    <USelectMenu
      v-model="page"
      :items="Array.from({ length: totalPages }, (_, i) => Number(i + 1))"
      class="w-fit"
      size="sm"
    />
    <div class="text-xs text-muted text-nowrap">
      from {{ totalPages }}
    </div>
    <UButton
      v-if="currentPage < totalPages"
      size="sm"
      icon="i-lucide-arrow-right"
      variant="outline"
      @click="page = currentPage + 1"
    />
    <div class="grow" />
    <span class="text-xs text-muted text-nowrap">
      Total {{ total.toLocaleString('id-ID') }} records
    </span>
    <USelect
      v-model="limit"
      :items="limitOptions"
      placeholder="Rows per page"
      size="sm"
      class="w-fit"
      :ui="{ base: 'text-nowrap pe-2.5', trailing: 'hidden' }"
    >
      <template #default="{ modelValue }">
        {{ modelValue }} records
      </template>
    </USelect>
  </UDashboardToolbar>
</template>
