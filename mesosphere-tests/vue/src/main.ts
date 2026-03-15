import { createApp } from "vue";
import { MesosphereProvider } from "mesosphere/vue";
import App from "./App.vue";
import "./style.css";

const app = createApp(App);

app.use(MesosphereProvider, {
  url: import.meta.env.VITE_MESOSPHERE_URL ?? "",
  api_url: import.meta.env.VITE_MESOSPHERE_API_KEY ?? "",
});

app.mount("#app");
