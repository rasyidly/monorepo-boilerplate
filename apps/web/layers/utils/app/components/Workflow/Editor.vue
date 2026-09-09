<script lang="ts" setup>
import type { Node, Edge } from '@vue-flow/core'
import { Panel, VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { DropdownMenuItem } from '@nuxt/ui'
import { ulid } from 'ulid'

const { addNodes, onConnect, addEdges } = useVueFlow()

const nodes = defineModel<Node[]>('nodes', {
  default: () => []
})

const availableNodes: DropdownMenuItem[] = [{
  icon: 'i-lucide-play',
  label: 'Trigger Nodes',
  children: [{
    icon: 'i-lucide-alarm-check',
    label: 'On Absence Create',
    onSelect: () => addNodes({
      id: ulid(),
      type: 'trigger-on-absence-create',
      position: { x: 150, y: 150 }
    })
  }]
}, {
  icon: 'i-lucide-activity',
  label: 'Action Nodes',
  children: [{
    icon: 'i-lucide-globe',
    label: 'HTTP Request',
    onSelect: () => addNodes({
      id: ulid(),
      type: 'action-http-request',
      position: { x: 150, y: 150 }
    })
  }]
}]

const edges = defineModel<Edge[]>('edges', {
  default: () => []
})

onConnect(addEdges)
</script>

<template>
  <VueFlow
    v-model:nodes="nodes"
    :edges="edges"
    class="flex-1"
    fit-view-on-init
    snap-to-grid
  >
    <Background />
    <Panel position="top-left">
      <UDropdownMenu :items="availableNodes">
        <UButton
          label="Add node"
          variant="subtle"
          icon="i-lucide-plus"
        />
      </UDropdownMenu>
    </Panel>
    <template #node-trigger-on-absence-create="props">
      <WorkflowTriggerOnAbsenceCreate
        :id="props.id"
        :data="props.data"
      />
    </template>
    <template #node-action-http-request="props">
      <WorkflowActionHttpRequest
        :id="props.id"
        :data="props.data"
      />
    </template>
  </VueFlow>
</template>
