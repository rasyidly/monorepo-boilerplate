import { defineClientAuth } from '@onmax/nuxt-better-auth/config'
import { organizationClient, twoFactorClient, adminClient } from 'better-auth/client/plugins'

export default defineClientAuth({
  baseURL: process.env.API_URL || 'http://localhost:8000',
  basePath: '/auth',
  plugins: [
    organizationClient(),
    adminClient(),
    twoFactorClient()
  ]
})
