import type { AppProps } from "next/app";
import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrarie";
import "../styles/globals.css";

const mesosphere = new ReactClient(
  process.env.NEXT_PUBLIC_MESOSPHERE_URL ?? "",
  process.env.NEXT_PUBLIC_MESOSPHERE_API_KEY ?? "",
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MesosphereProvider client={mesosphere}>
      <Component {...pageProps} />
    </MesosphereProvider>
  );
}
