import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { LoggerService } from "../logging";
import {
  AddItemsMixin,
  CountItemsMixin,
  CreateCollectionMixin,
  DeleteCollectionMixin,
  DeleteItemsMixin,
  GetCollectionMixin,
  GetItemsMixin,
  QueryItemsMixin,
  UpdateItemsMixin,
} from "./operations/vector";
import type {
  CollectionInfo,
  EmbeddingFunction,
  GetResult,
  Metadata,
  QueryResult,
} from "../types";

type OperationStatus = "success" | "error";

type RecordOperationArgs = {
  operation: string;
  status: OperationStatus;
  details: Record<string, unknown>;
  collection?: string;
  duration_ms?: number;
  error?: string;
  refresh_snapshot?: boolean;
  operation_at?: string;
};

/**
 * SQLite-backed vector storage engine used by the client and collection APIs.
 * This class wraps low-level collection/item operations and records operation telemetry.
 */
export class VectorDatabase extends DeleteItemsMixin {
  readonly path: string;
  protected conn: Database.Database;
  private readonly logger_service: LoggerService;

  constructor(
    path_value: string,
    embedding_function?: EmbeddingFunction | null,
  ) {
    super();
    this.path = path_value;
    fs.mkdirSync(path.dirname(path_value), { recursive: true });
    this.conn = new Database(path_value);
    this.conn.pragma("journal_mode = WAL");

    this._ensure_collections_table();
    this.embedding_function = embedding_function ?? null;

    this.logger_service = new LoggerService(this.path);
    const initialized_at = this._utcnow_iso();
    this._record_operation({
      operation: "initialize",
      status: "success",
      details: { db_path: this.path },
      duration_ms: 0,
      refresh_snapshot: true,
      operation_at: initialized_at,
    });
  }

  private _utcnow_iso(): string {
    return new Date().toISOString();
  }

  private _duration_ms(start: bigint): number {
    return Number((process.hrtime.bigint() - start) / 1_000_000n);
  }

  private _record_operation(args: RecordOperationArgs): void {
    try {
      this.logger_service.log_event({
        operation: args.operation,
        status: args.status,
        details: args.details,
        collection: args.collection,
        duration_ms: args.duration_ms,
        error: args.error,
      });

      if (args.refresh_snapshot) {
        this.logger_service.refresh_full_snapshot(this.conn, {
          last_operation: args.operation,
          last_status: args.status,
          last_collection: args.collection,
          last_operation_at: args.operation_at,
        });
      } else {
        this.logger_service.update_last_operation_only(
          args.operation,
          args.status,
          args.collection,
          args.operation_at,
        );
      }
    } catch (error) {
      console.warn(`Logger operation recording failed: ${String(error)}`);
    }
  }

  private _collection_has_metadata(collection_name: string): boolean {
    try {
      const collection = GetCollectionMixin.prototype.get_collection.call(
        this,
        collection_name,
      ) as CollectionInfo | null;
      return (
        collection !== null &&
        Object.prototype.hasOwnProperty.call(collection, "metadata") &&
        collection.metadata !== null
      );
    } catch {
      return false;
    }
  }

