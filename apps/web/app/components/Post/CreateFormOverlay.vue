<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Post } from '@repo/db/schema'
import { PostStatus } from '@repo/db/enums'

const { client, zod } = useDbClient()
const authClient = useAuthClient()
const { user } = useUserSession()
const activeOrganization = authClient?.useActiveOrganization()
const form = useTemplateRef('form')
const toast = useToast()
const open = ref(false)

const schema = z.object({
  ...zod.makeModelSchema('Post', {
    select: {
      title: true,
      content: true,
      excerpt: true,
      status: true,
      publishedAt: true
    }
  }).shape,
  publishedAt: z.string()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  status: 'DRAFT',
  publishedAt: formatDate(new Date(), 'YYYY-MM-DD HH:mm')
})

const createPost = client.post.useCreate()

const emit = defineEmits<{
  afterCreate: [post: Post]
}>()

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const post = await createPost.mutateAsync({
      data: {
        ...payload.data,
        publishedAt: new Date(state.publishedAt || ''),
        authorId: user.value?.id,
        organizationId: activeOrganization?.value?.data?.id ?? undefined
      }
    })

    toast.add({
      description: 'Post created successfully'
    })

    open.value = false
    emit('afterCreate', post)
  } catch (error) {
    handleError(error, form)
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="New Post"
  >
    <slot />
    <template #body>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <UPageCard
            title="Post Information"
            variant="naked"
            :ui="{ title: 'text-sm font-normal', container: 'gap-2' }"
          >
            <UFormField
              label="Title"
              name="title"
              required
            >
              <UInput
                v-model="state.title"
                placeholder="Post title"
                required
              />
            </UFormField>
            <UFormField
              label="Content"
              name="content"
              required
            >
              <UTextarea
                v-model="state.content"
                placeholder="Write the post content…"
                :rows="6"
                required
              />
            </UFormField>
            <UFormField
              label="Excerpt"
              name="excerpt"
            >
              <UTextarea
                v-model.nullable="state.excerpt"
                :rows="2"
              />
            </UFormField>
          </UPageCard>

          <UPageCard
            title="Publication"
            description="Controls the status and publish date of this post."
            variant="naked"
            :ui="{ title: 'text-sm font-normal', container: 'gap-2' }"
          >
            <div class="grid grid-cols-2 gap-4">
              <UFormField
                label="Status"
                name="status"
              >
                <USelectMenu
                  v-model="state.status"
                  :items="PostStatus"
                  value-key="value"
                  label-key="label"
                  placeholder="Select status"
                />
              </UFormField>
              <UFormField
                label="Published at"
                name="publishedAt"
              >
                <UInput
                  v-model="state.publishedAt"
                  type="datetime-local"
                />
              </UFormField>
            </div>
          </UPageCard>
        </div>
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton
        variant="soft"
        label="Cancel"
        @click="close"
      />
      <div class="grow" />
      <UButton
        loading-auto
        label="Create Post"
        icon="i-lucide-check"
        @click="form?.submit()"
      />
    </template>
  </USlideover>
</template>
