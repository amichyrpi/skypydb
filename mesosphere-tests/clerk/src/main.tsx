import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { Mesosphereproviderwithclerkauth } from "mesosphere/reactwithclerk";
import { ReactClient } from "mesosphere/reactlibrary";

const mesosphere = new ReactClient(
  import.meta.env.VITE_MESOSPHERE_URL,
  import.meta.env.VITE_MESOSPHERE_API_KEY,
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider>
      <Mesosphereproviderwithclerkauth client={mesosphere} useAuth={useAuth}>
        <App />
      </Mesosphereproviderwithclerkauth>
    </ClerkProvider>
  </StrictMode>,
);
