import { CollectionNotFoundError } from "../../../errors";
import { InputValidator } from "../../../security/validation";
import { QueryItemsMixin } from "./query_items";

export abstract class DeleteItemsMixin extends QueryItemsMixin {
  delete(
    collection_name: string,
    ids?: string[],
    where?: Record<string, unknown>,
    where_document?: Record<string, string>
  ): number {
    const validated = InputValidator.validate_table_name(collection_name);
    if (!this.collection_exists(validated)) {
      throw new CollectionNotFoundError(`Collection '${validated}' not found`);
    }

    if (ids) {
      const placeholders = ids.map(() => "?").join(", ");
      const result = this.conn
        .prepare(`DELETE FROM [vec_${validated}] WHERE id IN (${placeholders})`)
        .run(...ids);
      return Number(result.changes ?? 0);
    }

    const ids_to_delete: string[] = [];
    for (const item of this._get_all_items(validated)) {
      if (this._matches_filters(item, where, where_document)) {
        ids_to_delete.push(item.id);
      }
    }

    if (ids_to_delete.length === 0) {
      return 0;
    }

    const placeholders = ids_to_delete.map(() => "?").join(", ");
    const result = this.conn
      .prepare(`DELETE FROM [vec_${validated}] WHERE id IN (${placeholders})`)
      .run(...ids_to_delete);
    return Number(result.changes ?? 0);
  }
}
