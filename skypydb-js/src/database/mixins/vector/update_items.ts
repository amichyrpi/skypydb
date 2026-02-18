import { CollectionNotFoundError } from "../../../errors";
import { InputValidator } from "../../../security/validation";
import type { EmbeddingMatrix, Metadata } from "../../../types";
import { AddItemsMixin } from "./add_items";

export abstract class UpdateItemsMixin extends AddItemsMixin {
  async update(
    collection_name: string,
    ids: string[],
    embeddings?: EmbeddingMatrix,
    documents?: string[],
    metadatas?: Metadata[]
  ): Promise<void> {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }

    let resolved_embeddings = embeddings;
    if (!resolved_embeddings && documents) {
      if (!this.embedding_function) {
        throw new Error("Documents provided but no embedding function set.");
      }
      resolved_embeddings = await this.embedding_function(documents);
    }

    for (let index = 0; index < ids.length; index += 1) {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (resolved_embeddings) {
        updates.push("embedding = ?");
        params.push(JSON.stringify(resolved_embeddings[index]));
      }
      if (documents) {
        updates.push("document = ?");
        params.push(documents[index]);
      }
      if (metadatas) {
        updates.push("metadata = ?");
        params.push(metadatas[index] ? JSON.stringify(metadatas[index]) : null);
      }

      if (updates.length > 0) {
        const query = `UPDATE [vec_${validated}] SET ${updates.join(", ")} WHERE id = ?`;
        this.conn.prepare(query).run(...params, ids[index]);
      }
    }
  }
}
