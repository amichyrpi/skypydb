import type { GetParams, GetResult } from "../../../../types";
import { AddItemsMixin } from "./add_items";

export class GetItemsMixin extends AddItemsMixin {
  async get(params: GetParams = {}): Promise<GetResult> {
    const { ids, where, where_document, include, limit, offset } = params;

    const results = this._db.get(this._name, ids, where, where_document, include);

    if (offset !== undefined || limit !== undefined) {
      const start = offset ?? 0;
      const end = limit !== undefined ? start + limit : undefined;

      results.ids = results.ids.slice(start, end);
      if (results.embeddings) {
        results.embeddings = results.embeddings.slice(start, end);
      }
      if (results.documents) {
        results.documents = results.documents.slice(start, end);
      }
      if (results.metadatas) {
        results.metadatas = results.metadatas.slice(start, end);
      }
    }

    return results;
  }
}
