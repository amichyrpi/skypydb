import type { EmbeddingVector } from "../../types";

type EmbeddingProviderLike = {
  _get_embedding?: (text: string) => Promise<EmbeddingVector>;
};

export async function get_embedding(
  provider: unknown,
  text: string
): Promise<EmbeddingVector> {
  const candidate = provider as EmbeddingProviderLike;

  if (typeof candidate._get_embedding === "function") {
    return candidate._get_embedding(text);
  }

  throw new Error(
    `${(candidate as { constructor?: { name?: string } }).constructor?.name ?? "Provider"} must implement _get_embedding.`
  );
}

