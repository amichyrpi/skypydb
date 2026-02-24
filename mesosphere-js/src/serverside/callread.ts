import {
  MESOSPHERE_FUNCTION_ENDPOINT,
  type FunctionReference,
} from "./functionexporter";

type QueryClient = {
  functions: {
    call(endpoint: string, args?: Record<string, unknown>): Promise<unknown>;
  };
};

type EndpointReference = {
  [MESOSPHERE_FUNCTION_ENDPOINT]?: string;
  endpoint?: string;
};

function normalize_endpoint(reference: string | EndpointReference): string {
  const value =
    typeof reference === "string"
      ? reference
      : reference[MESOSPHERE_FUNCTION_ENDPOINT] ?? reference.endpoint;
  if (typeof value !== "string") {
    throw new Error("Function endpoint must be a non-empty string.");
  }
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
