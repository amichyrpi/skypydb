import type { FunctionReference } from "./functionexporter";

type QueryClient = {
  functions: {
    call(endpoint: string, args?: Record<string, unknown>): Promise<unknown>;
  };
};

function normalize_endpoint(reference: string | { endpoint: string }): string {
  const value = typeof reference === "string" ? reference : reference.endpoint;
  const normalized = value.trim().replace(/:/g, ".");
  if (normalized.length === 0) {
    throw new Error("Function endpoint must be a non-empty string.");
  }
  return normalized;
}

export async function callread<TArgs extends Record<string, unknown>, TResult>(
  reference: FunctionReference<TArgs, TResult, "query"> | string,
  client: QueryClient,
  args: TArgs,
): Promise<TResult> {
  const endpoint = normalize_endpoint(reference);
  return (await client.functions.call(endpoint, args)) as TResult;
}
