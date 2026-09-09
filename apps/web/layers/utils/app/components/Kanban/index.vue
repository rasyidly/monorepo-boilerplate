<script setup lang="ts">
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus'

const columns = ref([{
  title: 'Backlog',
  icon: 'i-lucide-list-check',
  color: 'secondary' as const,
  tasks: [{
    title: 'Task 1'
  }, {
    title: 'Task 2'
  }, {
    title: 'Task 3'
  }, {
    title: 'Task 4'
  }]
}, {
  title: 'In Progress',
  icon: 'i-lucide-loader-2',
  color: 'warning' as const,
  tasks: [{
    title: 'Task 5'
  }, {
    title: 'Task 6'
  }, {
    title: 'Task 7'
  }, {
    title: 'Task 8'
  }]
}, {
  title: 'Done',
  icon: 'i-lucide-check-circle',
  color: 'success' as const,
  tasks: []
}])

async function onColumnDrop(event: DraggableEvent) {
  console.log('column drop', event)
}

async function onTaskDrop(event: DraggableEvent) {
  console.log('task drop', event)
}
</script>

<template>
  <VueDraggable
    v-model="columns"
    class="flex flex-row gap-4 sm:gap-6"
    handle=".handle"
    :animation="150"
    @end="onColumnDrop"
  >
    <UPageCard
      v-for="(column, columnIndex) in columns"
      :key="columnIndex"
      :title="column.title"
      :ui="{ container: 'p-2! lg:flex', body: 'flex w-full items-center gap-1' }"
      class="min-w-2xs bg-muted dark:bg-muted/30"
      variant="subtle"
    >
      <template #body>
        <UButton
          variant="ghost"
          class="handle cursor-move"
          icon="i-lucide-grip-vertical"
        />
        <UButton
          variant="ghost"
          :icon="column.icon"
          :label="column.title"
          :ui="{
            leadingIcon: `text-${column.color}`
          }"
        />
        <div class="grow" />
        <UButton
          variant="ghost"
          icon="i-lucide-ellipsis"
        />
      </template>
      <VueDraggable
        v-model="column.tasks"
        class="space-y-1 h-full"
        group="column"
        :animation="150"
        @end="onTaskDrop"
      >
        <UPageCard
          v-for="(item, taskIndex) in column.tasks"
          :key="taskIndex"
          :ui="{ container: 'p-4!' }"
          class="cursor-pointer"
        >
          {{ item.title }}
        </UPageCard>
      </VueDraggable>
    </UPageCard>
  </VueDraggable>
</template>
