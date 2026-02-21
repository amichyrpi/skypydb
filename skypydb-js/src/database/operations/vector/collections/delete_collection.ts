import { CollectionNotFoundError } from "../../../../errors";
import { InputValidator } from "../../../../security/validation";
import { CountItemsMixin } from "./count_items";

export abstract class DeleteCollectionMixin extends CountItemsMixin {
  delete_collection(name: string): void {
    const validated = InputValidator.validate_table_name(name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }

    this.conn.prepare(`DROP TABLE [vec_${validated}]`).run();
    this.conn
      .prepare("DELETE FROM _vector_collections WHERE name = ?")
      .run(validated);
  }
}