  create_collection(name: string, metadata?: Metadata): void {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      CreateCollectionMixin.prototype.create_collection.call(
        this,
        name,
        metadata,
      );
    } catch (error) {
      this._record_operation({
        operation: "create_collection",
        status: "error",
        details: { has_metadata: false },
        collection: name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }

    this._record_operation({
      operation: "create_collection",
      status: "success",
      details: { has_metadata: this._collection_has_metadata(name) },
      collection: name,
      duration_ms: this._duration_ms(start),
      refresh_snapshot: true,
      operation_at,
    });
  }

  get_collection(name: string): CollectionInfo | null {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      const result = GetCollectionMixin.prototype.get_collection.call(
        this,
        name,
      ) as CollectionInfo | null;
      this._record_operation({
        operation: "get_collection",
        status: "success",
        details: { found: result !== null },
        collection: name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      return result;
    } catch (error) {
      this._record_operation({
        operation: "get_collection",
        status: "error",
        details: {},
        collection: name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  get_or_create_collection(name: string, metadata?: Metadata): CollectionInfo {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();
    let created = false;

    try {
      let result = GetCollectionMixin.prototype.get_collection.call(
        this,
        name,
      ) as CollectionInfo | null;
      if (!result) {
        CreateCollectionMixin.prototype.create_collection.call(
          this,
          name,
          metadata,
        );
        created = true;
        result = GetCollectionMixin.prototype.get_collection.call(
          this,
          name,
        ) as CollectionInfo | null;
      }
      if (!result) {
        throw new Error(`Collection '${name}' not found after get_or_create`);
      }

      this._record_operation({
        operation: "get_or_create_collection",
        status: "success",
        details: { created, has_metadata: result.metadata !== null },
        collection: name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: created,
        operation_at,
      });
      return result;
    } catch (error) {
      this._record_operation({
        operation: "get_or_create_collection",
        status: "error",
        details: { created, has_metadata: false },
        collection: name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  list_collections(): CollectionInfo[] {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      const collections = GetCollectionMixin.prototype.list_collections.call(
        this,
      ) as CollectionInfo[];
      this._record_operation({
        operation: "list_collections",
        status: "success",
        details: { collections_count: collections.length },
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      return collections;
    } catch (error) {
      this._record_operation({
        operation: "list_collections",
        status: "error",
        details: {},
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  count(collection_name: string): number {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      const count_value = CountItemsMixin.prototype.count.call(
        this,
        collection_name,
      ) as number;
      this._record_operation({
        operation: "count",
        status: "success",
        details: { document_count: count_value },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      return count_value;
    } catch (error) {
      this._record_operation({
        operation: "count",
        status: "error",
        details: {},
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  async add(
    collection_name: string,
    ids: string[],
    embeddings?: number[][],
    documents?: string[],
    metadatas?: Metadata[],
  ): Promise<string[]> {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      const added_ids = (await AddItemsMixin.prototype.add.call(
        this,
        collection_name,
        ids,
        embeddings,
        documents,
        metadatas,
      )) as string[];
      this._record_operation({
        operation: "add",
        status: "success",
        details: {
          ids_count: ids.length,
          added_count: added_ids.length,
          embeddings_provided: embeddings !== undefined,
          documents_provided: documents !== undefined,
          metadatas_provided: metadatas !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: true,
        operation_at,
      });
      return added_ids;
    } catch (error) {
      this._record_operation({
        operation: "add",
        status: "error",
        details: {
          ids_count: ids.length,
          embeddings_provided: embeddings !== undefined,
          documents_provided: documents !== undefined,
          metadatas_provided: metadatas !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  async update(
    collection_name: string,
    ids: string[],
    embeddings?: number[][],
    documents?: string[],
    metadatas?: Metadata[],
  ): Promise<void> {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      await UpdateItemsMixin.prototype.update.call(
        this,
        collection_name,
        ids,
        embeddings,
        documents,
        metadatas,
      );
      this._record_operation({
        operation: "update",
        status: "success",
        details: {
          ids_count: ids.length,
          embeddings_provided: embeddings !== undefined,
          documents_provided: documents !== undefined,
          metadatas_provided: metadatas !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: true,
        operation_at,
      });
    } catch (error) {
      this._record_operation({
        operation: "update",
        status: "error",
        details: {
          ids_count: ids.length,
          embeddings_provided: embeddings !== undefined,
          documents_provided: documents !== undefined,
          metadatas_provided: metadatas !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  async query(
    collection_name: string,
    query_embeddings?: number[][],
    query_texts?: string[],
    n_results = 10,
    where?: Record<string, unknown>,
    where_document?: Record<string, string>,
    include?: Array<"embeddings" | "documents" | "metadatas" | "distances">,
  ): Promise<QueryResult> {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();
    const query_count = (query_embeddings ?? query_texts ?? []).length;

    try {
      const results = (await QueryItemsMixin.prototype.query.call(
        this,
        collection_name,
        query_embeddings,
        query_texts,
        n_results,
        where,
        where_document,
        include,
      )) as QueryResult;
      const returned_count = results.ids.reduce(
        (total, row) => total + row.length,
        0,
      );
      this._record_operation({
        operation: "query",
        status: "success",
        details: {
          query_count,
          n_results,
          returned_count,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      return results;
    } catch (error) {
      this._record_operation({
        operation: "query",
        status: "error",
        details: {
          query_count,
          n_results,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  get(
    collection_name: string,
    ids?: string[],
    where?: Record<string, unknown>,
    where_document?: Record<string, string>,
    include?: Array<"embeddings" | "documents" | "metadatas" | "distances">,
  ): GetResult {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();
    const ids_count = ids ? ids.length : 0;

    try {
      const results = GetItemsMixin.prototype.get.call(
        this,
        collection_name,
        ids,
        where,
        where_document,
        include,
      ) as GetResult;
      this._record_operation({
        operation: "get",
        status: "success",
        details: {
          ids_count,
          returned_count: results.ids.length,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      return results;
    } catch (error) {
      this._record_operation({
        operation: "get",
        status: "error",
        details: {
          ids_count,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  delete(
    collection_name: string,
    ids?: string[],
    where?: Record<string, unknown>,
    where_document?: Record<string, string>,
  ): number {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();
    const ids_count = ids ? ids.length : 0;

    try {
      const deleted_count = DeleteItemsMixin.prototype.delete.call(
        this,
        collection_name,
        ids,
        where,
        where_document,
      ) as number;
      this._record_operation({
        operation: "delete",
        status: "success",
        details: {
          ids_count,
          deleted_count,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: true,
        operation_at,
      });
      return deleted_count;
    } catch (error) {
      this._record_operation({
        operation: "delete",
        status: "error",
        details: {
          ids_count,
          has_where: where !== undefined,
          has_where_document: where_document !== undefined,
        },
        collection: collection_name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  delete_collection(name: string): void {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      DeleteCollectionMixin.prototype.delete_collection.call(this, name);
      this._record_operation({
        operation: "delete_collection",
        status: "success",
        details: {},
        collection: name,
        duration_ms: this._duration_ms(start),
        refresh_snapshot: true,
        operation_at,
      });
    } catch (error) {
      this._record_operation({
        operation: "delete_collection",
        status: "error",
        details: {},
        collection: name,
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }

  reset(): void {
    for (const collection of this.list_collections()) {
      this.delete_collection(collection.name);
    }
  }

  clear(): void {
    this.reset();
  }

  close(): void {
    const start = process.hrtime.bigint();
    const operation_at = this._utcnow_iso();

    try {
      this.conn.close();
      this._record_operation({
        operation: "close",
        status: "success",
        details: {},
        duration_ms: this._duration_ms(start),
        refresh_snapshot: false,
        operation_at,
      });
      this.logger_service.close();
    } catch (error) {
      this._record_operation({
        operation: "close",
        status: "error",
        details: {},
        duration_ms: this._duration_ms(start),
        error: String(error),
        refresh_snapshot: false,
        operation_at,
      });
      throw error;
    }
  }
}
