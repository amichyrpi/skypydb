import type { Metadata } from "../types";
import type { VectorDatabase } from "../database/vector_db";
import { CollectionInfoMixin } from "./mixins/vector/collection";

class CollectionBase extends CollectionInfoMixin {}

export class Collection extends CollectionBase {
  protected _db: VectorDatabase;
  protected _name: string;
  protected _metadata: Metadata;

  constructor(db: VectorDatabase, name: string, metadata: Metadata = {}) {
    super();
    this._db = db;
    this._name = name;
    this._metadata = metadata;
  }
}
