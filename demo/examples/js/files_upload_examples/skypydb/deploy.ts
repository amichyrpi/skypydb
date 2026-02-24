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

import type { ApiFromFunction, FunctionExporter } from "skypydb/serverside";
import type { deploys } from "skypydb/functions";

import type * as users from "./users";
import type * as read from "./read";

declare const Api: ApiFromFunction<{
  users: typeof users;
  read: typeof read;
}>;

function createApi(path: string[] = []): unknown {
  return new Proxy(
    {},
    {
      get(_target, property: string | symbol) {
        if (property === "__skypydbReference") {
          return true;
        }
        if (property === "endpoint") {
          return path.join(".");
        }
        if (property === "toString") {
          return () => path.join(".");
        }
        if (property === Symbol.toPrimitive) {
          return () => path.join(".");
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
 *
 * Usage:
 * ```js
 * const uploadUrl = callwrite(api.users.createUploadUrl, client, {});
 * const saved = callwrite(api.users.sendImage, client, {
 *   storageId,
 *   author: "Theo",
 * });
 * ```
 */

/**
 * This is the API object that you can use to read from your database.
 *
 * Usage:
 * ```js
 * const messages = callread(api.read.readImageMessages, client, {});
 * const imageUrl = callread(api.read.getImageUrl, client, { storageId });
 * ```
 */
export const api = createApi() as deploys<
  typeof Api,
  FunctionExporter<any, "public">
>;
