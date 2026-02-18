import type { Metadata } from "../../../types";
import { Collection } from "../../collection";
import type { VectorDatabase } from "../../../database/vector_db";

export class CreateCollectionMixin {
  protected _db!: VectorDatabase;
  protected _collections!: Map<string, Collection>;

  async create_collection(
    name: string,
    metadata?: Metadata,
    get_or_create = false
  ): Promise<Collection> {
    if (get_or_create) {
      const current = this as unknown as {
        get_or_create_collection: (name: string, metadata?: Metadata) => Promise<Collection>;
      };
      await current.get_or_create_collection(name, metadata);
    } else {
      this._db.create_collection(name, metadata);
    }

    const existing = this._collections.get(name);
    if (existing) {
      return existing;
    }

    const collection = new Collection(this._db, name, metadata ?? {});
    this._collections.set(name, collection);
    return collection;
  }
}
