import type { DeleteParams } from "../../../../types";
import { UpdateItemsMixin } from "./update_items";

export class DeleteItemsMixin extends UpdateItemsMixin {
  async delete(params: DeleteParams = {}): Promise<void> {
    let { ids, where, where_document, by_ids, by_metadatas, by_data } = params;

    if (by_ids !== undefined) {
      if (ids !== undefined && JSON.stringify(ids) !== JSON.stringify(by_ids)) {
        throw new Error(
          "Use either 'ids' or legacy 'by_ids', not conflicting values for both.",
        );
      }
      ids = by_ids;
    }

    if (by_metadatas !== undefined) {
      if (where !== undefined) {
        throw new Error(
          "Use either 'where' or legacy 'by_metadatas', not both.",
        );
      }
      if (!Array.isArray(by_metadatas) && typeof by_metadatas === "object") {
        where = by_metadatas;
      } else if (Array.isArray(by_metadatas)) {
        if (by_metadatas.length === 1 && typeof by_metadatas[0] === "object") {
          where = by_metadatas[0];
        } else if (
          by_metadatas.length > 1 &&
          by_metadatas.every((item) => typeof item === "object")
        ) {
          where = { $or: by_metadatas };
        }
      } else {
        throw new Error(
          "Legacy 'by_metadatas' must be a dict or list of dicts.",
        );
      }
    }

    if (by_data !== undefined) {
      if (where_document !== undefined) {
        throw new Error(
          "Use either 'where_document' or legacy 'by_data', not both.",
        );
      }
      if (typeof by_data === "string") {
        where_document = { $contains: by_data };
      } else if (Array.isArray(by_data)) {
        const values = by_data.filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        );
        if (values.length === 1) {
          where_document = { $contains: values[0] };
        } else if (values.length > 1) {
          for (const text of values) {
            this._db.delete(this._name, ids, where, { $contains: text });
          }
          return;
        }
      } else {
        throw new Error(
          "Legacy 'by_data' must be a string or list of strings.",
        );
      }
    }

    if (
      ids === undefined &&
      where === undefined &&
      where_document === undefined
    ) {
      throw new Error(
        "delete() requires at least one of 'ids', 'where', or 'where_document' to be provided.",
      );
    }

    this._db.delete(this._name, ids, where, where_document);
  }
}
