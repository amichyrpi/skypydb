import type { EmbeddingFunction } from "../../types";
import { OllamaEmbedding } from "../ollama";
import { OpenAIEmbedding } from "../openai";
import { SentenceTransformerEmbedding } from "../sentence_transformers";
export { get_embedding } from "./get_embedding";

function validate_remaining_config(
  provider: string,
  config: Record<string, unknown>,
): void {
  const keys = Object.keys(config);
  if (keys.length > 0) {
    throw new Error(
      `Unsupported embedding config keys for provider '${provider}': ${keys.sort().join(", ")}`,
    );
  }
}

export function get_embedding_function(
  provider = "ollama",
  config: Record<string, unknown> = {},
): EmbeddingFunction {
  const normalized = provider.toLowerCase().trim().replace(/_/g, "-");
  const mutable = { ...config };

  if (normalized === "ollama") {
    const model = (mutable.model as string | undefined) ?? "mxbai-embed-large";
    const base_url =
      (mutable.base_url as string | undefined) ?? "http://localhost:11434";
    const dimension = mutable.dimension as number | undefined;
    delete mutable.model;
    delete mutable.base_url;
    delete mutable.dimension;
    validate_remaining_config(normalized, mutable);
    const provider_instance = new OllamaEmbedding({
      model,
      base_url,
      dimension,
    });
    return provider_instance.embed.bind(provider_instance);
  }

  if (normalized === "openai") {
    const api_key = mutable.api_key as string | undefined;
    const model =
      (mutable.model as string | undefined) ?? "text-embedding-3-small";
    const base_url = mutable.base_url as string | undefined;
    const organization = mutable.organization as string | undefined;
    const project = mutable.project as string | undefined;
    const timeout = mutable.timeout as number | undefined;
    const dimension = mutable.dimension as number | undefined;
    delete mutable.api_key;
    delete mutable.model;
    delete mutable.base_url;
    delete mutable.organization;
    delete mutable.project;
    delete mutable.timeout;
    delete mutable.dimension;
    validate_remaining_config(normalized, mutable);
    const provider_instance = new OpenAIEmbedding({
      api_key,
      model,
      base_url,
      organization,
      project,
      timeout,
      dimension,
    });
    return provider_instance.embed.bind(provider_instance);
  }

  if (normalized === "sentence-transformers") {
    const model = (mutable.model as string | undefined) ?? "all-MiniLM-L6-v2";
    const device = mutable.device as string | undefined;
    const normalize_embeddings =
      (mutable.normalize_embeddings as boolean | undefined) ?? false;
    const dimension = mutable.dimension as number | undefined;
    delete mutable.model;
    delete mutable.device;
    delete mutable.normalize_embeddings;
    delete mutable.dimension;
    validate_remaining_config(normalized, mutable);
    const provider_instance = new SentenceTransformerEmbedding({
      model,
      device,
      normalize_embeddings,
      dimension,
    });
    return provider_instance.embed.bind(provider_instance);
  }

  throw new Error(
    `Unsupported embedding provider '${provider}'. Supported providers: ollama, openai, sentence-transformers.`,
  );
}
