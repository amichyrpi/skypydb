import { ValidationError } from "../errors";
import { InputValidator } from "../security/validation";
import { SCHEMA_MARKER, TABLE_MARKER } from "../relational/markers";
import type {
  SchemaDefinition,
  SchemaFieldMap,
  TableDefinition,
  TableIndexDefinition,
  ValueDefinition,
} from "../relational/types";

function is_value_definition(value: unknown): value is ValueDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

class TableBuilder implements TableDefinition {
  readonly [TABLE_MARKER] = true as const;
  readonly fields: SchemaFieldMap;
  readonly indexes: TableIndexDefinition[];

  constructor(fields: SchemaFieldMap, indexes: TableIndexDefinition[] = []) {
    this.fields = fields;
    this.indexes = indexes;
  }

  index(name: string, columns: string[]): TableDefinition {
    const index_name = InputValidator.validate_table_name(name);
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new ValidationError(
        `Index '${index_name}' requires at least one column.`,
      );
    }

    const normalized_columns = columns.map((column) =>
      InputValidator.validate_column_name(column),
    );
    return new TableBuilder(this.fields, [
      ...this.indexes,
      {
        name: index_name,
        columns: normalized_columns,
      },
    ]);
  }
}

export function defineTable(fields: SchemaFieldMap): TableDefinition {
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
    throw new ValidationError("defineTable requires a fields object.");
  }

  const normalized_fields: SchemaFieldMap = {};
  for (const [raw_field_name, definition] of Object.entries(fields)) {
    const field_name = InputValidator.validate_column_name(raw_field_name);
    if (!is_value_definition(definition)) {
      throw new ValidationError(
        `Field '${field_name}' must use value.*() definitions (string/number/boolean/id/object/optional).`,
      );
    }
    normalized_fields[field_name] = definition;
  }
  return new TableBuilder(normalized_fields);
}

export function defineSchema(
  tables: Record<string, TableDefinition>,
): SchemaDefinition {
  if (typeof tables !== "object" || tables === null || Array.isArray(tables)) {
    throw new ValidationError("defineSchema requires a tables object.");
  }

  const normalized_tables: Record<string, TableDefinition> = {};
  for (const [raw_table_name, definition] of Object.entries(tables)) {
    const table_name = InputValidator.validate_table_name(raw_table_name);
    if (
      typeof definition !== "object" ||
      definition === null ||
      !(TABLE_MARKER in definition)
    ) {
      throw new ValidationError(
        `Table '${table_name}' must be declared with defineTable(...).`,
      );
    }
    normalized_tables[table_name] = definition;
  }

  return {
    [SCHEMA_MARKER]: true,
    tables: normalized_tables,
  };
}
