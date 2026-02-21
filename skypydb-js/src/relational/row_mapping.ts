import { ValidationError } from "../errors";
import { InputValidator } from "../security/validation";
import type { TableMigrationRule } from "./types";

const RESERVED_ROW_KEYS = new Set([
  "_id",
  "_createdAt",
  "_updatedAt",
  "_extras",
]);

export type NormalizedTableMigrationRule = {
  from?: string;
  field_map: Record<string, string>;
  defaults: Record<string, unknown>;
};

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize_mapping_dictionary(
  raw_mapping: unknown,
  kind: "fieldMap" | "defaults",
  target_table: string,
): Record<string, unknown> {
  if (raw_mapping === undefined) {
    return {};
  }
  if (!is_plain_object(raw_mapping)) {
    throw new ValidationError(
      `Migration rule '${target_table}.${kind}' must be an object.`,
    );
  }

  const normalized: Record<string, unknown> = {};
  for (const [raw_key, raw_value] of Object.entries(raw_mapping)) {
    const key = InputValidator.validate_column_name(raw_key);
    normalized[key] = raw_value;
  }
  return normalized;
}

export function normalize_table_migration_rule(
  target_table: string,
  rule: TableMigrationRule | undefined,
): NormalizedTableMigrationRule {
  if (rule === undefined) {
    return {
      field_map: {},
      defaults: {},
    };
  }
  if (!is_plain_object(rule)) {
    throw new ValidationError(
      `Migration rule for table '${target_table}' must be an object.`,
    );
  }

  const normalized_field_map_raw = normalize_mapping_dictionary(
    rule.fieldMap,
    "fieldMap",
    target_table,
  );
  const field_map: Record<string, string> = {};
  for (const [target_field, source_field] of Object.entries(
    normalized_field_map_raw,
  )) {
    if (typeof source_field !== "string") {
      throw new ValidationError(
        `Migration field map '${target_table}.${target_field}' must be a string source field name.`,
      );
    }
    field_map[target_field] = InputValidator.validate_column_name(source_field);
  }

  const defaults = normalize_mapping_dictionary(
    rule.defaults,
    "defaults",
    target_table,
  );

  let from: string | undefined;
  if (rule.from !== undefined) {
    if (typeof rule.from !== "string") {
      throw new ValidationError(
        `Migration rule '${target_table}.from' must be a table name string.`,
      );
    }
    from = InputValidator.validate_table_name(rule.from);
  }

  return {
    from,
    field_map,
    defaults,
  };
}

export function map_row_for_target(options: {
  source_row: Record<string, unknown>;
  source_extras?: Record<string, unknown>;
  target_fields: Iterable<string>;
  rule?: NormalizedTableMigrationRule;
}): Record<string, unknown> {
  const source_values: Record<string, unknown> = {};
  const source_extras = options.source_extras;
  if (is_plain_object(source_extras)) {
    for (const [key, value] of Object.entries(source_extras)) {
      source_values[key] = value;
    }
  }

  for (const [key, value] of Object.entries(options.source_row)) {
    if (key === "_extras" || RESERVED_ROW_KEYS.has(key)) {
      continue;
    }
    source_values[key] = value;
  }

  const normalized_rule = options.rule ?? {
    field_map: {},
    defaults: {},
  };

  const payload: Record<string, unknown> = {};
  const target_field_set = new Set<string>();

  for (const field_name of options.target_fields) {
    target_field_set.add(field_name);
    const mapped_source = normalized_rule.field_map[field_name] ?? field_name;
    if (
      Object.prototype.hasOwnProperty.call(source_values, mapped_source) &&
      source_values[mapped_source] !== undefined
    ) {
      payload[field_name] = source_values[mapped_source];
      continue;
    }
    if (
      Object.prototype.hasOwnProperty.call(normalized_rule.defaults, field_name)
    ) {
      payload[field_name] = normalized_rule.defaults[field_name];
    }
  }

  for (const [key, value] of Object.entries(source_values)) {
    if (RESERVED_ROW_KEYS.has(key) || target_field_set.has(key)) {
      continue;
    }
    payload[key] = value;
  }

  return payload;
}
