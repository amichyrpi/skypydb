import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  ConstraintError,
  SchemaMismatchError,
  ValidationError,
} from "../errors";
import { InputValidator } from "../security/validation";
import type {
  CompiledFieldDefinition,
  CompiledSchema,
  CompiledTableDefinition,
  OptionalValueDefinition,
  RuntimeSchemaOptions,
  SchemaDefinition,
  TableIndexDefinition,
  ValueDefinition,
} from "./types";

const RESERVED_COLUMNS = new Set([
  "_id",
  "_createdAt",
  "_updatedAt",
  "_extras",
]);

type ExistingMetaRow = {
  table_name: string;
  table_signature: string;
};

function hash_text(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function is_optional(
  definition: ValueDefinition,
): definition is OptionalValueDefinition {
  return definition.kind === "optional";
}

function unwrap_optional(definition: ValueDefinition): {
  optional: boolean;
  base_definition: Exclude<ValueDefinition, OptionalValueDefinition>;
} {
  if (is_optional(definition)) {
    const nested = unwrap_optional(definition.inner);
    return {
      optional: true,
      base_definition: nested.base_definition,
    };
  }
  return {
    optional: false,
    base_definition: definition,
  };
}

function serialize_definition(definition: ValueDefinition): unknown {
  if (definition.kind === "optional") {
    return {
      kind: "optional",
      inner: serialize_definition(definition.inner),
    };
  }
  if (definition.kind === "object") {
    const entries = Object.entries(definition.shape).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    const serialized_shape: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      serialized_shape[key] = serialize_definition(value);
    }
    return {
      kind: "object",
      shape: serialized_shape,
    };
  }
  if (definition.kind === "id") {
    return {
      kind: "id",
      table: definition.table,
    };
  }
  return {
    kind: definition.kind,
  };
}

