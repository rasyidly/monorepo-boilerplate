<script lang="ts" setup>
const { loggedIn, signOut } = useUserSession()
</script>

<template>
  <div class="h-screen flex flex-col lg:grid lg:grid-cols-2 justify-center gap-8 p-4 lg:p-8">
    <UCard
      class="max-lg:hidden flex justify-end relative"
      variant="subtle"
      :ui="{ body: 'mt-auto' }"
    >
      <div
        class="absolute inset-0 z-0"
        style="background-image: linear-gradient(to right, var(--ui-border-accented) 1px, transparent 1px), linear-gradient(to bottom, var(--ui-border-accented) 1px, transparent 1px); background-size: 20px 20px; background-position: 0 0, 0 0; mask-image: repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px), radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%); -webkit-mask-image: repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px), radial-gradient(ellipse 120% 80% at 10% 10%, #000 50%, transparent 90%); mask-composite: intersect; -webkit-mask-composite: source-in;"
      />
      <UPageHero
        title="Production-Ready Modern Monorepo Boilerplate"
        description="A pre-configured Turborepo template. Features Nuxt.js, ZenStack, and Shared UI packages. Includes full Tailwind CSS integration. Ships with automated ESLint, Prettier, and GitHub Actions."
        :ui="{ container: 'py-8!', wrapper: 'text-start', title: 'font-thin' }"
      />
    </UCard>
    <div class="relative h-full w-full flex flex-col justify-between gap-6">
      <div class="flex justify-between items-center gap-0.5">
        <div />
        <UColorModeButton />
      </div>
      <UPageCard
        class="w-full max-w-md mx-auto"
        :ui="{ container: 'lg:p-8!' }"
        variant="naked"
      >
        <slot />
      </UPageCard>
      <footer class="flex justify-between items-center gap-0.5">
        <div class="text-sm text-muted text-nowrap">
          &copy; 2026 Repo
        </div>
        <div class="grow" />
        <UButton
          v-if="loggedIn"
          variant="ghost"
          size="sm"
          class="w-min"
          label="Sign out"
          @click="signOut({
            onSuccess: () => {
              navigateTo('/auth/signin')
            }
          })"
        />
        <USelect
          model-value="English"
          icon="i-lucide-languages"
          :items="['English']"
          variant="ghost"
          size="sm"
          class="w-min"
        />
      </footer>
    </div>
  </div>
</template>
