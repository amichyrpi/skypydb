import { CollectionNotFoundError } from "../../../errors";
import { InputValidator } from "../../../security/validation";
import type { GetResult, Metadata } from "../../../types";
import { UpdateItemsMixin } from "./update_items";

type InternalItem = {
  id: string;
  document: string | null;
  embedding: number[];
  metadata: Metadata | null;
  created_at: string;
};

export abstract class GetItemsMixin extends UpdateItemsMixin {
  get(
    collection_name: string,
    ids?: string[],
    where?: Record<string, unknown>,
    where_document?: Record<string, string>,
    include?: Array<"embeddings" | "documents" | "metadatas" | "distances">
  ): GetResult {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }

    const include_keys = include ?? ["embeddings", "documents", "metadatas"];
    let rows: Array<{
      id: string;
      document: string | null;
      embedding: string;
      metadata: string | null;
      created_at: string;
    }>;

    if (ids) {
      const placeholders = ids.map(() => "?").join(", ");
      rows = this.conn
        .prepare(`SELECT * FROM [vec_${validated}] WHERE id IN (${placeholders})`)
        .all(...ids) as typeof rows;
    } else {
      rows = this.conn.prepare(`SELECT * FROM [vec_${validated}]`).all() as typeof rows;
    }

    const result: GetResult = {
      ids: [],
      embeddings: include_keys.includes("embeddings") ? [] : null,
      documents: include_keys.includes("documents") ? [] : null,
      metadatas: include_keys.includes("metadatas") ? [] : null
    };

    for (const row of rows) {
      const item: InternalItem = {
        id: row.id,
        document: row.document,
        embedding: JSON.parse(row.embedding) as number[],
        metadata: row.metadata ? (JSON.parse(row.metadata) as Metadata) : null,
        created_at: row.created_at
      };

      if (!this._matches_filters(item, where, where_document)) {
        continue;
      }

      result.ids.push(item.id);
      if (result.embeddings) {
        result.embeddings.push(item.embedding);
      }
      if (result.documents) {
        result.documents.push(item.document);
      }
      if (result.metadatas) {
        result.metadatas.push(item.metadata);
      }
    }

    return result;
  }

  protected _get_all_items(collection_name: string): InternalItem[] {
    const rows = this.conn.prepare(`SELECT * FROM [vec_${collection_name}]`).all() as Array<{
      id: string;
      document: string | null;
      embedding: string;
      metadata: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      document: row.document,
      embedding: JSON.parse(row.embedding) as number[],
      metadata: row.metadata ? (JSON.parse(row.metadata) as Metadata) : null,
      created_at: row.created_at
    }));
  }
}
