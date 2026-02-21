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

/**
 * Backward compatible alias kept for existing internal imports.
 */
export abstract class EmbeddingCallableMixin extends EmbeddingCallable {}
