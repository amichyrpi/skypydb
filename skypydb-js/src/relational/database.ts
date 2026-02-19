import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { ConstraintError, DatabaseError, ValidationError } from "../errors";
import { InputValidator } from "../security/validation";
import {
  apply_schema,
  assert_table_exists,
  compile_schema,
} from "./schema_manager";
import type {
  CompiledFieldDefinition,
  CompiledSchema,
  CompiledTableDefinition,
  DeleteOptions,
  MutationDbContext,
  OrderByClause,
  QueryOptions,
  QueryRow,
  ReadonlyDbContext,
  RuntimeSchemaOptions,
  SchemaDefinition,
  UpdateOptions,
  ValueDefinition,
  WhereClause,
} from "./types";

const READONLY_FORBIDDEN_METHODS = new Set([
  "insert",
  "update",
  "delete",
  "transaction",
]);

type SelectRow = Record<string, unknown> & {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  _extras: string | null;
};

type PreparedRecord = {
  values: Record<string, unknown>;
  extras: Record<string, unknown>;
  generated_id?: string;
};

type ResolvedExpression = {
  expression: string;
  field: CompiledFieldDefinition | null;
};

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sqlite_constraint_message(error: unknown): string | null {
  const text = String(error);
  if (text.includes("FOREIGN KEY constraint failed")) {
    return "Foreign key constraint failed.";
  }
  if (text.includes("UNIQUE constraint failed")) {
    return "Unique constraint failed.";
  }
  if (text.includes("NOT NULL constraint failed")) {
    return "Required field is missing.";
  }
  return null;
}

export class RelationalDatabase {
  readonly path: string;
  private readonly connection: Database.Database;
  private compiled_schema: CompiledSchema | null = null;

  constructor(db_path: string) {
    this.path = db_path;
    fs.mkdirSync(path.dirname(db_path), { recursive: true });
    this.connection = new Database(db_path);
    this.connection.pragma("journal_mode = WAL");
    this.connection.pragma("foreign_keys = ON");
  }

  apply_schema(
    schema: SchemaDefinition,
    options: RuntimeSchemaOptions = {},
  ): void {
    const compiled = compile_schema(schema);
    apply_schema(this.connection, compiled, this.path, options);
    this.compiled_schema = compiled;
  }

  close(): void {
    this.connection.close();
  }

  create_readonly_context(): ReadonlyDbContext {
    const base: ReadonlyDbContext = {
      get: this.get.bind(this),
      first: this.first.bind(this),
      count: this.count.bind(this),
    };

    return new Proxy(base as ReadonlyDbContext & Record<string, unknown>, {
      get: (target, property: string | symbol) => {
        if (
          typeof property === "string" &&
          READONLY_FORBIDDEN_METHODS.has(property)
        ) {
          throw new ConstraintError(
            "Query context is read-only. Write operations are only allowed in mutations.",
          );
        }
        return Reflect.get(
          target as Record<string | symbol, unknown>,
          property,
        );
      },
    });
  }

  create_mutation_context(): MutationDbContext {
    return {
      get: this.get.bind(this),
      first: this.first.bind(this),
      count: this.count.bind(this),
      insert: this.insert.bind(this),
      update: this.update.bind(this),
      delete: this.delete.bind(this),
      transaction: this.transaction.bind(this),
    };
  }

  get(table_name: string, options: QueryOptions = {}): QueryRow[] {
    const table = this.table(table_name);
    const parameters: unknown[] = [];
    const where_sql = this.build_where_sql(table, options.where, parameters);
    const order_by_sql = this.build_order_by_sql(table, options.orderBy);
    const limit_offset_sql = this.build_limit_offset_sql(
      options.limit,
      options.offset,
      parameters,
    );

    const columns = [
      "_id",
      "_createdAt",
      "_updatedAt",
      "_extras",
      ...[...table.fields.keys()].sort((left, right) =>
        left.localeCompare(right),
      ),
    ];
    const select_sql = `SELECT ${columns.map((column) => `[${column}]`).join(", ")} FROM [${table.name}] WHERE ${where_sql}${order_by_sql}${limit_offset_sql}`;

    const rows = this.connection
      .prepare(select_sql)
      .all(...parameters) as SelectRow[];
    return rows.map((row) => this.decode_row(table, row));
  }

  first(table_name: string, options: QueryOptions = {}): QueryRow | null {
    const result = this.get(table_name, { ...options, limit: 1 });
    return result.length > 0 ? result[0] : null;
  }

