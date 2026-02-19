import { CollectionNotFoundError } from "../../../errors";
import { InputValidator } from "../../../security/validation";
import { cosine_similarity } from "../../../utils/distance_metrics";
import type { Metadata, QueryResult } from "../../../types";
import { GetItemsMixin } from "./get_items";

export abstract class QueryItemsMixin extends GetItemsMixin {
  async query(
    collection_name: string,
    query_embeddings?: number[][],
    query_texts?: string[],
    n_results = 10,
    where?: Record<string, unknown>,
    where_document?: Record<string, string>,
    include?: Array<"embeddings" | "documents" | "metadatas" | "distances">,
  ): Promise<QueryResult> {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }
    if (!query_embeddings && !query_texts) {
      throw new Error(
        "Either query_embeddings or query_texts must be provided",
      );
    }

    let resolved_query_embeddings = query_embeddings;
    if (!resolved_query_embeddings) {
      if (!this.embedding_function) {
        throw new Error("Query texts provided but no embedding function set.");
      }
      resolved_query_embeddings = await this.embedding_function(
        query_texts ?? [],
      );
    }

    const include_keys = include ?? [
      "embeddings",
      "documents",
      "metadatas",
      "distances",
    ];
    const all_items = this._get_all_items(validated);

    const results: QueryResult = {
      ids: [],
      embeddings: include_keys.includes("embeddings") ? [] : null,
      documents: include_keys.includes("documents") ? [] : null,
      metadatas: include_keys.includes("metadatas") ? [] : null,
      distances: include_keys.includes("distances") ? [] : null,
    };

    for (const query_embedding of resolved_query_embeddings) {
      const scored: Array<{
        item: (typeof all_items)[number];
        distance: number;
      }> = [];

      for (const item of all_items) {
        if (!this._matches_filters(item, where, where_document)) {
          continue;
        }
        const similarity = cosine_similarity(query_embedding, item.embedding);
        scored.push({
          item,
          distance: 1 - similarity,
        });
      }

      scored.sort((left, right) => left.distance - right.distance);
      const top = scored.slice(0, n_results);

      const query_ids: string[] = [];
      const query_embeddings_result: number[][] = [];
      const query_documents: Array<string | null> = [];
      const query_metadatas: Array<Metadata | null> = [];
      const query_distances: number[] = [];

      for (const { item, distance } of top) {
        query_ids.push(item.id);
        query_embeddings_result.push(item.embedding);
        query_documents.push(item.document);
        query_metadatas.push(item.metadata);
        query_distances.push(distance);
      }

      results.ids.push(query_ids);
      if (results.embeddings) {
        results.embeddings.push(query_embeddings_result);
      }
      if (results.documents) {
        results.documents.push(query_documents);
      }
      if (results.metadatas) {
        results.metadatas.push(query_metadatas);
      }
      if (results.distances) {
        results.distances.push(query_distances);
      }
    }

    return results;
  }
}
