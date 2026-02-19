import { ValidationError } from "../errors";
import { API_REF_MARKER } from "./markers";
import type { ApiReference } from "./types";

function create_reference(path_parts: string[]): ApiReference {
  return { [API_REF_MARKER]: path_parts } as ApiReference;
}

function create_proxy(path_parts: string[] = []): unknown {
  const reference = create_reference(path_parts);
  return new Proxy(reference as Record<string | symbol, unknown>, {
    get: (_target, property: string | symbol) => {
      if (property === API_REF_MARKER) {
        return path_parts;
      }
      if (property === "toString") {
        return () => `api.${path_parts.join(".")}`;
      }
      if (property === Symbol.toPrimitive) {
        return () => `api.${path_parts.join(".")}`;
      }
      if (typeof property === "symbol") {
        return undefined;
      }
      return create_proxy([...path_parts, property]);
    },
  });
}

export const api = create_proxy();

export function is_api_reference(value: unknown): value is ApiReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return API_REF_MARKER in value;
}

export function endpoint_from_reference(value: unknown): string {
  if (!is_api_reference(value)) {
    throw new ValidationError(
      "Expected an API reference like api.module.function for callquery/callmutation.",
    );
  }
  const parts = value[API_REF_MARKER];
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new ValidationError(
      "API reference is empty. Use a concrete endpoint like api.tasks.createTask.",
    );
  }
  return parts.join(".");
}
