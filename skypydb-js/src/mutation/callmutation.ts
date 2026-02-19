import { api } from "../relational/api_proxy";
import { callmutation_runtime } from "../relational/runtime";

export { api };

export function callmutation(reference: unknown): (args?: unknown) => unknown;
export function callmutation(reference: unknown, args: unknown): unknown;
export function callmutation(reference: unknown, args?: unknown): unknown {
  if (arguments.length >= 2) {
    return callmutation_runtime(reference, args);
  }

  return (next_args?: unknown): unknown =>
    callmutation_runtime(reference, next_args);
}
