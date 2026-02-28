/* This file is used to deploy your database functions to the server (cloud or self-hosted)
 * You can deploy your database functions by running the following command in your terminal:
 *
 * ```bash
 * npx mesosphere dev
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
import type {
  ApiFromFunction,
  FunctionExporter,
  deploys,
} from "mesosphere/serverside";

import type * as messages from "./messages";

declare const Api: ApiFromFunction<{
  messages: typeof messages;
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
 * This is the API object that you can use to write data to your database.
 */

/**
 * This is the API object that you can use to read from your database.
 */
export const api = createApi() as deploys<
  typeof Api,
  FunctionExporter<any, "public">
>;
