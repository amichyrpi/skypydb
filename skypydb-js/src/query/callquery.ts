import { api } from "../relational/api_proxy";
import { callquery_runtime } from "../relational/runtime";

export { api };

export function callquery(reference: unknown, args?: unknown): unknown {
  return callquery_runtime(reference, args);
}
