import type { QueryParams, QueryResult } from "../../../../types";
import { GetItemsMixin } from "./get_items";

export class QueryItemsMixin extends GetItemsMixin {
  async query(params: QueryParams = {}): Promise<QueryResult> {
    const { query_embeddings, query_texts, where, where_document, include } =
      params;
    let { n_results, number_of_results } = params;

    if (number_of_results !== undefined) {
      n_results = number_of_results;
    }

    return this._db.query(
      this._name,
      query_embeddings,
      query_texts,
      n_results ?? 10,
      where,
      where_document,
      include,
    );
  }
}