  count(table_name: string, options: Pick<QueryOptions, "where"> = {}): number {
    const table = this.table(table_name);
    const parameters: unknown[] = [];
    const where_sql = this.build_where_sql(table, options.where, parameters);
    const sql = `SELECT COUNT(*) AS count_value FROM [${table.name}] WHERE ${where_sql}`;
    const row = this.connection.prepare(sql).get(...parameters) as
      | { count_value?: number }
      | undefined;
    return Number(row?.count_value ?? 0);
  }

  insert(table_name: string, value: Record<string, unknown>): string {
    const table = this.table(table_name);
    const record = this.prepare_record(table, value, "insert");
    const now = new Date().toISOString();
    const row_id = record.generated_id ?? randomUUID();

    const columns = [
      "_id",
      "_createdAt",
      "_updatedAt",
      "_extras",
      ...[...table.fields.keys()].sort((left, right) =>
        left.localeCompare(right),
      ),
    ];
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((column) => {
      if (column === "_id") {
        return row_id;
      }
      if (column === "_createdAt" || column === "_updatedAt") {
        return now;
      }
      if (column === "_extras") {
        return JSON.stringify(record.extras);
      }
      return record.values[column] ?? null;
    });

    try {
      this.connection
        .prepare(
          `INSERT INTO [${table.name}] (${columns.map((column) => `[${column}]`).join(", ")}) VALUES (${placeholders})`,
        )
        .run(...values);
      return row_id;
    } catch (error) {
      this.rethrow_sql_error(error, "Insert failed.");
    }
  }

  update(table_name: string, options: UpdateOptions): number {
    const table = this.table(table_name);
    if (!is_plain_object(options) || !is_plain_object(options.value)) {
      throw new ValidationError(
        "Update payload must contain a value dictionary.",
      );
    }

    if (
      (options.id === undefined && options.where === undefined) ||
      (options.id !== undefined && options.where !== undefined)
    ) {
      throw new ValidationError(
        "Update requires exactly one of 'id' or 'where'.",
      );
    }

    const target_ids = this.resolve_target_ids(
      table,
      options.id,
      options.where,
    );
    if (target_ids.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const sorted_fields = [...table.fields.keys()].sort((left, right) =>
      left.localeCompare(right),
    );
    const set_chunks = sorted_fields.map((field) => `[${field}] = ?`);
    set_chunks.push("[_extras] = ?");
    set_chunks.push("[_updatedAt] = ?");

    const statement = this.connection.prepare(
      `UPDATE [${table.name}] SET ${set_chunks.join(", ")} WHERE [_id] = ?`,
    );

    let updated = 0;
    for (const target_id of target_ids) {
      const record = this.prepare_record(table, options.value, "replace");
      const values = sorted_fields.map((field) => record.values[field] ?? null);
      values.push(JSON.stringify(record.extras));
      values.push(now);
      values.push(target_id);

      try {
        const result = statement.run(...values);
        updated += Number(result.changes ?? 0);
      } catch (error) {
        this.rethrow_sql_error(error, "Update failed.");
      }
    }

    return updated;
  }

  delete(table_name: string, options: DeleteOptions): number {
    const table = this.table(table_name);
    if (!is_plain_object(options)) {
      throw new ValidationError("Delete options must be a dictionary.");
    }
    if (
      (options.id === undefined && options.where === undefined) ||
      (options.id !== undefined && options.where !== undefined)
    ) {
      throw new ValidationError(
        "Delete requires exactly one of 'id' or 'where'.",
      );
    }

    try {
      if (options.id !== undefined) {
        const validated_id = this.validate_id_value(
          options.id,
          `${table.name}._id`,
        );
        const result = this.connection
          .prepare(`DELETE FROM [${table.name}] WHERE [_id] = ?`)
          .run(validated_id);
        return Number(result.changes ?? 0);
      }

      const parameters: unknown[] = [];
      const where_sql = this.build_where_sql(table, options.where, parameters);
      const result = this.connection
        .prepare(`DELETE FROM [${table.name}] WHERE ${where_sql}`)
        .run(...parameters);
      return Number(result.changes ?? 0);
    } catch (error) {
      this.rethrow_sql_error(error, "Delete failed.");
    }
  }

  transaction<T>(callback: (tx_db: MutationDbContext) => T): T {
    if (typeof callback !== "function") {
      throw new ValidationError("transaction requires a callback function.");
    }

    const transaction_fn = this.connection.transaction(() => {
      const value = callback(this.create_mutation_context());
      if (
        typeof value === "object" &&
        value !== null &&
        "then" in (value as { then?: unknown }) &&
        typeof (value as { then?: unknown }).then === "function"
      ) {
        throw new ValidationError("transaction callback must be synchronous.");
      }
      return value;
    });

    try {
      return transaction_fn();
    } catch (error) {
      this.rethrow_sql_error(error, "Transaction failed.");
    }
  }

  private rethrow_sql_error(error: unknown, default_message: string): never {
    if (error instanceof ValidationError || error instanceof ConstraintError) {
      throw error;
    }
    const constraint = sqlite_constraint_message(error);
    if (constraint) {
      throw new ConstraintError(constraint);
    }
    throw new DatabaseError(`${default_message} ${String(error)}`);
  }

  private table(table_name: string): CompiledTableDefinition {
    if (!this.compiled_schema) {
      throw new DatabaseError("Schema is not initialized.");
    }
    return assert_table_exists(this.compiled_schema, table_name);
  }

  private resolve_target_ids(
    table: CompiledTableDefinition,
    id: string | undefined,
    where: WhereClause | undefined,
  ): string[] {
    if (id !== undefined) {
      return [this.validate_id_value(id, `${table.name}._id`)];
    }

    const parameters: unknown[] = [];
    const where_sql = this.build_where_sql(table, where, parameters);
    const rows = this.connection
      .prepare(`SELECT [_id] FROM [${table.name}] WHERE ${where_sql}`)
      .all(...parameters) as Array<{ _id: string }>;
    return rows.map((row) => row._id);
  }

  private prepare_record(
    table: CompiledTableDefinition,
    raw_value: Record<string, unknown>,
    mode: "insert" | "replace",
  ): PreparedRecord {
    if (!is_plain_object(raw_value)) {
      throw new ValidationError(
        `Value for table '${table.name}' must be a dictionary.`,
      );
    }

    const values: Record<string, unknown> = {};
    const extras: Record<string, unknown> = {};

    for (const field of table.fields.values()) {
      const has_key = Object.prototype.hasOwnProperty.call(
        raw_value,
        field.name,
      );
      if (!has_key || raw_value[field.name] === undefined) {
        if (field.optional) {
          values[field.name] = null;
          continue;
        }
        throw new ConstraintError(
          `Missing required field '${table.name}.${field.name}'.`,
        );
      }
      values[field.name] = this.encode_field_value(
        field,
        raw_value[field.name],
        `${table.name}.${field.name}`,
      );
    }

    for (const [key, value] of Object.entries(raw_value)) {
      if (table.fields.has(key)) {
        continue;
      }
      if (
        key === "_id" ||
        key === "_createdAt" ||
        key === "_updatedAt" ||
        key === "_extras"
      ) {
        continue;
      }
      InputValidator.validate_column_name(key);
      extras[key] = value;
    }

    const prepared: PreparedRecord = { values, extras };
    if (
      mode === "insert" &&
      Object.prototype.hasOwnProperty.call(raw_value, "_id")
    ) {
      prepared.generated_id = this.validate_id_value(
        raw_value._id,
        `${table.name}._id`,
      );
    }

    return prepared;
  }

  private validate_id_value(value: unknown, path_name: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new ConstraintError(
        `Field '${path_name}' must be a non-empty string.`,
      );
    }
    return value;
  }