function sorted_indexes(
  indexes: TableIndexDefinition[],
): TableIndexDefinition[] {
  return [...indexes].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function table_signature(
  table_name: string,
  table: CompiledTableDefinition,
): string {
  const fields = [...table.fields.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((field) => ({
      name: field.name,
      optional: field.optional,
      definition: serialize_definition(field.definition),
    }));
  const indexes = sorted_indexes(table.indexes).map((index) => ({
    name: index.name,
    columns: [...index.columns],
  }));
  const canonical = JSON.stringify({
    table_name,
    fields,
    indexes,
  });
  return hash_text(canonical);
}

function sqlite_type_for_field(field: CompiledFieldDefinition): string {
  switch (field.base_definition.kind) {
    case "string":
    case "id":
    case "object":
      return "TEXT";
    case "number":
      return "REAL";
    case "boolean":
      return "INTEGER";
    default:
      return "TEXT";
  }
}

function create_table_sql(
  table_name: string,
  table: CompiledTableDefinition,
): string {
  const column_chunks: string[] = [
    "[_id] TEXT PRIMARY KEY",
    "[_createdAt] TEXT NOT NULL",
    "[_updatedAt] TEXT NOT NULL",
    "[_extras] TEXT",
  ];

  const foreign_keys: string[] = [];
  for (const field of table.fields.values()) {
    const base = field.base_definition;
    const nullable = field.optional ? "" : " NOT NULL";
    column_chunks.push(
      `[${field.name}] ${sqlite_type_for_field(field)}${nullable}`,
    );
    if (base.kind === "id") {
      foreign_keys.push(
        `FOREIGN KEY ([${field.name}]) REFERENCES [${base.table}]([_id]) ON DELETE RESTRICT ON UPDATE CASCADE`,
      );
    }
  }

  const all_chunks = [...column_chunks, ...foreign_keys];
  return `CREATE TABLE [${table_name}] (${all_chunks.join(", ")})`;
}

function create_indexes(
  connection: Database.Database,
  table_name: string,
  indexes: TableIndexDefinition[],
): void {
  for (const index of sorted_indexes(indexes)) {
    const validated_name = InputValidator.validate_table_name(index.name);
    const index_name = `idx_${table_name}_${validated_name}`;
    const columns_sql = index.columns.map((column) => `[${column}]`).join(", ");
    connection
      .prepare(
        `CREATE INDEX IF NOT EXISTS [${index_name}] ON [${table_name}] (${columns_sql})`,
      )
      .run();
  }
}

function table_exists(
  connection: Database.Database,
  table_name: string,
): boolean {
  const row = connection
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table_name);
  return row !== undefined;
}

function ensure_meta_tables(connection: Database.Database): void {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS _skypydb_schema_meta (
      table_name TEXT PRIMARY KEY,
      table_signature TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS _skypydb_schema_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_signature TEXT NOT NULL,
      managed_tables TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function existing_meta(connection: Database.Database): ExistingMetaRow[] {
  return connection
    .prepare("SELECT table_name, table_signature FROM _skypydb_schema_meta")
    .all() as ExistingMetaRow[];
}

function backup_database_file(db_path: string): string | null {
  if (!fs.existsSync(db_path)) {
    return null;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup_name = `reactive.backup-${timestamp}.db`;
  const backup_path = path.join(path.dirname(db_path), backup_name);
  fs.copyFileSync(db_path, backup_path);
  return backup_path;
}

function definition_has_valid_references(schema: CompiledSchema): void {
  for (const table of schema.tables.values()) {
    for (const field of table.fields.values()) {
      if (field.base_definition.kind !== "id") {
        continue;
      }
      if (!schema.tables.has(field.base_definition.table)) {
        throw new ValidationError(
          `Field '${table.name}.${field.name}' references unknown table '${field.base_definition.table}'.`,
        );
      }
    }
  }
}

export function compile_schema(schema: SchemaDefinition): CompiledSchema {
  const table_entries = Object.entries(schema.tables).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const compiled_tables = new Map<string, CompiledTableDefinition>();
  const table_signatures = new Map<string, string>();

  for (const [raw_table_name, table] of table_entries) {
    const table_name = InputValidator.validate_table_name(raw_table_name);
    const fields = new Map<string, CompiledFieldDefinition>();

    for (const [raw_field_name, definition] of Object.entries(table.fields)) {
      const field_name = InputValidator.validate_column_name(raw_field_name);
      if (RESERVED_COLUMNS.has(field_name)) {
        throw new ValidationError(
          `Field name '${field_name}' is reserved in table '${table_name}'.`,
        );
      }

      const unwrapped = unwrap_optional(definition);
      fields.set(field_name, {
        name: field_name,
        definition,
        optional: unwrapped.optional,
        base_definition: unwrapped.base_definition,
      });
    }

    const indexes = table.indexes.map((index) => {
      InputValidator.validate_table_name(index.name);
      if (index.columns.length === 0) {
        throw new ValidationError(
          `Index '${index.name}' on table '${table_name}' must contain at least one column.`,
        );
      }
      for (const column of index.columns) {
        const validated_column = InputValidator.validate_column_name(column);
        if (!fields.has(validated_column)) {
          throw new ValidationError(
            `Index '${index.name}' on table '${table_name}' references unknown column '${validated_column}'.`,
          );
        }
      }
      return {
        name: index.name,
        columns: [...index.columns],
      };
    });

    const compiled_table: CompiledTableDefinition = {
      name: table_name,
      fields,
      indexes,
    };
    compiled_tables.set(table_name, compiled_table);
    table_signatures.set(
      table_name,
      table_signature(table_name, compiled_table),
    );
  }

  const canonical_schema = JSON.stringify(
    [...table_signatures.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const compiled: CompiledSchema = {
    tables: compiled_tables,
    table_signatures,
    schema_signature: hash_text(canonical_schema),
  };

  definition_has_valid_references(compiled);
  return compiled;
}

function write_meta_state(
  connection: Database.Database,
  schema: CompiledSchema,
): void {
  const now = new Date().toISOString();

  const upsert_meta = connection.prepare(`
    INSERT INTO _skypydb_schema_meta (table_name, table_signature, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(table_name) DO UPDATE SET
      table_signature = excluded.table_signature,
      updated_at = excluded.updated_at
  `);

  for (const [table_name, signature] of schema.table_signatures.entries()) {
    upsert_meta.run(table_name, signature, now);
  }

  const table_names = [...schema.tables.keys()];
  if (table_names.length > 0) {
    const placeholders = table_names.map(() => "?").join(", ");
    connection
      .prepare(
        `DELETE FROM _skypydb_schema_meta WHERE table_name NOT IN (${placeholders})`,
      )
      .run(...table_names);
  } else {
    connection.prepare("DELETE FROM _skypydb_schema_meta").run();
  }

  connection
    .prepare(
      `
      INSERT INTO _skypydb_schema_state (id, schema_signature, managed_tables, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        schema_signature = excluded.schema_signature,
        managed_tables = excluded.managed_tables,
        updated_at = excluded.updated_at
      `,
    )
    .run(schema.schema_signature, JSON.stringify(table_names), now);
}

function mismatch_message(changed: string[], removed: string[]): string {
  const changed_text = changed.length > 0 ? changed.join(", ") : "none";
  const removed_text = removed.length > 0 ? removed.join(", ") : "none";
  return `Schema mismatch detected. Changed tables: ${changed_text}. Removed tables: ${removed_text}. Enable allowDestructiveSchemaChanges via callschemas({ allowDestructiveSchemaChanges: true }) to recreate managed tables with backup.`;
}

export function apply_schema(
  connection: Database.Database,
  compiled_schema: CompiledSchema,
  db_path: string,
  options: RuntimeSchemaOptions,
): void {
  ensure_meta_tables(connection);

  const existing = existing_meta(connection);
  const existing_signatures = new Map(
    existing.map((row) => [row.table_name, row.table_signature]),
  );
  const existing_tables = new Set(existing_signatures.keys());

  const desired_tables = new Set(compiled_schema.tables.keys());
  const changed_tables: string[] = [];
  const removed_tables: string[] = [];

  for (const [
    table_name,
    signature,
  ] of compiled_schema.table_signatures.entries()) {
    const existing_signature = existing_signatures.get(table_name);
    if (existing_signature === undefined) {
      changed_tables.push(table_name);
      continue;
    }
    if (existing_signature !== signature) {
      changed_tables.push(table_name);
      continue;
    }
    if (!table_exists(connection, table_name)) {
      changed_tables.push(table_name);
    }
  }

  for (const table_name of existing_tables) {
    if (!desired_tables.has(table_name)) {
      removed_tables.push(table_name);
    }
  }

  const has_existing_schema = existing.length > 0;
  const has_mismatch = changed_tables.length > 0 || removed_tables.length > 0;
  const allow_destructive = options.allowDestructiveSchemaChanges === true;

  if (has_existing_schema && has_mismatch && !allow_destructive) {
    throw new SchemaMismatchError(
      mismatch_message(changed_tables, removed_tables),
    );
  }

  if (has_existing_schema && has_mismatch && allow_destructive) {
    backup_database_file(db_path);
    connection.pragma("foreign_keys = OFF");
    try {
      for (const table_name of [...removed_tables, ...changed_tables]) {
        connection.prepare(`DROP TABLE IF EXISTS [${table_name}]`).run();
      }
    } finally {
      connection.pragma("foreign_keys = ON");
    }
  }

  for (const [table_name, table] of compiled_schema.tables.entries()) {
    if (!table_exists(connection, table_name)) {
      connection.prepare(create_table_sql(table_name, table)).run();
    }
    create_indexes(connection, table_name, table.indexes);
  }

  write_meta_state(connection, compiled_schema);
}

export function assert_table_exists(
  schema: CompiledSchema,
  table_name: string,
): CompiledTableDefinition {
  const validated = InputValidator.validate_table_name(table_name);
  const table = schema.tables.get(validated);
  if (!table) {
    throw new ConstraintError(`Unknown table '${validated}' in schema.`);
  }
  return table;
}
