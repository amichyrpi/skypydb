import { CollectionNotFoundError } from "../../../../errors";
import { InputValidator } from "../../../../security/validation";
import { GetCollectionMixin } from "./get_collection";

export abstract class CountItemsMixin extends GetCollectionMixin {
  count(collection_name: string): number {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }

    const row = this.conn
      .prepare(`SELECT COUNT(*) AS count FROM [vec_${validated}]`)
      .get() as { count: number };
    return Number(row.count);
  }
}
