import type { CollectionInfo } from "../../../types";
import { Collection } from "../../collection";
import { GetCollectionMixin } from "./get_collection";
import type { VectorDatabase } from "../../../database/vector_db";

export class ListCollectionsMixin extends GetCollectionMixin {
  async list_collections(): Promise<Collection[]> {
    const collections: Collection[] = [];
    for (const collection_info of this._db.list_collections()) {
      const cached = this._collections.get(collection_info.name);
      if (cached) {
        collections.push(cached);
        continue;
      }
      const collection = new Collection(
        this._db,
        collection_info.name,
        collection_info.metadata,
      );
      this._collections.set(collection_info.name, collection);
      collections.push(collection);
    }
    return collections;
  }
}
