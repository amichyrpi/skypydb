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
import {
  map_row_for_target,
  normalize_table_migration_rule,
  type NormalizedTableMigrationRule,
} from "./row_mapping";
import type {
  CompiledFieldDefinition,
  CompiledSchema,
  CompiledTableDefinition,
  OptionalValueDefinition,
  RuntimeSchemaOptions,
  SchemaDefinition,
  TableMigrationRule,
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

type MigrationAction = {
  target_name: string;
  target_table: CompiledTableDefinition;
  source_name?: string;
  rule: NormalizedTableMigrationRule;
};

type MigrationPlan = {
  actions: MigrationAction[];
  removed_managed_tables: string[];
  has_changes: boolean;
};

type PreparedMigrationRecord = {
  values: Record<string, unknown>;
  extras: Record<string, unknown>;
};

type TableColumnInfo = {
  name: string;
};

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function list_physical_tables(connection: Database.Database): Set<string> {
  const rows = connection
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as Array<{ name: string }>;
  return new Set(rows.map((row) => String(row.name)));
}

function list_table_columns(
  connection: Database.Database,
  table_name: string,
): string[] {
  const rows = connection
    .prepare(`PRAGMA table_info([${table_name}])`)
    .all() as TableColumnInfo[];
  return rows.map((row) => String(row.name));
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

function validate_migration_rules(
  schema: CompiledSchema,
  options: RuntimeSchemaOptions,
): Map<string, NormalizedTableMigrationRule> {
  const raw_rules = options.migrations?.tables ?? {};
  if (!is_plain_object(raw_rules)) {
    throw new ValidationError(
      "callschemas().migrations.tables must be an object.",
    );
  }

  const normalized = new Map<string, NormalizedTableMigrationRule>();
  for (const [raw_target, raw_rule] of Object.entries(raw_rules)) {
    const target_name = InputValidator.validate_table_name(raw_target);
    if (!schema.tables.has(target_name)) {
      throw new SchemaMismatchError(
        `Migration rule references unknown target table '${target_name}'.`,
      );
    }
    normalized.set(
      target_name,
      normalize_table_migration_rule(
        target_name,
        raw_rule as TableMigrationRule | undefined,
      ),
    );
  }
  return normalized;
}

function build_migration_plan(
  connection: Database.Database,
  compiled_schema: CompiledSchema,
  options: RuntimeSchemaOptions,
  existing_signatures: Map<string, string>,
): MigrationPlan {
  const migration_rules = validate_migration_rules(compiled_schema, options);
  const physical_tables = list_physical_tables(connection);

  const desired_tables = new Set(compiled_schema.tables.keys());
  const removed_managed_tables = [...existing_signatures.keys()].filter(
    (table_name) => !desired_tables.has(table_name),
  );

  const unchanged_tables = new Set<string>();
  for (const [table_name, signature] of compiled_schema.table_signatures) {
    const existing_signature = existing_signatures.get(table_name);
    if (existing_signature === signature && physical_tables.has(table_name)) {
      unchanged_tables.add(table_name);
    }
  }

  const source_to_target = new Map<string, string>();
  const actions: MigrationAction[] = [];

  for (const [target_name, target_table] of compiled_schema.tables.entries()) {
    const target_signature = compiled_schema.table_signatures.get(target_name);
    const existing_signature = existing_signatures.get(target_name);
    const target_exists = physical_tables.has(target_name);
    const unchanged =
      existing_signature !== undefined &&
      target_signature !== undefined &&
      existing_signature === target_signature &&
      target_exists;

    const rule = migration_rules.get(target_name) ?? {
      field_map: {},
      defaults: {},
    };

    if (unchanged) {
      if (migration_rules.has(target_name)) {
        throw new SchemaMismatchError(
          `Migration rule for '${target_name}' is not allowed because the table is unchanged.`,
        );
      }
      continue;
    }

    for (const target_field of Object.keys(rule.field_map)) {
      if (!target_table.fields.has(target_field)) {
        throw new SchemaMismatchError(
          `Migration field map references unknown target field '${target_name}.${target_field}'.`,
        );
      }
    }

    for (const target_field of Object.keys(rule.defaults)) {
      if (!target_table.fields.has(target_field)) {
        throw new SchemaMismatchError(
          `Migration defaults reference unknown target field '${target_name}.${target_field}'.`,
        );
      }
    }

    let source_name: string | undefined = rule.from;
    if (!source_name && target_exists) {
      source_name = target_name;
    }

    if (
      existing_signature !== undefined &&
      !target_exists &&
      source_name === undefined
    ) {
      throw new SchemaMismatchError(
        `Managed table '${target_name}' is missing and no migration source was provided.`,
      );
    }

    if (source_name !== undefined) {
      if (!physical_tables.has(source_name)) {
        throw new SchemaMismatchError(
          `Migration source table '${source_name}' for target '${target_name}' does not exist.`,
        );
      }
      if (source_name !== target_name && unchanged_tables.has(source_name)) {
        throw new SchemaMismatchError(
          `Migration source table '${source_name}' cannot be reused because it is unchanged in the current schema.`,
        );
      }
      const previous_target = source_to_target.get(source_name);
      if (previous_target && previous_target !== target_name) {
        throw new SchemaMismatchError(
          `Migration source table '${source_name}' is mapped to multiple targets ('${previous_target}', '${target_name}').`,
        );
      }
      source_to_target.set(source_name, target_name);
    }

    actions.push({
      target_name,
      target_table,
      source_name,
      rule,
    });
  }

  return {
    actions,
    removed_managed_tables,
    has_changes: actions.length > 0 || removed_managed_tables.length > 0,
  };
}

function parse_extras(raw_value: unknown): Record<string, unknown> {
  if (raw_value === null || raw_value === undefined || raw_value === "") {
    return {};
  }
  if (typeof raw_value !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw_value) as unknown;
    if (is_plain_object(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

function validate_id_value(value: unknown, path_name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ConstraintError(
      `Field '${path_name}' must be a non-empty string.`,
    );
  }
  return value;
}

function validate_timestamp_value(value: unknown, path_name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ConstraintError(
      `Field '${path_name}' must be a non-empty timestamp string.`,
    );
  }
  return value;
}

function normalize_object_value(
  definition: ValueDefinition,
  value: unknown,
  path_name: string,
): unknown {
  if (definition.kind === "optional") {
    if (value === undefined || value === null) {
      return null;
    }
    return normalize_object_value(definition.inner, value, path_name);
  }

  if (value === undefined || value === null) {
    throw new ConstraintError(`Field '${path_name}' cannot be null.`);
  }

  if (definition.kind === "string") {
    if (typeof value !== "string") {
      throw new ConstraintError(`Field '${path_name}' must be a string.`);
    }
    return value;
  }
  if (definition.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ConstraintError(
        `Field '${path_name}' must be a finite number.`,
      );
    }
    return value;
  }
  if (definition.kind === "boolean") {
    if (typeof value !== "boolean") {
      if (typeof value === "number" && (value === 0 || value === 1)) {
        return value === 1;
      }
      throw new ConstraintError(`Field '${path_name}' must be a boolean.`);
    }
    return value;
  }
  if (definition.kind === "id") {
    return validate_id_value(value, path_name);
  }
  if (definition.kind === "object") {
    return normalize_object_definition(definition, value, path_name);
  }
  return value;
}

function normalize_object_definition(
  definition: Extract<ValueDefinition, { kind: "object" }>,
  value: unknown,
  path_name: string,
): Record<string, unknown> {
  if (!is_plain_object(value)) {
    throw new ConstraintError(`Field '${path_name}' must be an object.`);
  }

  const normalized: Record<string, unknown> = {};
  for (const [raw_key, child_definition] of Object.entries(definition.shape)) {
    const key = InputValidator.validate_column_name(raw_key);
    if (
      !Object.prototype.hasOwnProperty.call(value, key) ||
      value[key] === undefined
    ) {
      if (child_definition.kind === "optional") {
        normalized[key] = null;
        continue;
      }
      throw new ConstraintError(
        `Missing required field '${path_name}.${key}'.`,
      );
    }
    normalized[key] = normalize_object_value(
      child_definition,
      value[key],
      `${path_name}.${key}`,
    );
  }

  for (const provided_key of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(definition.shape, provided_key)) {
      throw new ConstraintError(
        `Unknown nested field '${path_name}.${provided_key}' is not defined in schema.`,
      );
    }
  }

  return normalized;
}

function encode_definition_value(
  definition: ValueDefinition,
  value: unknown,
  path_name: string,
): unknown {
  if (definition.kind === "optional") {
    if (value === undefined || value === null) {
      return null;
    }
    return encode_definition_value(definition.inner, value, path_name);
  }

  if (value === null || value === undefined) {
    throw new ConstraintError(`Field '${path_name}' cannot be null.`);
  }

  if (definition.kind === "string") {
    if (typeof value !== "string") {
      throw new ConstraintError(`Field '${path_name}' must be a string.`);
    }
    return value;
  }
  if (definition.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ConstraintError(
        `Field '${path_name}' must be a finite number.`,
      );
    }
    return value;
  }
  if (definition.kind === "boolean") {
    if (typeof value !== "boolean") {
      if (typeof value === "number" && (value === 0 || value === 1)) {
        return value;
      }
      throw new ConstraintError(`Field '${path_name}' must be a boolean.`);
    }
    return value ? 1 : 0;
  }
  if (definition.kind === "id") {
    return validate_id_value(value, path_name);
  }
  if (definition.kind === "object") {
    let normalized_value: unknown = value;
    if (typeof normalized_value === "string") {
      try {
        normalized_value = JSON.parse(normalized_value) as unknown;
      } catch {
        throw new ConstraintError(`Field '${path_name}' must be an object.`);
      }
    }
    return JSON.stringify(
      normalize_object_definition(definition, normalized_value, path_name),
    );
  }
  return value;
}

