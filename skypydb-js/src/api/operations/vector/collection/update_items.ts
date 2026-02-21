import type { UpdateParams } from "../../../../types";
import { QueryItemsMixin } from "./query_items";

export class UpdateItemsMixin extends QueryItemsMixin {
  async update(params: UpdateParams): Promise<void> {
    const { ids, embeddings, documents, metadatas } = params;
    await this._db.update(this._name, ids, embeddings, documents, metadatas);
  }
}
