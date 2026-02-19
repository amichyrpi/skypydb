import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vecClient } from "../src/api/vec_client";

let previous_cwd = process.cwd();
let temp_dir = "";

function read_log_entries(log_file: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(log_file)) {
    return [];
  }
  const lines = fs
    .readFileSync(log_file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("vecClient", () => {
  beforeEach(() => {
    previous_cwd = process.cwd();
    temp_dir = fs.mkdtempSync(path.join(os.tmpdir(), "skypydb-js-test-"));
    process.chdir(temp_dir);
  });

  afterEach(() => {
    process.chdir(previous_cwd);
    fs.rmSync(temp_dir, { recursive: true, force: true });
  });

  it("creates fixed db/logger paths and logs has_metadata=true", async () => {
    const client = new vecClient();
    await client.create_collection("my-videos");
    await client.close();

    const db_file = path.join(temp_dir, "skypydb", "vector.db");
    const log_file = path.join(temp_dir, "skypydb", "logger", "log.txt");
    const stats_file = path.join(
      temp_dir,
      "skypydb",
      "logger",
      "dbstat.sqlite3",
    );

    expect(fs.existsSync(db_file)).toBe(true);
    expect(fs.existsSync(log_file)).toBe(true);
    expect(fs.existsSync(stats_file)).toBe(true);

    const entries = read_log_entries(log_file);
    const create_entry = [...entries]
      .reverse()
      .find(
        (entry: Record<string, unknown>) =>
          entry.operation === "create_collection" &&
          entry.collection === "my-videos",
      );

    expect(create_entry).toBeTruthy();
    expect(create_entry?.status).toBe("success");
    expect(
      (create_entry?.details as Record<string, unknown>).has_metadata,
    ).toBe(true);
  });

  it("supports vector lifecycle and collection aliases", async () => {
    const client = new vecClient();
    const collection = await client.get_or_create_collection("docs", {
      source: "tests",
    });

    await collection.add({
      ids: ["id1", "id2"],
      embeddings: [
        [1, 0],
        [0, 1],
      ],
      data: ["hello world", "goodbye world"],
      metadatas: [
        { source: "a", views: 10 },
        { source: "b", views: 20 },
      ],
    });

    await collection.add({
      ids: ["id3"],
      embeddings: [[0.8, 0.2]],
      documents: ["hello again"],
      metadatas: [{ source: "a", views: 30 }],
    });

    expect(await collection.count()).toBe(3);

    const filtered = await collection.get({
      where: { source: { $eq: "a" } },
      include: ["documents", "metadatas"],
    });
    expect(filtered.ids.length).toBe(2);

    const paged = await collection.get({
      include: ["documents"],
      limit: 1,
      offset: 1,
    });
    expect(paged.ids.length).toBe(1);

    const queried = await collection.query({
      query_embeddings: [[1, 0]],
      number_of_results: 2,
      include: ["documents", "distances"],
    });
    expect(queried.ids[0].length).toBe(2);
    expect(queried.ids[0][0]).toBe("id1");

    await collection.update({
      ids: ["id1"],
      documents: ["hello world updated"],
      metadatas: [{ source: "a", views: 99 }],
    });

    const updated = await collection.get({
      ids: ["id1"],
      include: ["documents", "metadatas"],
    });
    expect(updated.documents?.[0]).toBe("hello world updated");

    await collection.delete({ by_data: "goodbye world" });
    expect(await collection.count()).toBe(2);

    await collection.delete({ by_ids: ["id1"] });
    expect(await collection.count()).toBe(1);

    const listed = await client.list_collections();
    expect(listed.map((item) => item.name)).toContain("docs");

    await client.delete_collection("docs");
    await expect(client.get_collection("docs")).rejects.toThrow("not found");

    await client.close();
  });

  it("reset clears collections and heartbeat returns numeric marker", async () => {
    const client = new vecClient();
    await client.get_or_create_collection("a");
    await client.get_or_create_collection("b");
    expect((await client.list_collections()).length).toBe(2);

    const reset_result = await client.reset();
    expect(reset_result).toBe(true);
    expect((await client.list_collections()).length).toBe(0);

    const heartbeat = await client.heartbeat();
    expect(typeof heartbeat).toBe("number");
    expect(heartbeat).toBeGreaterThan(0);
    await client.close();
  });
});
