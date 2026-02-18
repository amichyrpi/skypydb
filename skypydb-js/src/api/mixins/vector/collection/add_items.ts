import type { AddParams } from "../../../../types";
import type { VectorDatabase } from "../../../../database/vector_db";

export class AddItemsMixin {
  protected _db!: VectorDatabase;
  protected _name!: string;

  async add(params: AddParams): Promise<void> {
    const { ids, embeddings, metadatas } = params;
    let { documents, data } = params;

    if (data !== undefined) {
      if (documents !== undefined && JSON.stringify(documents) !== JSON.stringify(data)) {
        throw new Error("Use either 'documents' or legacy 'data', not conflicting values for both.");
      }
      documents = data;
    }

    await this._db.add(this._name, ids, embeddings, documents, metadatas);
  }
}
