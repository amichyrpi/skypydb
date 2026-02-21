export type MetadataValue =
  | string
  | number
  | boolean
  | null
  | MetadataValue[]
  | { [key: string]: MetadataValue };

export type Metadata = Record<string, MetadataValue>;

export type EmbeddingVector = number[];
export type EmbeddingMatrix = EmbeddingVector[];

export type EmbeddingProviderName =
  | "ollama"
  | "openai"
  | "sentence-transformers"
  | "sentence-transformer";

export type EmbeddingFunction = (texts: string[]) => Promise<EmbeddingMatrix>;

export type IncludeKeys =
  | "embeddings"
  | "documents"
  | "metadatas"
  | "distances";

export type WhereDocumentFilter = {
  $contains?: string;
  $not_contains?: string;
};

export type WhereFilter = Record<string, unknown>;

export type CollectionInfo = {
  name: string;
  metadata: Metadata;
  created_at: string;
};

export type GetResult = {
  ids: string[];
  embeddings: EmbeddingMatrix | null;
  documents: Array<string | null> | null;
  metadatas: Array<Metadata | null> | null;
};

export type QueryResult = {
  ids: string[][];
  embeddings: EmbeddingMatrix[] | null;
  documents: Array<Array<string | null>> | null;
  metadatas: Array<Array<Metadata | null>> | null;
  distances: number[][] | null;
};

export type AddParams = {
  ids: string[];
  embeddings?: EmbeddingMatrix;
  documents?: string[];
  metadatas?: Metadata[];
  data?: string[];
};

export type UpdateParams = {
  ids: string[];
  embeddings?: EmbeddingMatrix;
  documents?: string[];
  metadatas?: Metadata[];
};

export type GetParams = {
  ids?: string[];
  where?: WhereFilter;
  where_document?: WhereDocumentFilter;
  include?: IncludeKeys[];
  limit?: number;
  offset?: number;
};

export type QueryParams = {
  query_embeddings?: EmbeddingMatrix;
  query_texts?: string[];
  n_results?: number;
  number_of_results?: number;
  where?: WhereFilter;
  where_document?: WhereDocumentFilter;
  include?: IncludeKeys[];
};

export type DeleteParams = {
  ids?: string[];
  where?: WhereFilter;
  where_document?: WhereDocumentFilter;
  by_ids?: string[];
  by_metadatas?: Record<string, unknown> | Array<Record<string, unknown>>;
  by_data?: string | string[];
};

export type VecClientOptions = {
  embedding_provider?: string;
  embedding_model_config?: Record<string, unknown>;
};

export type HttpClientOptions = {
  api_url: string;
  api_key: string;
  timeout_ms?: number;
  embedding_provider?: EmbeddingProviderName;
  embedding_model_config?: Record<string, unknown>;
};

export type RelationalOrderBy = {
  field: string;
  direction?: "asc" | "desc";
};

export type RelationalUpdateParams = {
  id?: string;
  where?: Record<string, unknown>;
  value: Record<string, unknown>;
};

export type RelationalDeleteParams = {
  id?: string;
  where?: Record<string, unknown>;
};

export type RelationalMoveParams = {
  toTable: string;
  id?: string;
  where?: Record<string, unknown>;
  fieldMap?: Record<string, string>;
  defaults?: Record<string, unknown>;
};

export type RelationalQueryParams = {
  where?: Record<string, unknown>;
  orderBy?: RelationalOrderBy[];
  limit?: number;
  offset?: number;
};

export type SchemaFieldType =
  | "string"
  | "number"
  | "boolean"
  | "id"
  | "object"
  | "optional";

export type SchemaFieldDefinition = {
  type: SchemaFieldType;
  table?: string;
  shape?: Record<string, SchemaFieldDefinition>;
  inner?: SchemaFieldDefinition;
};

export type SchemaTableDefinition = {
  fields: Record<string, SchemaFieldDefinition>;
  indexes?: Array<{ name: string; columns: string[] }>;
};

export type SchemaDocument = {
  tables: Record<string, SchemaTableDefinition>;
  migrations?: {
    tables?: Record<
      string,
      {
        from?: string;
        field_map?: Record<string, string>;
        defaults?: Record<string, unknown>;
      }
    >;
  };
};

export type SchemaReadResponse = {
  schema: SchemaDocument | null;
  schema_signature: string | null;
};
