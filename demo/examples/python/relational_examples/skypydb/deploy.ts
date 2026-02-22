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

import { ApiFromFunction, FunctionExporter } from "skypydb/serverside";
import { deploys } from "skypydb/functions";

import type * as users from "./users";
import type * as read from "./read";

declare const Api: ApiFromFunction<{
  users: typeof users;
  read: typeof read;
}>;

/**
 * This is the API object that you can use to write data to your database.
 *
 * Usage:
 * ```js
 * const writer = callwrite(api.users.createUser);
 * function handleButtonPress() {
 *   // Write data to the database
 *   write({ name: "Theo", email: "theo@example.com" });
 *   // Or use the result once the mutation has completed
 *   write({ name: "Theo", email: "theo@example.com" }).then((result) =>
 *     console.log(result),
 *   );
 * }
 * ```
 */

/**
 * This is the API object that you can use to read from your database.
 *
 * Usage:
 * ```js
 * const reader = callread(api.read.readDatabase, {
 *   name: "Theo",
 *   email: "theo@example.com",
 * });
 * ```
 */
export declare const api: deploys<typeof Api, FunctionExporter<any, "public">>;
