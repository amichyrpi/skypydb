import { get_embedding_function } from "../embeddings/core/get_embeddings_function";
import type {
  AddParams,
  CollectionInfo,
  DeleteParams,
  EmbeddingFunction,
  GetParams,
  GetResult,
  HttpClientOptions,
  Metadata,
  QueryParams,
  QueryResult,
  RelationalDeleteParams,
  RelationalMoveParams,
  RelationalQueryParams,
  RelationalUpdateParams,
  SchemaDocument,
  SchemaReadResponse,
  UpdateParams,
} from "../types";
import { HttpTransport } from "./transport";
import { apply_paging, matches_vector_filters } from "./filters";

type VectorItemResponse = {
  id: string;
  document: string | null;
  metadata: Metadata | null;
};

type VectorQueryResponse = {
  ids: string[][];
  documents: Array<Array<string | null>>;
  metadatas: Array<Array<Metadata | null>>;
  distances: number[][];
};

type VectorAddItem = {
  id?: string;
  embedding: number[];
  document?: string | null;
  metadata?: Metadata | null;
};

function encode_segment(value: string): string {
  return encodeURIComponent(value);
}

function normalize_documents(params: AddParams): string[] | undefined {
  const { data, documents } = params;
  if (data !== undefined) {
    if (
      documents !== undefined &&
      JSON.stringify(documents) !== JSON.stringify(data)
    ) {
      throw new Error(
        "Use either 'documents' or legacy 'data', not conflicting values for both.",
      );
    }
    return data;
  }
  return documents;
}

function normalize_query_result_limit(params: QueryParams): number {
  if (params.number_of_results !== undefined) {
    return params.number_of_results;
  }
  if (params.n_results !== undefined) {
    return params.n_results;
  }
  return 10;
}

function normalize_delete_filters(params: DeleteParams): {
  ids?: string[];
  where?: Record<string, unknown>;
  where_document?: Record<string, string>;
  by_data_values?: string[];
} {
  let { ids, where, where_document, by_ids, by_metadatas, by_data } = params;
  if (by_ids !== undefined) {
    if (ids !== undefined && JSON.stringify(ids) !== JSON.stringify(by_ids)) {
      throw new Error(
        "Use either 'ids' or legacy 'by_ids', not conflicting values for both.",
      );
    }
    ids = by_ids;
  }

  if (by_metadatas !== undefined) {
    if (where !== undefined) {
      throw new Error("Use either 'where' or legacy 'by_metadatas', not both.");
    }
    if (!Array.isArray(by_metadatas) && typeof by_metadatas === "object") {
      where = by_metadatas;
    } else if (Array.isArray(by_metadatas)) {
      if (by_metadatas.length === 1 && typeof by_metadatas[0] === "object") {
        where = by_metadatas[0];
      } else if (
        by_metadatas.length > 1 &&
        by_metadatas.every((item) => typeof item === "object")
      ) {
        where = { $or: by_metadatas };
      }
    } else {
      throw new Error("Legacy 'by_metadatas' must be a dict or list of dicts.");
    }
  }

  let by_data_values: string[] | undefined;
  if (by_data !== undefined) {
    if (where_document !== undefined) {
      throw new Error(
        "Use either 'where_document' or legacy 'by_data', not both.",
      );
    }
    if (typeof by_data === "string") {
      where_document = { $contains: by_data };
    } else if (Array.isArray(by_data)) {
      by_data_values = by_data.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
      if (by_data_values.length === 1) {
        where_document = { $contains: by_data_values[0] };
        by_data_values = undefined;
      }
    } else {
      throw new Error("Legacy 'by_data' must be a string or list of strings.");
    }
  }

  return {
    ids,
    where,
    where_document,
    by_data_values,
  };
}

export class HttpCollection {
  readonly name: string;
  readonly metadata: Metadata;
  private readonly transport: HttpTransport;
  private readonly embedding_function: EmbeddingFunction | null;

  constructor(
    transport: HttpTransport,
    name: string,
    metadata: Metadata = {},
    embedding_function: EmbeddingFunction | null = null,
  ) {
    this.transport = transport;
    this.name = name;
    this.metadata = metadata;
    this.embedding_function = embedding_function;
  }

