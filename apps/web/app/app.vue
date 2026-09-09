<script setup lang="ts">
const title = 'Production-Ready Modern Monorepo Boilerplate'
const description = 'A pre-configured Turborepo template. Features Nuxt.js, ZenStack, and Shared UI packages. Includes full Tailwind CSS integration. Ships with automated ESLint, Prettier, and GitHub Actions.'

const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  titleTemplate: chunk => chunk ? `${chunk} - ${title}` : title,
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp :tooltip="{ delayDuration: 0 }">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
