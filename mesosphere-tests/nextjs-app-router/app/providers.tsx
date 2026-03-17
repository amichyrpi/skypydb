"use client";

import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrary";
import type { PropsWithChildren } from "react";

const mesosphere = new ReactClient(
  process.env.NEXT_PUBLIC_MESOSPHERE_URL ?? "",
  process.env.NEXT_PUBLIC_MESOSPHERE_API_KEY ?? "",
);

export default function Providers({ children }: PropsWithChildren) {
  return (
    <MesosphereProvider client={mesosphere}>{children}</MesosphereProvider>
  );
}
