// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@comark/nuxt',
    '@vueuse/nuxt',
    '@onmax/nuxt-better-auth',
    '@pinia/nuxt',
    '@pinia/colada-nuxt'
  ],

  ssr: false,

  devtools: {
    enabled: false
  },

  app: {
    layoutTransition: { name: 'fade', mode: 'out-in' },
    pageTransition: { name: 'fade', mode: 'out-in' }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:8000'
    }
  },

  routeRules: {
    '/': { redirect: '/core' },
    '/logs': { redirect: '/logs/access' },
    '/auth': { redirect: '/auth/signin' },
    '/core/**': { auth: { only: 'user', redirectTo: '/auth/signin' } },
    '/logs/**': { auth: { only: 'user', redirectTo: '/auth/signin' } },
    '/storage/**': { auth: { only: 'user', redirectTo: '/auth/signin' } },
    '/auth/accept-invitation': { auth: { only: 'user', redirectTo: '/core' } },
    '/auth/**': { auth: { only: 'guest', redirectTo: '/core' } }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'bun',
    experimental: {
      tasks: true
    }
  },

  auth: {
    clientOnly: true,
    redirects: {
      login: '/auth/signin',
      authenticated: '/core'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    families: [{
      name: 'Geist',
      provider: 'google'
    }]
  },

  icon: {
    customCollections: [{
      prefix: 'custom',
      dir: './app/assets/icons'
    }]
  }
})
