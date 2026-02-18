import type { Metadata } from "../../../../types";
import { DeleteItemsMixin } from "./delete_items";

export class CollectionInfoMixin extends DeleteItemsMixin {
  protected _metadata!: Metadata;

  get name(): string {
    return this._name;
  }

  get metadata(): Metadata {
    return this._metadata;
  }

  async count(): Promise<number> {
    return this._db.count(this._name);
  }

  async peek(limit = 10) {
    return this.get({ limit });
  }
}
