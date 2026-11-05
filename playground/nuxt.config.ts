export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2024-08-08',

  modules: ['../src/module'],

  umami: {
    enabled: true,
    host: 'https://savory.ijkml.dev/',
    id: '94c6eb8c-646d-41ff-8b5b-a924ce2b4111',
    ignoreLocalhost: false,
    autoTrack: true,
    useDirective: true,
    customEndpoint: null,
    logErrors: true,
    domains: null,
    proxy: 'cloak',
    tag: 'gondor',
    urlOptions: {
      excludeHash: false,
      excludeSearch: false,
      trailingSlash: 'always',
    },
    // Tracker extras (optional):
    // distinctId: 'playground-user',
    // doNotTrack: true,
    // performance: true,
    // errors: true,
    // release: 'playground@dev',
    // environment: 'development',
    // beforeSend: 'umamiBeforeSend',
    // Server-only Read API (also NUXT_UMAMI_API_URL / NUXT_UMAMI_API_KEY):
    // apiUrl: 'https://savory.ijkml.dev',
    // apiKey: 'umami_xxxxxxxx',
  },

  appConfig: {
    shareUrl: 'https://savory.ijkml.dev/share/xj2RHnDuAD8khsui/localhost',
  },

  css: ['@/assets/reset.css'],
});
