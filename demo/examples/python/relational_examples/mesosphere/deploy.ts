/* This file is used to deploy your database functions to the server (cloud or self-hosted)
 * You can deploy your database functions by running the following command in your terminal:
 *
 * ```bash
 * npx mesosphere deploy
 * ```
 *
 * Do not modify this file manually, otherwise your functions will no longer work.
 * This file is automatically created and updated when you run the deploy command.
 */

import {
  MESOSPHERE_FUNCTION_ENDPOINT,
  MESOSPHERE_FUNCTION_REFERENCE,
  MESOSPHERE_FUNCTION_TO_STRING,
} from "mesosphere/serverside";
import type { ApiFromFunction, FunctionExporter } from "mesosphere/serverside";
import type { deploys } from "mesosphere/functions";

import type * as read from "./read";
import type * as users from "./users";

declare const Api: ApiFromFunction<{
  read: typeof read;
  users: typeof users;
}>;

function createApi(path: string[] = []): unknown {
  const toEndpoint = () => path.join(".");
  return new Proxy(
    {
      [MESOSPHERE_FUNCTION_TO_STRING]: toEndpoint,
    },
    {
      get(target, property: string | symbol) {
        if (property === MESOSPHERE_FUNCTION_REFERENCE) {
          return true;
        }
        if (property === MESOSPHERE_FUNCTION_ENDPOINT) {
          return toEndpoint();
        }
        if (property === MESOSPHERE_FUNCTION_TO_STRING) {
          return target[MESOSPHERE_FUNCTION_TO_STRING];
        }
        if (property === Symbol.toPrimitive) {
          return target[MESOSPHERE_FUNCTION_TO_STRING];
        }
        if (typeof property !== "string") {
          return undefined;
        }
        return createApi([...path, property]);
      },
    },
  );
}

/**
 * API object for deployed functions, including both read and write modules.
 */
export const api = createApi() as deploys<
  typeof Api,
  FunctionExporter<any, "public">
>;
