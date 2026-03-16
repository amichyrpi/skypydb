import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { MesosphereProvider, ReactClient } from "mesosphere/reactlibrarie";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const MESOSPHERE_URL = (import.meta as any).env.VITE_MESOSPHERE_URL as string;
  const MESOSPHERE_API_KEY = (import.meta as any).env
    .VITE_MESOSPHERE_API_KEY as string;

  if (!MESOSPHERE_URL) {
    throw new Error("missing envar VITE_MESOSPHERE_URL");
  }
  if (!MESOSPHERE_API_KEY) {
    throw new Error("missing envar VITE_MESOSPHERE_API_KEY");
  }

  const mesosphere = new ReactClient(MESOSPHERE_URL, MESOSPHERE_API_KEY);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: mesosphere.hashFn(),
        queryFn: mesosphere.queryFn(),
      },
    },
  });
  mesosphere.connect(queryClient);

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: "intent",
      context: { queryClient },
      scrollRestoration: true,
      Wrap: ({ children }) => (
        <MesosphereProvider client={mesosphere.mesosphereClient}>
          {children}
        </MesosphereProvider>
      ),
    }),
    queryClient,
  );

  return router;
}