function prepare_migration_record(
  table: CompiledTableDefinition,
  payload: Record<string, unknown>,
): PreparedMigrationRecord {
  if (!is_plain_object(payload)) {
    throw new ValidationError(
      `Value for table '${table.name}' must be a dictionary.`,
    );
  }

  const values: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};

  for (const field of table.fields.values()) {
    const has_key = Object.prototype.hasOwnProperty.call(payload, field.name);
    if (!has_key || payload[field.name] === undefined) {
      if (field.optional) {
        values[field.name] = null;
        continue;
      }
      throw new ConstraintError(
        `Missing required field '${table.name}.${field.name}'.`,
      );
    }
    values[field.name] = encode_definition_value(
      field.definition,
      payload[field.name],
      `${table.name}.${field.name}`,
    );
  }

  for (const [key, value] of Object.entries(payload)) {
    if (table.fields.has(key)) {
      continue;
    }
    if (RESERVED_COLUMNS.has(key)) {
      continue;
    }
    InputValidator.validate_column_name(key);
    extras[key] = value;
  }

  return {
    values,
    extras,
  };
}

function create_temp_table_name(target_name: string, index: number): string {
  const suffix = `${Date.now()}_${index}`;
  return `__skypydb_tmp_${target_name}_${suffix}`;
}

