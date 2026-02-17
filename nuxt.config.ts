// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
    appBaseUrl: process.env.APP_BASE_URL || '',
    public: {
      googleCalendarScope: process.env.NUXT_PUBLIC_GOOGLE_CALENDAR_SCOPE || 'https://www.googleapis.com/auth/calendar.events',
    },
  },
})
