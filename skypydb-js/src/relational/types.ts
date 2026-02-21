import type {
  API_REF_MARKER,
  MUTATION_MARKER,
  QUERY_MARKER,
  SCHEMA_MARKER,
  TABLE_MARKER,
} from "./markers";

export type ValueKind =
  | "string"
  | "number"
  | "boolean"
  | "id"
  | "object"
  | "optional";

export type StringValueDefinition = {
  readonly kind: "string";
};

export type NumberValueDefinition = {
  readonly kind: "number";
};

export type BooleanValueDefinition = {
  readonly kind: "boolean";
};

export type IdValueDefinition = {
  readonly kind: "id";
  readonly table: string;
};

export type ObjectValueDefinition = {
  readonly kind: "object";
  readonly shape: Record<string, ValueDefinition>;
};

export type OptionalValueDefinition = {
  readonly kind: "optional";
  readonly inner: ValueDefinition;
};

export type ValueDefinition =
  | StringValueDefinition
  | NumberValueDefinition
  | BooleanValueDefinition
  | IdValueDefinition
  | ObjectValueDefinition
  | OptionalValueDefinition;

export type SchemaFieldMap = Record<string, ValueDefinition>;

export type TableIndexDefinition = {
  readonly name: string;
  readonly columns: string[];
};

export type TableDefinition = {
  readonly [TABLE_MARKER]: true;
  readonly fields: SchemaFieldMap;
  readonly indexes: TableIndexDefinition[];
  index: (name: string, columns: string[]) => TableDefinition;
};

export type SchemaDefinition = {
  readonly [SCHEMA_MARKER]: true;
  readonly tables: Record<string, TableDefinition>;
};

export type ArgsDefinition = Record<string, ValueDefinition>;

export type QueryRow = Record<string, unknown> & {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  _extras: Record<string, unknown>;
};

export type QueryOptions = {
  where?: WhereClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
};

export type OrderByClause = {
  field: string;
  direction?: "asc" | "desc";
};

export type WhereOperatorMap = {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: unknown;
  $gte?: unknown;
  $lt?: unknown;
  $lte?: unknown;
  $in?: unknown[];
  $nin?: unknown[];
  $contains?: string;
};

export type WhereClause = Record<
  string,
  unknown | WhereOperatorMap | WhereClause[] | Array<Record<string, unknown>>
> & {
  $and?: WhereClause[];
  $or?: WhereClause[];
};

export type UpdateOptions = {
  id?: string;
  where?: WhereClause;
  value: Record<string, unknown>;
};

export type DeleteOptions = {
  id?: string;
  where?: WhereClause;
};

export type MoveOptions = {
  toTable: string;
  id?: string;
  where?: WhereClause;
  fieldMap?: Record<string, string>;
  defaults?: Record<string, unknown>;
};

export type TableMigrationRule = {
  from?: string;
  fieldMap?: Record<string, string>;
  defaults?: Record<string, unknown>;
};

export type RuntimeSchemaMigrations = {
  tables?: Record<string, TableMigrationRule>;
};

export type ReadonlyDbContext = {
  get: (table: string, options?: QueryOptions) => QueryRow[];
  first: (table: string, options?: QueryOptions) => QueryRow | null;
  count: (table: string, options?: Pick<QueryOptions, "where">) => number;
};

export type MutationDbContext = ReadonlyDbContext & {
  insert: (table: string, value: Record<string, unknown>) => string;
  update: (table: string, options: UpdateOptions) => number;
  delete: (table: string, options: DeleteOptions) => number;
  move: (fromTable: string, options: MoveOptions) => number;
  transaction: <T>(fn: (txDb: MutationDbContext) => T) => T;
};

export type QueryContext = {
  db: ReadonlyDbContext;
};

export type MutationContext = {
  db: MutationDbContext;
};

export type QueryDefinition = {
  readonly [QUERY_MARKER]: true;
  readonly args?: ArgsDefinition;
  readonly handler: (ctx: QueryContext, args: unknown) => unknown;
};

export type MutationDefinition = {
  readonly [MUTATION_MARKER]: true;
  readonly args?: ArgsDefinition;
  readonly handler: (ctx: MutationContext, args: unknown) => unknown;
};

export type EndpointDefinition = QueryDefinition | MutationDefinition;

export type ApiReference = {
  readonly [API_REF_MARKER]: string[];
};

export type RuntimeSchemaOptions = {
  migrations?: RuntimeSchemaMigrations;
};

export type EndpointKind = "query" | "mutation";

export type EndpointDescriptor = {
  endpoint: string;
  kind: EndpointKind;
  definition: EndpointDefinition;
  source_file: string;
};

export type CompiledFieldDefinition = {
  name: string;
  definition: ValueDefinition;
  optional: boolean;
  base_definition: Exclude<ValueDefinition, OptionalValueDefinition>;
};

export type CompiledTableDefinition = {
  name: string;
  fields: Map<string, CompiledFieldDefinition>;
  indexes: TableIndexDefinition[];
};

export type CompiledSchema = {
  tables: Map<string, CompiledTableDefinition>;
  table_signatures: Map<string, string>;
  schema_signature: string;
};