function create_old_table_name(target_name: string, index: number): string {
  const suffix = `${Date.now()}_${index}`;
  return `__skypydb_old_${target_name}_${suffix}`;
}

function verify_foreign_keys(connection: Database.Database): void {
  const violations = connection
    .prepare("PRAGMA foreign_key_check")
    .all() as Array<Record<string, unknown>>;
  if (violations.length > 0) {
    throw new ConstraintError(
      "Foreign key constraint failed during schema migration.",
    );
  }
}

function perform_migration(
  connection: Database.Database,
  compiled_schema: CompiledSchema,
  plan: MigrationPlan,
): void {
  if (plan.actions.length === 0) {
    for (const [table_name, table] of compiled_schema.tables.entries()) {
      if (!table_exists(connection, table_name)) {
        connection.prepare(create_table_sql(table_name, table)).run();
      }
      create_indexes(connection, table_name, table.indexes);
    }
    return;
  }

  const now = new Date().toISOString();
  const temp_tables = new Map<string, string>();
  const moved_ids_by_source = new Map<string, string[]>();

  for (const [index, action] of plan.actions.entries()) {
    const temp_table_name = create_temp_table_name(action.target_name, index);
    connection
      .prepare(create_table_sql(temp_table_name, action.target_table))
      .run();
    temp_tables.set(action.target_name, temp_table_name);
  }

  for (const action of plan.actions) {
    if (!action.source_name) {
      continue;
    }

    const source_name = action.source_name;
    const source_columns = list_table_columns(connection, source_name);
    if (
      !source_columns.includes("_id") ||
      !source_columns.includes("_createdAt") ||
      !source_columns.includes("_updatedAt")
    ) {
      throw new SchemaMismatchError(
        `Migration source table '${source_name}' is missing required metadata columns.`,
      );
    }

    const select_sql = `SELECT ${source_columns.map((column) => `[${column}]`).join(", ")} FROM [${source_name}]`;
    const source_rows = connection.prepare(select_sql).all() as Array<
      Record<string, unknown>
    >;

    const sorted_target_fields = [...action.target_table.fields.keys()].sort(
      (left, right) => left.localeCompare(right),
    );
    const insert_columns = [
      "_id",
      "_createdAt",
      "_updatedAt",
      "_extras",
      ...sorted_target_fields,
    ];
    const temp_table_name = temp_tables.get(action.target_name);
    if (!temp_table_name) {
      throw new SchemaMismatchError(
        `Temporary table for '${action.target_name}' was not created.`,
      );
    }
    const insert_statement = connection.prepare(
      `INSERT INTO [${temp_table_name}] (${insert_columns.map((column) => `[${column}]`).join(", ")}) VALUES (${insert_columns.map(() => "?").join(", ")})`,
    );

    const moved_ids: string[] = [];
    for (const source_row of source_rows) {
      const source_id = validate_id_value(source_row._id, `${source_name}._id`);
      const source_created_at = validate_timestamp_value(
        source_row._createdAt,
        `${source_name}._createdAt`,
      );
      const source_extras = parse_extras(source_row._extras);

      const mapped_payload = map_row_for_target({
        source_row,
        source_extras,
        target_fields: action.target_table.fields.keys(),
        rule: action.rule,
      });

      const prepared = prepare_migration_record(
        action.target_table,
        mapped_payload,
      );
      const insert_values = insert_columns.map((column) => {
        if (column === "_id") {
          return source_id;
        }
        if (column === "_createdAt") {
          return source_created_at;
        }
        if (column === "_updatedAt") {
          return now;
        }
        if (column === "_extras") {
          return JSON.stringify(prepared.extras);
        }
        return prepared.values[column] ?? null;
      });

      insert_statement.run(...insert_values);
      moved_ids.push(source_id);
    }

    if (source_name !== action.target_name) {
      moved_ids_by_source.set(source_name, moved_ids);
    }
  }

  for (const [source_name, moved_ids] of moved_ids_by_source.entries()) {
    if (moved_ids.length === 0) {
      continue;
    }
    const delete_statement = connection.prepare(
      `DELETE FROM [${source_name}] WHERE [_id] = ?`,
    );
    for (const moved_id of moved_ids) {
      delete_statement.run(moved_id);
    }
  }

  const old_tables: string[] = [];
  for (const [index, action] of plan.actions.entries()) {
    if (!table_exists(connection, action.target_name)) {
      continue;
    }
    const old_table_name = create_old_table_name(action.target_name, index);
    connection
      .prepare(
        `ALTER TABLE [${action.target_name}] RENAME TO [${old_table_name}]`,
      )
      .run();
    old_tables.push(old_table_name);
  }

  for (const action of plan.actions) {
    const temp_table_name = temp_tables.get(action.target_name);
    if (!temp_table_name) {
      throw new SchemaMismatchError(
        `Temporary table for '${action.target_name}' was not created.`,
      );
    }
    connection
      .prepare(
        `ALTER TABLE [${temp_table_name}] RENAME TO [${action.target_name}]`,
      )
      .run();
  }

  for (const old_table_name of old_tables) {
    connection.prepare(`DROP TABLE IF EXISTS [${old_table_name}]`).run();
  }

  for (const [table_name, table] of compiled_schema.tables.entries()) {
    if (!table_exists(connection, table_name)) {
      connection.prepare(create_table_sql(table_name, table)).run();
    }
    create_indexes(connection, table_name, table.indexes);
  }
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

  const plan = build_migration_plan(
    connection,
    compiled_schema,
    options,
    existing_signatures,
  );

  if (plan.has_changes) {
    backup_database_file(db_path);
  }

  if (plan.has_changes) {
    connection.pragma("foreign_keys = OFF");
  }

  try {
    const run_transaction = connection.transaction(() => {
      perform_migration(connection, compiled_schema, plan);
      verify_foreign_keys(connection);
      write_meta_state(connection, compiled_schema);
    });

    run_transaction();
  } finally {
    if (plan.has_changes) {
      connection.pragma("foreign_keys = ON");
    }
  }
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
