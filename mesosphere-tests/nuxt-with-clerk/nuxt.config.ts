export default defineNuxtConfig({
  compatibilityDate: "2026-03-03",
  devtools: { enabled: true },
  mesosphere: {
    url: process.env.MESOSPHERE_URL,
    api_key: process.env.MESOSPHERE_API_KEY,
  },
  runtimeConfig: {
    public: {
      mesosphereUrl: process.env.MESOSPHERE_URL,
      mesosphereApiKey: process.env.MESOSPHERE_API_KEY,
      clerkPublishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
  },
});
