import { EmbeddingsFunction } from "./mixins/embeddings_function";
import type { EmbeddingMatrix, EmbeddingVector } from "../types";

type OllamaEmbeddingOptions = {
  model?: string;
  base_url?: string;
  dimension?: number;
};

export class OllamaEmbedding extends EmbeddingsFunction {
  private readonly model: string;
  private readonly base_url: string;

  constructor(options: OllamaEmbeddingOptions = {}) {
    super(options.dimension);
    this.model = options.model ?? "mxbai-embed-large";
    this.base_url = (options.base_url ?? "http://localhost:11434").replace(
      /\/+$/,
      "",
    );
  }

  protected async _get_embedding(text: string): Promise<EmbeddingVector> {
    const response = await fetch(`${this.base_url}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Cannot connect to Ollama at ${this.base_url}. Status: ${response.status}.`,
      );
    }

    const payload = (await response.json()) as { embedding?: number[] };
    if (!Array.isArray(payload.embedding)) {
      throw new Error(
        `No embedding returned from Ollama. Make sure model '${this.model}' is an embedding model.`,
      );
    }
    return payload.embedding;
  }

  async embed(texts: string[]): Promise<EmbeddingMatrix> {
    if (texts.length === 0) {
      return [];
    }
    return super.embed(texts);
  }
}
