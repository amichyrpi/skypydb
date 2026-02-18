import { afterEach, describe, expect, it, vi } from "vitest";
import { get_embedding_function } from "../src/embeddings/mixins/get_embeddings_function";
import { OllamaEmbedding } from "../src/embeddings/ollama";
import { OpenAIEmbedding } from "../src/embeddings/openai";

describe("embeddings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("validates unsupported provider config keys", () => {
    expect(() =>
      get_embedding_function("ollama", {
        model: "mxbai-embed-large",
        unknown: "value"
      })
    ).toThrow("Unsupported embedding config keys");
  });

  it("ollama provider returns embeddings", async () => {
    const fetch_mock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2, 0.3] })
    }));
    vi.stubGlobal("fetch", fetch_mock as unknown as typeof fetch);

    const provider = new OllamaEmbedding({
      model: "mxbai-embed-large",
      base_url: "http://localhost:11434"
    });
    const vectors = await provider.embed(["hello"]);
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
  });

  it("openai provider requires API key", () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(() => new OpenAIEmbedding({})).toThrow("OpenAI API key is required");
    if (previous !== undefined) {
      process.env.OPENAI_API_KEY = previous;
    }
  });

  it("sentence-transformers provider runs with mocked ONNX pipeline", async () => {
    vi.mock("@xenova/transformers", () => ({
      env: {
        allowLocalModels: false
      },
      pipeline: vi.fn(async () => async (texts: string[]) => ({
        tolist: () => texts.map(() => [1, 2, 3])
      }))
    }));
    vi.mock("onnxruntime-node", () => ({}));

    const module = await import("../src/embeddings/sentence_transformers");
    const provider = new module.SentenceTransformerEmbedding({
      model: "all-MiniLM-L6-v2",
      normalize_embeddings: true
    });

    const vectors = await provider.embed(["one", "two"]);
    expect(vectors.length).toBe(2);
    expect(vectors[0].length).toBe(3);
  });
});
