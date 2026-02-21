import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpTransportError, httpClient } from "../src";

function json_response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HTTP relational and schema client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps relational CRUD/move/query/count/first and schema endpoints", async () => {
    const fetch_mock = vi
      .fn()
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { applied_tables: ["users"] },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { message: "schema is valid" },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { schema: null, schema_signature: null },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { id: "user_1" },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { affected_rows: 1 },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { affected_rows: 1 },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { rows: [{ _id: "user_1", name: "Theo" }] },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { count: 1 },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { row: { _id: "user_1", name: "Theo" } },
        }),
      )
      .mockResolvedValueOnce(
        json_response(200, {
          ok: true,
          data: { affected_rows: 1 },
        }),
      );

    vi.stubGlobal("fetch", fetch_mock as unknown as typeof fetch);

    const client = httpClient({
      api_url: "http://localhost:8000",
      api_key: "local-dev-key",
    });

    await client.schema.apply({ tables: {} });
    await client.schema.validate({ tables: {} });
    await client.schema.get();

    const users = client.relational("users");
    expect(await users.insert({ name: "Theo" })).toBe("user_1");
    expect(
      await users.update({
        id: "user_1",
        value: { name: "Theo Updated" },
      }),
    ).toBe(1);
    expect(
      await users.move({
        toTable: "users_archive",
        where: { name: { $eq: "Theo Updated" } },
      }),
    ).toBe(1);
    expect(await users.query()).toEqual([{ _id: "user_1", name: "Theo" }]);
    expect(await users.count()).toBe(1);
    expect(await users.first()).toEqual({ _id: "user_1", name: "Theo" });
    expect(await users.delete({ id: "user_1" })).toBe(1);

    const urls = fetch_mock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("http://localhost:8000/v1/admin/schema/apply");
    expect(urls).toContain("http://localhost:8000/v1/relational/users/insert");
    expect(urls).toContain("http://localhost:8000/v1/relational/users/move");
  });

  it("maps backend errors to HttpTransportError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json_response(401, {
            error: "UnauthorizedError",
            message: "invalid API key",
          }),
        ) as unknown as typeof fetch,
    );

    const client = httpClient({
      api_url: "http://localhost:8000",
      api_key: "bad-key",
    });

    let captured_error: unknown;
    try {
      await client.list_collections();
    } catch (error) {
      captured_error = error;
    }

    expect(captured_error).toBeInstanceOf(HttpTransportError);
    expect(captured_error).toMatchObject({
      status_code: 401,
      error_type: "UnauthorizedError",
    });
  });
});
