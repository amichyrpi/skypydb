import type { CollectionInfo } from "../types";

type DbResetCapable = {
  list_collections(): CollectionInfo[] | Promise<CollectionInfo[]>;
  delete_collection(name: string): void | Promise<void>;
  reset?: () => void | Promise<void>;
  clear?: () => void | Promise<void>;
};

export async function reset_client(
  db: DbResetCapable,
  collections: Map<string, unknown>,
): Promise<boolean> {
  if (typeof db.reset === "function") {
    await db.reset();
  } else if (typeof db.clear === "function") {
    await db.clear();
  } else {
    for (const collection of await db.list_collections()) {
      await db.delete_collection(collection.name);
    }
  }
  collections.clear();
  return true;
}

export function heartbeat_client(): number {
  return Date.now() * 1_000_000;
}
