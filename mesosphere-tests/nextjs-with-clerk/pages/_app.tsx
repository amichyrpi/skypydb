import type { AppProps } from "next/app";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { Mesosphereproviderwithclerkauth } from "mesosphere/reactwithclerk";
import { ReactClient } from "mesosphere/reactlibrary";
import "../styles/globals.css";

const mesosphere = new ReactClient(
  process.env.NEXT_PUBLIC_MESOSPHERE_URL ?? "",
  process.env.NEXT_PUBLIC_MESOSPHERE_API_KEY ?? "",
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <Mesosphereproviderwithclerkauth client={mesosphere} useAuth={useAuth}>
        <Component {...pageProps} />
      </Mesosphereproviderwithclerkauth>
    </ClerkProvider>
  );
}
