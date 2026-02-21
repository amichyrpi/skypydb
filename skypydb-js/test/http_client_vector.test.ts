import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../src";

function json_response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HTTP vector client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates collections and sends vector item operations over HTTP", async () => {
    const fetch_mock = vi
      .fn()
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: {
            id: "col_1",
            name: "docs",
            metadata: { source: "tests" },
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: ["id1"],
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: [
            { id: "id1", document: "hello world", metadata: { tag: "a" } },
            { id: "id2", document: "skip me", metadata: { tag: "b" } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: [
            { id: "id1", document: "hello world", metadata: { tag: "a" } },
            { id: "id2", document: "skip me", metadata: { tag: "b" } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: {
            ids: [["id1", "id2"]],
            documents: [["hello world", "skip me"]],
            metadatas: [[{ tag: "a" }, { tag: "b" }]],
            distances: [[0.1, 0.2]],
          },
        }),
      );

    vi.stubGlobal("fetch", fetch_mock as unknown as typeof fetch);

    const client = httpClient({
      api_url: "http://localhost:8000",
      api_key: "local-dev-key",
    });
    const collection = await client.create_collection("docs", {
      source: "tests",
    });

    await collection.add({
      ids: ["id1"],
      embeddings: [[0.1, 0.2]],
      data: ["hello world"],
      metadatas: [{ tag: "a" }],
    });

    const get_result = await collection.get({
      where: { tag: { $eq: "a" } },
      include: ["documents", "metadatas"],
      limit: 1,
    });
    expect(get_result.ids).toEqual(["id1"]);
    expect(get_result.documents).toEqual(["hello world"]);
    expect(get_result.metadatas).toEqual([{ tag: "a" }]);

    const query_result = await collection.query({
      query_embeddings: [[0.2, 0.3]],
      where: { tag: { $eq: "a" } },
      n_results: 1,
      include: ["documents", "distances"],
    });
    expect(query_result.ids).toEqual([["id1"]]);
    expect(query_result.documents).toEqual([["hello world"]]);
    expect(query_result.distances).toEqual([[0.1]]);

    expect(fetch_mock).toHaveBeenCalled();
    const first_call = fetch_mock.mock.calls[0];
    expect(String(first_call[0])).toContain("/v1/vector/collections");
    expect((first_call[1] as RequestInit).headers).toMatchObject({
      "X-API-Key": "local-dev-key",
    });
  });

  it("auto-generates embeddings from documents/query_texts when provider is configured", async () => {
    const fetch_mock = vi
      .fn()
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: [
            {
              id: "col_1",
              name: "docs",
              metadata: {},
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(json_response(200, { embedding: [0.1, 0.2, 0.3] }))
      .mockResolvedValueOnce(json_response(200, { ok: true, data: ["a"] }))
      .mockResolvedValueOnce(json_response(200, { embedding: [0.4, 0.5, 0.6] }))
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: {
            ids: [["a"]],
            documents: [["hello"]],
            metadatas: [[{ topic: "x" }]],
            distances: [[0.1]],
          },
        }),
      );

    vi.stubGlobal("fetch", fetch_mock as unknown as typeof fetch);

    const client = httpClient({
      api_url: "http://localhost:8000",
      api_key: "local-dev-key",
      embedding_provider: "ollama",
    });

    const collection = await client.get_collection("docs");
    await collection.add({
      ids: ["a"],
      data: ["hello"],
      metadatas: [{ topic: "x" }],
    });
    await collection.query({
      query_texts: ["hello"],
      n_results: 1,
    });

    const urls = fetch_mock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("11434/api/embeddings"))).toBe(true);
    expect(urls.some((url) => url.includes("/v1/vector/collections/docs/items/add"))).toBe(
      true,
    );
    expect(urls.some((url) => url.includes("/v1/vector/collections/docs/query"))).toBe(
      true,
    );
  });
});
