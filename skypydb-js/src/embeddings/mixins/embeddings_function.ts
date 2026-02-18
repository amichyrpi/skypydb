import { EmbeddingCallableMixin } from "../../utils/embedding_callable_mixin";
import { get_embedding } from "./get_embeddings_function";
import type { EmbeddingMatrix } from "../../types";

export abstract class EmbeddingsFunction extends EmbeddingCallableMixin {
  protected _dimension: number | null;

  constructor(dimension?: number) {
    super();
    this._dimension = dimension ?? null;
  }

  async embed(texts: string[]): Promise<EmbeddingMatrix> {
    const embeddings: EmbeddingMatrix = [];
    for (const text of texts) {
      const vector = await get_embedding(this, text);
      embeddings.push(vector);
      if (this._dimension === null) {
        this._dimension = vector.length;
      }
    }
    return embeddings;
  }

  dimension(): number | null {
    return this._dimension;
  }

  async get_dimension(): Promise<number> {
    if (this._dimension === null) {
      const test_vector = await get_embedding(this, "test");
      this._dimension = test_vector.length;
    }
    return this._dimension;
  }
}
