import type { EmbeddingFunction } from "../../../types";
import { DeleteCollectionMixin } from "./collections";

export abstract class EmbeddingFunctionMixin extends DeleteCollectionMixin {
  embedding_function: EmbeddingFunction | null = null;

  set_embedding_function(embedding_function: EmbeddingFunction | null): void {
    this.embedding_function = embedding_function;
  }
}
