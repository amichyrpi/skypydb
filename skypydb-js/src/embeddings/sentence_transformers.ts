import "onnxruntime-node";
import { env, pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import { EmbeddingsFunction } from "./mixins/embeddings_function";
import type { EmbeddingMatrix, EmbeddingVector } from "../types";

type SentenceTransformerOptions = {
  model?: string;
  device?: string;
  normalize_embeddings?: boolean;
  dimension?: number;
};

function l2_normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }
  if (sum === 0) {
    return vector;
  }
  const norm = Math.sqrt(sum);
  return vector.map((value) => value / norm);
}

export class SentenceTransformerEmbedding extends EmbeddingsFunction {
  private readonly model: string;
  private readonly device?: string;
  private readonly normalize_embeddings: boolean;
  private pipeline_instance: Promise<FeatureExtractionPipeline> | null;

  constructor(options: SentenceTransformerOptions = {}) {
    super(options.dimension);
    this.model = options.model ?? "all-MiniLM-L6-v2";
    this.device = options.device;
    this.normalize_embeddings = options.normalize_embeddings ?? false;
    this.pipeline_instance = null;
  }

  private async get_pipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipeline_instance) {
      this.pipeline_instance = (async () => {
        try {
          env.allowLocalModels = true;
          return await pipeline(
            "feature-extraction",
            this.model,
            {
              device: this.device ?? "cpu"
            } as Record<string, unknown>
          );
        } catch (error) {
          throw new Error(
            `ONNX runtime backend is required for sentence-transformers. Failed to load model '${this.model}': ${String(
              error
            )}`
          );
        }
      })();
    }
    return this.pipeline_instance;
  }

  private async run_model(texts: string[]): Promise<EmbeddingMatrix> {
    if (texts.length === 0) {
      return [];
    }

    const extractor = await this.get_pipeline();
    const output = (await extractor(texts, {
      pooling: "mean",
      normalize: false
    })) as {
      tolist?: () => unknown;
      data?: Float32Array;
      dims?: number[];
    };

    let rows: number[][];

    if (typeof output.tolist === "function") {
      const list_data = output.tolist();
      if (Array.isArray(list_data) && Array.isArray(list_data[0])) {
        rows = (list_data as number[][]).map((row) => row.map((value) => Number(value)));
      } else if (Array.isArray(list_data)) {
        rows = [list_data.map((value) => Number(value))];
      } else {
        throw new Error("Unexpected sentence-transformers output structure.");
      }
    } else if (output.data && output.dims && output.dims.length === 2) {
      const [row_count, col_count] = output.dims;
      rows = [];
      for (let row = 0; row < row_count; row += 1) {
        const start = row * col_count;
        rows.push(Array.from(output.data.slice(start, start + col_count)));
      }
    } else {
      throw new Error("Unexpected sentence-transformers output structure.");
    }

    if (this.normalize_embeddings) {
      rows = rows.map((row) => l2_normalize(row));
    }

    if (this._dimension === null && rows.length > 0) {
      this._dimension = rows[0].length;
    }
    return rows;
  }

  protected async _get_embedding(text: string): Promise<EmbeddingVector> {
    const rows = await this.run_model([text]);
    return rows[0] ?? [];
  }

  async embed(texts: string[]): Promise<EmbeddingMatrix> {
    return this.run_model(texts);
  }
}
