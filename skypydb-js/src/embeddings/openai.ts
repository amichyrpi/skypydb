import OpenAI from "openai";
import { EmbeddingsFunction } from "./mixins/embeddings_function";
import type { EmbeddingMatrix, EmbeddingVector } from "../types";

type OpenAIEmbeddingOptions = {
  api_key?: string;
  model?: string;
  base_url?: string;
  organization?: string;
  project?: string;
  timeout?: number;
  dimension?: number;
};

export class OpenAIEmbedding extends EmbeddingsFunction {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIEmbeddingOptions = {}) {
    super(options.dimension);
    const api_key = options.api_key ?? process.env.OPENAI_API_KEY;
    if (!api_key) {
      throw new Error(
        "OpenAI API key is required. Provide `api_key` or set OPENAI_API_KEY.",
      );
    }

    this.model = options.model ?? "text-embedding-3-small";
    this.client = new OpenAI({
      apiKey: api_key,
      baseURL: options.base_url,
      organization: options.organization,
      project: options.project,
      timeout: options.timeout,
    });
  }

  protected async _get_embedding(text: string): Promise<EmbeddingVector> {
    const result = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    const vector = result.data[0]?.embedding;
    if (!vector) {
      throw new Error("OpenAI embedding generation returned no vectors.");
    }
    return Array.from(vector);
  }

  async embed(texts: string[]): Promise<EmbeddingMatrix> {
    if (texts.length === 0) {
      return [];
    }
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    const embeddings = response.data.map((entry) =>
      Array.from(entry.embedding),
    );
    if (this._dimension === null && embeddings.length > 0) {
      this._dimension = embeddings[0].length;
    }
    return embeddings;
  }
}
