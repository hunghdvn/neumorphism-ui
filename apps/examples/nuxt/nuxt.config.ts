export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  modules: ['@neu-ui/ssr/nuxt'],
  css: ['@neu-ui/tokens/neu.css'],
  app: {
    head: {
      title: 'neu-ui SSR gate (Nuxt)',
      htmlAttrs: { lang: 'en', 'data-neu-theme': 'light' },
      link: [{ rel: 'icon', href: 'data:,' }],
    },
  },
});