  async add(params: AddParams): Promise<void> {
    const ids = params.ids;
    const documents = normalize_documents(params);
    let embeddings = params.embeddings;

    if (!embeddings) {
      if (!documents) {
        throw new Error(
          "Either embeddings or documents/data must be provided.",
        );
      }
      if (!this.embedding_function) {
        throw new Error(
          "Documents provided but no embedding function set. Configure embedding_provider first.",
        );
      }
      embeddings = await this.embedding_function(documents);
    }

    if (embeddings.length !== ids.length) {
      throw new Error(
        `Number of embeddings (${embeddings.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }
    if (documents !== undefined && documents.length !== ids.length) {
      throw new Error(
        `Number of documents (${documents.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }
    if (
      params.metadatas !== undefined &&
      params.metadatas.length !== ids.length
    ) {
      throw new Error(
        `Number of metadatas (${params.metadatas.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }

    const items: VectorAddItem[] = ids.map((id, index) => ({
      id,
      embedding: embeddings![index],
      document: documents?.[index] ?? null,
      metadata: params.metadatas?.[index] ?? null,
    }));

    await this.transport.request<string[]>(
      "POST",
      `/v1/vector/collections/${encode_segment(this.name)}/items/add`,
      { items },
    );
  }

  async get(params: GetParams = {}): Promise<GetResult> {
    const include = params.include ?? ["embeddings", "documents", "metadatas"];
    const rows = await this.fetch_rows(params.ids);
    const filtered = rows.filter((row) =>
      matches_vector_filters(row, params.where, params.where_document),
    );
    const paged = apply_paging(filtered, params.limit, params.offset);

    return {
      ids: paged.map((row) => row.id),
      embeddings: include.includes("embeddings") ? null : null,
      documents: include.includes("documents")
        ? paged.map((row) => row.document)
        : null,
      metadatas: include.includes("metadatas")
        ? paged.map((row) => row.metadata)
        : null,
    };
  }

  async query(params: QueryParams = {}): Promise<QueryResult> {
    const include = params.include ?? [
      "embeddings",
      "documents",
      "metadatas",
      "distances",
    ];
    let query_embeddings = params.query_embeddings;
    if (!query_embeddings) {
      if (!params.query_texts) {
        throw new Error(
          "Either query_embeddings or query_texts must be provided.",
        );
      }
      if (!this.embedding_function) {
        throw new Error(
          "Query texts provided but no embedding function set. Configure embedding_provider first.",
        );
      }
      query_embeddings = await this.embedding_function(params.query_texts);
    }

    const requested_limit = normalize_query_result_limit(params);
    let fetch_limit = requested_limit;
    if (params.where || params.where_document) {
      const all_rows = await this.fetch_rows();
      fetch_limit = Math.max(requested_limit, all_rows.length);
    }

    const response = await this.transport.request<VectorQueryResponse>(
      "POST",
      `/v1/vector/collections/${encode_segment(this.name)}/query`,
      {
        query_embeddings,
        n_results: fetch_limit,
      },
    );

    const ids: string[][] = [];
    const documents: Array<Array<string | null>> = [];
    const metadatas: Array<Array<Metadata | null>> = [];
    const distances: number[][] = [];

    for (
      let query_index = 0;
      query_index < response.ids.length;
      query_index += 1
    ) {
      const row_ids = response.ids[query_index] ?? [];
      const row_documents = response.documents?.[query_index] ?? [];
      const row_metadatas = response.metadatas?.[query_index] ?? [];
      const row_distances = response.distances?.[query_index] ?? [];

      const filtered_rows: Array<{
        id: string;
        document: string | null;
        metadata: Metadata | null;
        distance: number;
      }> = [];

      for (let index = 0; index < row_ids.length; index += 1) {
        const candidate = {
          id: row_ids[index],
          document: row_documents[index] ?? null,
          metadata: row_metadatas[index] ?? null,
          distance: row_distances[index] ?? 0,
        };
        if (
          matches_vector_filters(candidate, params.where, params.where_document)
        ) {
          filtered_rows.push(candidate);
        }
      }

      const top = filtered_rows.slice(0, requested_limit);
      ids.push(top.map((item) => item.id));
      documents.push(top.map((item) => item.document));
      metadatas.push(top.map((item) => item.metadata));
      distances.push(top.map((item) => item.distance));
    }

    return {
      ids,
      embeddings: include.includes("embeddings") ? null : null,
      documents: include.includes("documents") ? documents : null,
      metadatas: include.includes("metadatas") ? metadatas : null,
      distances: include.includes("distances") ? distances : null,
    };
  }

  async update(params: UpdateParams): Promise<void> {
    const { ids, documents, metadatas } = params;
    let embeddings = params.embeddings;

    if (!embeddings && documents) {
      if (!this.embedding_function) {
        throw new Error(
          "Documents provided but no embedding function set. Configure embedding_provider first.",
        );
      }
      embeddings = await this.embedding_function(documents);
    }

    if (embeddings && embeddings.length !== ids.length) {
      throw new Error(
        `Number of embeddings (${embeddings.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }
    if (documents && documents.length !== ids.length) {
      throw new Error(
        `Number of documents (${documents.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }
    if (metadatas && metadatas.length !== ids.length) {
      throw new Error(
        `Number of metadatas (${metadatas.length}) doesn't match number of IDs (${ids.length}).`,
      );
    }

    await this.transport.request<{ affected_rows: number }>(
      "POST",
      `/v1/vector/collections/${encode_segment(this.name)}/items/update`,
      {
        items: ids.map((id, index) => ({
          id,
          embedding: embeddings?.[index],
          document: documents?.[index],
          metadata: metadatas?.[index],
        })),
      },
    );
  }

  async delete(params: DeleteParams = {}): Promise<void> {
    const normalized = normalize_delete_filters(params);

    if (normalized.ids && normalized.ids.length > 0) {
      await this.transport.request<{ affected_rows: number }>(
        "POST",
        `/v1/vector/collections/${encode_segment(this.name)}/items/delete`,
        { ids: normalized.ids },
      );
      return;
    }

    const rows = await this.fetch_rows();
    const ids_to_delete = rows
      .filter((row) => {
        if (normalized.by_data_values && normalized.by_data_values.length > 1) {
          return normalized.by_data_values.some((value) =>
            (row.document ?? "").includes(value),
          );
        }
        return matches_vector_filters(
          row,
          normalized.where,
          normalized.where_document,
        );
      })
      .map((row) => row.id);

    if (ids_to_delete.length === 0) {
      if (
        normalized.where === undefined &&
        normalized.where_document === undefined &&
        normalized.by_data_values === undefined
      ) {
        throw new Error(
          "delete() requires at least one of 'ids', 'where', or 'where_document' to be provided.",
        );
      }
      return;
    }

    await this.transport.request<{ affected_rows: number }>(
      "POST",
      `/v1/vector/collections/${encode_segment(this.name)}/items/delete`,
      { ids: ids_to_delete },
    );
  }

  async count(): Promise<number> {
    const rows = await this.fetch_rows();
    return rows.length;
  }

  async peek(limit = 10): Promise<GetResult> {
    return this.get({ limit });
  }

  private async fetch_rows(ids?: string[]): Promise<VectorItemResponse[]> {
    const payload =
      ids === undefined || ids.length === 0 ? {} : { ids: [...ids] };
    return this.transport.request<VectorItemResponse[]>(
      "POST",
      `/v1/vector/collections/${encode_segment(this.name)}/items/get`,
      payload,
    );
  }
}

export class RelationalTableClient {
  private readonly transport: HttpTransport;
  private readonly table_name: string;

  constructor(transport: HttpTransport, table_name: string) {
    this.transport = transport;
    this.table_name = table_name;
  }

  async insert(value: Record<string, unknown>): Promise<string> {
    const data = await this.transport.request<{ id: string }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/insert`,
      { value },
    );
    return data.id;
  }

  async update(params: RelationalUpdateParams): Promise<number> {
    const data = await this.transport.request<{ affected_rows: number }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/update`,
      {
        id: params.id,
        where: params.where,
        value: params.value,
      },
    );
    return data.affected_rows;
  }

  async delete(params: RelationalDeleteParams): Promise<number> {
    const data = await this.transport.request<{ affected_rows: number }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/delete`,
      {
        id: params.id,
        where: params.where,
      },
    );
    return data.affected_rows;
  }

  async move(params: RelationalMoveParams): Promise<number> {
    const data = await this.transport.request<{ affected_rows: number }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/move`,
      {
        to_table: params.toTable,
        id: params.id,
        where: params.where,
        field_map: params.fieldMap ?? {},
        defaults: params.defaults ?? {},
      },
    );
    return data.affected_rows;
  }

  async query(params: RelationalQueryParams = {}): Promise<unknown[]> {
    const data = await this.transport.request<{ rows: unknown[] }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/query`,
      {
        where: params.where,
        order_by: params.orderBy,
        limit: params.limit,
        offset: params.offset,
      },
    );
    return data.rows;
  }

  async count(
    params: Pick<RelationalQueryParams, "where"> = {},
  ): Promise<number> {
    const data = await this.transport.request<{ count: number }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/count`,
      {
        where: params.where,
      },
    );
    return data.count;
  }

  async first(params: RelationalQueryParams = {}): Promise<unknown | null> {
    const data = await this.transport.request<{ row: unknown | null }>(
      "POST",
      `/v1/relational/${encode_segment(this.table_name)}/first`,
      {
        where: params.where,
        order_by: params.orderBy,
        limit: params.limit,
        offset: params.offset,
      },
    );
    return data.row;
  }
}

export class SchemaClient {
  private readonly transport: HttpTransport;

  constructor(transport: HttpTransport) {
    this.transport = transport;
  }

  async apply(schema: SchemaDocument): Promise<unknown> {
    return this.transport.request<unknown>("POST", "/v1/admin/schema/apply", {
      schema,
    });
  }

  async validate(schema: SchemaDocument): Promise<{ message: string }> {
    return this.transport.request<{ message: string }>(
      "POST",
      "/v1/admin/schema/validate",
      {
        schema,
      },
    );
  }

  async get(): Promise<SchemaReadResponse> {
    return this.transport.request<SchemaReadResponse>(
      "GET",
      "/v1/admin/schema",
    );
  }
}

export class FunctionsClient {
  private readonly transport: HttpTransport;

  constructor(transport: HttpTransport) {
    this.transport = transport;
  }

  async call(
    endpoint: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const data = await this.transport.request<{ result: unknown }>(
      "POST",
      "/v1/functions/call",
      {
        endpoint,
        args,
      },
    );
    return data.result;
  }
}

export class HttpClient {
  private readonly transport: HttpTransport;
  private readonly embedding_function: EmbeddingFunction | null;
  readonly schema: SchemaClient;
  readonly functions: FunctionsClient;

  constructor(options: HttpClientOptions) {
    this.transport = new HttpTransport(options);
    this.schema = new SchemaClient(this.transport);
    this.functions = new FunctionsClient(this.transport);

    if (options.embedding_provider) {
      this.embedding_function = get_embedding_function(
        options.embedding_provider,
        { ...(options.embedding_model_config ?? {}) },
      );
    } else {
      this.embedding_function = null;
    }
  }

  async create_collection(
    name: string,
    metadata?: Metadata,
  ): Promise<HttpCollection> {
    const collection = await this.transport.request<CollectionInfo>(
      "POST",
      "/v1/vector/collections",
      {
        name,
        metadata,
      },
    );

    return new HttpCollection(
      this.transport,
      collection.name,
      collection.metadata ?? {},
      this.embedding_function,
    );
  }

  async get_collection(name: string): Promise<HttpCollection> {
    const collections = await this.list_collections();
    const collection = collections.find((item) => item.name === name);
    if (!collection) {
      throw new Error(`Collection '${name}' not found`);
    }
    return collection;
  }

  async get_or_create_collection(
    name: string,
    metadata?: Metadata,
  ): Promise<HttpCollection> {
    try {
      return await this.get_collection(name);
    } catch {
      return this.create_collection(name, metadata);
    }
  }

  async list_collections(): Promise<HttpCollection[]> {
    const rows = await this.transport.request<CollectionInfo[]>(
      "GET",
      "/v1/vector/collections",
    );
    return rows.map(
      (row) =>
        new HttpCollection(
          this.transport,
          row.name,
          row.metadata ?? {},
          this.embedding_function,
        ),
    );
  }

  async delete_collection(name: string): Promise<void> {
    await this.transport.request<{ affected_rows: number }>(
      "DELETE",
      `/v1/vector/collections/${encode_segment(name)}`,
    );
  }

  relational(table_name: string): RelationalTableClient {
    return new RelationalTableClient(this.transport, table_name);
  }

  async callquery(
    endpoint: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this.functions.call(endpoint, args);
  }

  async callmutation(
    endpoint: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this.functions.call(endpoint, args);
  }

  async close(): Promise<void> {
    // no-op; maintained for lifecycle symmetry with previous clients
  }
}

export function httpClient(options: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}
