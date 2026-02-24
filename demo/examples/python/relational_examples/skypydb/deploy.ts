/* This file is used to deploy your database functions to the server (cloud or self-hosted)
 * You can deploy your database functions by running the following command in your terminal:
 *
 * ```bash
 * npx skypydb deploy
 * ```
 *
 * Do not modify this file manually, otherwise your functions will no longer work.
 * This file is automatically created and updated when you run the deploy command.
 */

import {
  SKYPYDB_FUNCTION_ENDPOINT,
  SKYPYDB_FUNCTION_REFERENCE,
  SKYPYDB_FUNCTION_TO_STRING,
} from "skypydb/serverside";
import type { ApiFromFunction, FunctionExporter } from "skypydb/serverside";
import type { deploys } from "skypydb/functions";

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
      [SKYPYDB_FUNCTION_TO_STRING]: toEndpoint,
    },
    {
      get(target, property: string | symbol) {
        if (property === SKYPYDB_FUNCTION_REFERENCE) {
          return true;
        }
        if (property === SKYPYDB_FUNCTION_ENDPOINT) {
          return toEndpoint();
        }
        if (property === SKYPYDB_FUNCTION_TO_STRING) {
          return target[SKYPYDB_FUNCTION_TO_STRING];
        }
        if (property === Symbol.toPrimitive) {
          return target[SKYPYDB_FUNCTION_TO_STRING];
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
