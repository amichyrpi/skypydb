import { EmbeddingCallableMixin } from "./embedding_callable_mixin";
import type { EmbeddingMatrix, EmbeddingVector } from "../../types";

export abstract class EmbeddingsFunction extends EmbeddingCallableMixin {
  protected _dimension: number | null;

  constructor(dimension?: number) {
    super();
    this._dimension = dimension ?? null;
  }

  protected abstract _get_embedding(text: string): Promise<EmbeddingVector>;

  async embed(texts: string[]): Promise<EmbeddingMatrix> {
    const embeddings: EmbeddingMatrix = [];
    for (const text of texts) {
      const vector = await this._get_embedding(text);
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
      const test_vector = await this._get_embedding("test");
      this._dimension = test_vector.length;
    }
    return this._dimension;
  }
}
