import { CollectionNotFoundError } from "../../../errors";
import { InputValidator } from "../../../security/validation";
import type { EmbeddingMatrix, Metadata } from "../../../types";
import { EmbeddingFunctionMixin } from "./embedding_function";

export abstract class AddItemsMixin extends EmbeddingFunctionMixin {
  async add(
    collection_name: string,
    ids: string[],
    embeddings?: EmbeddingMatrix,
    documents?: string[],
    metadatas?: Metadata[]
  ): Promise<string[]> {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }
    if (!embeddings && !documents) {
      throw new Error("Either embeddings or documents must be provided");
    }

    let resolved_embeddings = embeddings;
    if (!resolved_embeddings) {
      if (!this.embedding_function) {
        throw new Error(
          "Documents provided but no embedding function set. Either provide embeddings directly or set an embedding_function."
        );
      }
      resolved_embeddings = await this.embedding_function(documents ?? []);
    }

    const n_items = ids.length;
    if (resolved_embeddings.length !== n_items) {
      throw new Error(
        `Number of embeddings (${resolved_embeddings.length}) doesn't match number of IDs (${n_items})`
      );
    }
    if (documents && documents.length !== n_items) {
      throw new Error(
        `Number of documents (${documents.length}) doesn't match number of IDs (${n_items})`
      );
    }
    if (metadatas && metadatas.length !== n_items) {
      throw new Error(
        `Number of metadatas (${metadatas.length}) doesn't match number of IDs (${n_items})`
      );
    }

    const statement = this.conn.prepare(
      `
      INSERT OR REPLACE INTO [vec_${validated}]
      (id, document, embedding, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
      `
    );

    const now = new Date().toISOString();
    for (let index = 0; index < n_items; index += 1) {
      statement.run(
        ids[index],
        documents ? documents[index] : null,
        JSON.stringify(resolved_embeddings[index]),
        metadatas ? JSON.stringify(metadatas[index]) : null,
        now
      );
    }

    return ids;
  }
}
