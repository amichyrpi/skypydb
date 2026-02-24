import type { EmbeddingMatrix } from "../types";

/**
 * Base callable interface for embedding providers.
 */
export abstract class EmbeddingCallable {
  abstract embed(texts: string[]): Promise<EmbeddingMatrix>;

  async call(texts: string[]): Promise<EmbeddingMatrix> {
    return this.embed(texts);
  }
}
