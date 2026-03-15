import { MesosphereProvider } from "mesosphere/vue";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  nuxtApp.vueApp.use(MesosphereProvider, {
    url: config.public.mesosphereUrl ?? "",
    api_url: config.public.mesosphereApiKey ?? "",
  });
});
