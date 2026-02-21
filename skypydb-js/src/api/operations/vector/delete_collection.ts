import { ListCollectionsMixin } from "./list_collections";
import type { VectorDatabase } from "../../../database/vector_database";

export class DeleteCollectionMixin extends ListCollectionsMixin {
  async delete_collection(name: string): Promise<void> {
    this._db.delete_collection(name);
    this._collections.delete(name);
  }
}
