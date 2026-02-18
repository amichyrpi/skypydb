import type { EmbeddingMatrix } from "../../types";

export abstract class EmbeddingCallableMixin {
  abstract embed(texts: string[]): Promise<EmbeddingMatrix>;

  async call(texts: string[]): Promise<EmbeddingMatrix> {
    return this.embed(texts);
  }
}
