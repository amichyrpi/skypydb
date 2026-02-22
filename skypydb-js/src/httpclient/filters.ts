import type { Metadata, WhereDocumentFilter, WhereFilter } from "../types";

type VectorRow = {
  id: string;
  document: string | null;
  metadata: Metadata | null;
};

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matches_where_document(
  document: string | null,
  where_document?: WhereDocumentFilter,
): boolean {
  if (!where_document) {
    return true;
  }

  const text = document ?? "";
  for (const [operator, value] of Object.entries(where_document)) {
    if (typeof value !== "string") {
      continue;
    }
    if (operator === "$contains" && !text.includes(value)) {
      return false;
    }
    if (operator === "$not_contains" && text.includes(value)) {
      return false;
    }
  }

  return true;
}

function matches_operator(
  metadata_value: unknown,
  operator: string,
  operator_value: unknown,
): boolean {
  if (operator === "$eq") {
    return metadata_value === operator_value;
  }
  if (operator === "$ne") {
    return metadata_value !== operator_value;
  }
  if (operator === "$gt") {
    return (
      typeof metadata_value === "number" &&
      typeof operator_value === "number" &&
      metadata_value > operator_value
    );
  }
  if (operator === "$gte") {
    return (
      typeof metadata_value === "number" &&
      typeof operator_value === "number" &&
      metadata_value >= operator_value
    );
  }
  if (operator === "$lt") {
    return (
      typeof metadata_value === "number" &&
      typeof operator_value === "number" &&
      metadata_value < operator_value
    );
  }
  if (operator === "$lte") {
    return (
      typeof metadata_value === "number" &&
      typeof operator_value === "number" &&
      metadata_value <= operator_value
    );
  }
  if (operator === "$in") {
    return (
      Array.isArray(operator_value) && operator_value.includes(metadata_value)
    );
  }
  if (operator === "$nin") {
    return (
      Array.isArray(operator_value) && !operator_value.includes(metadata_value)
    );
  }
  return metadata_value === operator_value;
}

function matches_where(
  metadata: Metadata | null,
  where?: WhereFilter,
): boolean {
  if (!where) {
    return true;
  }

  const values = metadata ?? {};
  for (const [key, value] of Object.entries(where)) {
    if (key === "$and") {
      if (!Array.isArray(value)) {
        return false;
      }
      if (
        !value.every((entry) => matches_where(values, entry as WhereFilter))
      ) {
        return false;
      }
      continue;
    }

    if (key === "$or") {
      if (!Array.isArray(value)) {
        return false;
      }
      if (!value.some((entry) => matches_where(values, entry as WhereFilter))) {
        return false;
      }
      continue;
    }

    const metadata_value = values[key];
    if (is_plain_object(value)) {
      for (const [operator, operator_value] of Object.entries(value)) {
        if (!matches_operator(metadata_value, operator, operator_value)) {
          return false;
        }
      }
      continue;
    }

    if (metadata_value !== value) {
      return false;
    }
  }

  return true;
}

export function matches_vector_filters(
  row: VectorRow,
  where?: WhereFilter,
  where_document?: WhereDocumentFilter,
): boolean {
  return (
    matches_where(row.metadata, where) &&
    matches_where_document(row.document, where_document)
  );
}

export function apply_paging<T>(
  items: T[],
  limit?: number,
  offset?: number,
): T[] {
  const start = Math.max(0, offset ?? 0);
  if (limit === undefined) {
    return items.slice(start);
  }
  return items.slice(start, start + Math.max(0, limit));
}
