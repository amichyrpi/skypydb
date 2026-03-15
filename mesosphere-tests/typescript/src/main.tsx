import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrarie";

const mesosphere = new ReactClient(
  import.meta.env.VITE_MESOSPHERE_URL,
  import.meta.env.VITE_MESOSPHERE_API_KEY,
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MesosphereProvider client={mesosphere}>
      <App />
    </MesosphereProvider>
  </StrictMode>,
);