  private encode_field_value(
    field: CompiledFieldDefinition,
    value: unknown,
    path_name: string,
  ): unknown {
    return this.encode_definition_value(field.definition, value, path_name);
  }

  private encode_definition_value(
    definition: ValueDefinition,
    value: unknown,
    path_name: string,
  ): unknown {
    if (definition.kind === "optional") {
      if (value === undefined || value === null) {
        return null;
      }
      return this.encode_definition_value(definition.inner, value, path_name);
    }

    if (value === null || value === undefined) {
      throw new ConstraintError(`Field '${path_name}' cannot be null.`);
    }

    switch (definition.kind) {
      case "string": {
        if (typeof value !== "string") {
          throw new ConstraintError(`Field '${path_name}' must be a string.`);
        }
        return value;
      }
      case "number": {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new ConstraintError(
            `Field '${path_name}' must be a finite number.`,
          );
        }
        return value;
      }
      case "boolean": {
        if (typeof value !== "boolean") {
          throw new ConstraintError(`Field '${path_name}' must be a boolean.`);
        }
        return value ? 1 : 0;
      }
      case "id": {
        const id_value = this.validate_id_value(value, path_name);
        this.ensure_foreign_key_exists(definition.table, id_value, path_name);
        return id_value;
      }
      case "object": {
        return JSON.stringify(
          this.normalize_object_definition(definition, value, path_name),
        );
      }
      default:
        return value;
    }
  }

  private normalize_object_definition(
    definition: Extract<ValueDefinition, { kind: "object" }>,
    value: unknown,
    path_name: string,
  ): Record<string, unknown> {
    if (!is_plain_object(value)) {
      throw new ConstraintError(`Field '${path_name}' must be an object.`);
    }

    const normalized: Record<string, unknown> = {};
    for (const [raw_key, child_definition] of Object.entries(
      definition.shape,
    )) {
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
      normalized[key] = this.normalize_object_value(
        child_definition,
        value[key],
        `${path_name}.${key}`,
      );
    }

    for (const extra_key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(definition.shape, extra_key)) {
        throw new ConstraintError(
          `Unknown nested field '${path_name}.${extra_key}' is not defined in schema.`,
        );
      }
    }

    return normalized;
  }

  private normalize_object_value(
    definition: ValueDefinition,
    value: unknown,
    path_name: string,
  ): unknown {
    if (definition.kind === "optional") {
      if (value === undefined || value === null) {
        return null;
      }
      return this.normalize_object_value(definition.inner, value, path_name);
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
        throw new ConstraintError(`Field '${path_name}' must be a boolean.`);
      }
      return value;
    }
    if (definition.kind === "id") {
      const id_value = this.validate_id_value(value, path_name);
      this.ensure_foreign_key_exists(definition.table, id_value, path_name);
      return id_value;
    }
    if (definition.kind === "object") {
      return this.normalize_object_definition(definition, value, path_name);
    }
    return value;
  }

  private decode_scalar(definition: ValueDefinition, value: unknown): unknown {
    if (definition.kind === "optional") {
      if (value === null) {
        return null;
      }
      return this.decode_scalar(definition.inner, value);
    }
    if (definition.kind === "boolean") {
      return Number(value) !== 0;
    }
    if (definition.kind === "object") {
      if (typeof value === "string") {
        try {
          return JSON.parse(value) as Record<string, unknown>;
        } catch {
          return value;
        }
      }
    }
    return value;
  }

  private ensure_foreign_key_exists(
    table_name: string,
    id_value: string,
    path_name: string,
  ): void {
    const validated_table = InputValidator.validate_table_name(table_name);
    if (!table_exists(this.connection, validated_table)) {
      throw new ConstraintError(
        `Referenced table '${validated_table}' for '${path_name}' does not exist.`,
      );
    }
    const row = this.connection
      .prepare(`SELECT [_id] FROM [${validated_table}] WHERE [_id] = ?`)
      .get(id_value) as { _id: string } | undefined;
    if (!row) {
      throw new ConstraintError(
        `Referenced id '${id_value}' for '${path_name}' does not exist in table '${validated_table}'.`,
      );
    }
  }

  private decode_row(table: CompiledTableDefinition, row: SelectRow): QueryRow {
    const extras = this.parse_extras(row._extras);
    const output: QueryRow = {
      _id: String(row._id),
      _createdAt: String(row._createdAt),
      _updatedAt: String(row._updatedAt),
      _extras: extras,
    };

    for (const field of table.fields.values()) {
      const raw_value = row[field.name] ?? null;
      output[field.name] = this.decode_scalar(field.definition, raw_value);
    }

    for (const [key, value] of Object.entries(extras)) {
      if (!Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = value;
      }
    }

    return output;
  }

  private parse_extras(raw_value: string | null): Record<string, unknown> {
    if (!raw_value) {
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

  private build_where_sql(
    table: CompiledTableDefinition,
    where: WhereClause | undefined,
    parameters: unknown[],
  ): string {
    if (!where || Object.keys(where).length === 0) {
      return "1 = 1";
    }
    if (!is_plain_object(where)) {
      throw new ValidationError("where must be an object.");
    }

    const chunks: string[] = [];
    for (const [key, value] of Object.entries(where)) {
      if (key === "$and" || key === "$or") {
        if (!Array.isArray(value)) {
          throw new ValidationError(`${key} must be an array.`);
        }
        const nested_parts = value.map(
          (entry) =>
            `(${this.build_where_sql(table, entry as WhereClause, parameters)})`,
        );
        if (nested_parts.length === 0) {
          chunks.push(key === "$and" ? "1 = 1" : "1 = 0");
        } else {
          chunks.push(nested_parts.join(key === "$and" ? " AND " : " OR "));
        }
        continue;
      }

      const resolved = this.resolve_expression(table, key);
      if (
        is_plain_object(value) &&
        Object.keys(value).some((operator) => operator.startsWith("$"))
      ) {
        for (const [operator, operator_value] of Object.entries(value)) {
          chunks.push(
            this.operator_sql(resolved, operator, operator_value, parameters),
          );
        }
      } else {
        chunks.push(this.operator_sql(resolved, "$eq", value, parameters));
      }
    }

    if (chunks.length === 0) {
      return "1 = 1";
    }

    return chunks.map((chunk) => `(${chunk})`).join(" AND ");
  }

  private operator_sql(
    resolved: ResolvedExpression,
    operator: string,
    operator_value: unknown,
    parameters: unknown[],
  ): string {
    const expression = resolved.expression;
    if (operator === "$contains") {
      if (typeof operator_value !== "string") {
        throw new ValidationError("$contains expects a string value.");
      }
      parameters.push(`%${operator_value}%`);
      return `CAST(${expression} AS TEXT) LIKE ?`;
    }

    const normalized_value = this.normalize_filter_value(
      resolved.field,
      operator_value,
    );
    if (operator === "$eq") {
      if (normalized_value === null) {
        return `${expression} IS NULL`;
      }
      parameters.push(normalized_value);
      return `${expression} = ?`;
    }
    if (operator === "$ne") {
      if (normalized_value === null) {
        return `${expression} IS NOT NULL`;
      }
      parameters.push(normalized_value);
      return `${expression} <> ?`;
    }
    if (operator === "$gt") {
      parameters.push(normalized_value);
      return `${expression} > ?`;
    }
    if (operator === "$gte") {
      parameters.push(normalized_value);
      return `${expression} >= ?`;
    }
    if (operator === "$lt") {
      parameters.push(normalized_value);
      return `${expression} < ?`;
    }
    if (operator === "$lte") {
      parameters.push(normalized_value);
      return `${expression} <= ?`;
    }
    if (operator === "$in" || operator === "$nin") {
      if (!Array.isArray(operator_value)) {
        throw new ValidationError(`${operator} expects an array.`);
      }
      if (operator_value.length === 0) {
        return operator === "$in" ? "1 = 0" : "1 = 1";
      }
      const placeholders = operator_value.map(() => "?").join(", ");
      for (const item of operator_value) {
        parameters.push(this.normalize_filter_value(resolved.field, item));
      }
      return `${expression} ${operator === "$in" ? "IN" : "NOT IN"} (${placeholders})`;
    }

    throw new ValidationError(`Unsupported where operator '${operator}'.`);
  }

  private resolve_expression(
    table: CompiledTableDefinition,
    field_name: string,
  ): ResolvedExpression {
    if (
      field_name === "_id" ||
      field_name === "_createdAt" ||
      field_name === "_updatedAt" ||
      field_name === "_extras"
    ) {
      return {
        expression: `[${field_name}]`,
        field: null,
      };
    }

    if (table.fields.has(field_name)) {
      return {
        expression: `[${field_name}]`,
        field: table.fields.get(field_name) ?? null,
      };
    }

    const validated = InputValidator.validate_column_name(field_name);
    return {
      expression: `json_extract([_extras], '$.${validated}')`,
      field: null,
    };
  }

  private normalize_filter_value(
    field: CompiledFieldDefinition | null,
    value: unknown,
  ): unknown {
    if (!field) {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    }

    if (field.base_definition.kind === "boolean") {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    }
    if (field.base_definition.kind === "object" && is_plain_object(value)) {
      return JSON.stringify(value);
    }
    return value;
  }

  private build_order_by_sql(
    table: CompiledTableDefinition,
    order_by: OrderByClause[] | undefined,
  ): string {
    if (!order_by || order_by.length === 0) {
      return "";
    }
    const parts: string[] = [];
    for (const clause of order_by) {
      if (!is_plain_object(clause) || typeof clause.field !== "string") {
        throw new ValidationError("orderBy clause must contain a field.");
      }
      const resolved = this.resolve_expression(table, clause.field);
      const direction = (clause.direction ?? "asc").toLowerCase();
      if (direction !== "asc" && direction !== "desc") {
        throw new ValidationError("orderBy direction must be 'asc' or 'desc'.");
      }
      parts.push(`${resolved.expression} ${direction.toUpperCase()}`);
    }
    return ` ORDER BY ${parts.join(", ")}`;
  }

  private build_limit_offset_sql(
    limit: number | undefined,
    offset: number | undefined,
    parameters: unknown[],
  ): string {
    let sql = "";
    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 0) {
        throw new ValidationError("limit must be a non-negative integer.");
      }
      sql += " LIMIT ?";
      parameters.push(limit);
    }
    if (offset !== undefined) {
      if (!Number.isInteger(offset) || offset < 0) {
        throw new ValidationError("offset must be a non-negative integer.");
      }
      if (limit === undefined) {
        sql += " LIMIT -1";
      }
      sql += " OFFSET ?";
      parameters.push(offset);
    }
    return sql;
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
