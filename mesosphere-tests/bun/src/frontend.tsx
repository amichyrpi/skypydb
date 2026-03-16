import React from "react";
import { createRoot } from "react-dom/client";
import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrarie";
import App from "./App";

declare global {
  interface Window {
    MESOSPHERE_URL?: string;
    MESOSPHERE_API_KEY?: string;
  }
}

const mesosphereUrl = window.MESOSPHERE_URL;
const mesosphereApiKey = window.MESOSPHERE_API_KEY;

if (!mesosphereUrl || !mesosphereApiKey) {
  throw new Error(
    "Missing required Mesosphere configuration: MESOSPHERE_URL and MESOSPHERE_API_KEY must be set on window",
  );
}

const mesosphere = new ReactClient(mesosphereUrl, mesosphereApiKey);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <React.StrictMode>
    <MesosphereProvider client={mesosphere}>
      <App />
    </MesosphereProvider>
  </React.StrictMode>,
);
