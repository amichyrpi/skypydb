import type { Metadata } from "../../../types";
import { Collection } from "../../collection";
import { CreateCollectionMixin } from "./create_collection";
import type { VectorDatabase } from "../../../database/vector_database";

export class GetCollectionMixin extends CreateCollectionMixin {
  async get_collection(name: string): Promise<Collection> {
    const collection_info = this._db.get_collection(name);
    if (!collection_info) {
      throw new Error(`Collection '${name}' not found`);
    }

    const cached = this._collections.get(name);
    if (cached) {
      return cached;
    }

    const collection = new Collection(this._db, name, collection_info.metadata);
    this._collections.set(name, collection);
    return collection;
  }

  async get_or_create_collection(
    name: string,
    metadata?: Metadata,
  ): Promise<Collection> {
    const collection_info = this._db.get_or_create_collection(name, metadata);
    const cached = this._collections.get(name);
    if (cached) {
      return cached;
    }

    const collection = new Collection(this._db, name, collection_info.metadata);
    this._collections.set(name, collection);
    return collection;
  }
}
