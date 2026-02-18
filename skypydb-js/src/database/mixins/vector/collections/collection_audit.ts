import type Database from "better-sqlite3";
import { InputValidator } from "../../../../security/validation";

type ItemRow = {
  id: string;
  document: string | null;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at?: string;
};

export abstract class CollectionAuditMixin {
  protected abstract conn: Database.Database;

  collection_exists(name: string): boolean {
    const validated = InputValidator.validate_table_name(name);
    const row = this.conn
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
      )
      .get(`vec_${validated}`);
    return row !== undefined;
  }

  protected _ensure_collections_table(): void {
    this.conn
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS _vector_collections (
          name TEXT PRIMARY KEY,
          metadata TEXT,
          created_at TEXT NOT NULL
        )
        `
      )
      .run();
  }

  protected _matches_filters(
    item: ItemRow,
    where?: Record<string, unknown>,
    where_document?: Record<string, string>
  ): boolean {
    if (where) {
      const metadata = item.metadata ?? {};
      for (const [key, value] of Object.entries(where)) {
        if (key.startsWith("$")) {
          if (key === "$and") {
            const conditions = (value as Array<Record<string, unknown>>) ?? [];
            if (!conditions.every((condition) => this._matches_filters(item, condition, undefined))) {
              return false;
            }
          } else if (key === "$or") {
            const conditions = (value as Array<Record<string, unknown>>) ?? [];
            if (!conditions.some((condition) => this._matches_filters(item, condition, undefined))) {
              return false;
            }
          }
          continue;
        }

        if (value && typeof value === "object" && !Array.isArray(value)) {
          const meta_value = metadata[key];
          for (const [operator, operator_value] of Object.entries(value)) {
            if (operator === "$eq" && meta_value !== operator_value) {
              return false;
            }
            if (operator === "$ne" && meta_value === operator_value) {
              return false;
            }
            if (operator === "$gt" && !(meta_value !== undefined && (meta_value as number) > (operator_value as number))) {
              return false;
            }
            if (operator === "$gte" && !(meta_value !== undefined && (meta_value as number) >= (operator_value as number))) {
              return false;
            }
            if (operator === "$lt" && !(meta_value !== undefined && (meta_value as number) < (operator_value as number))) {
              return false;
            }
            if (operator === "$lte" && !(meta_value !== undefined && (meta_value as number) <= (operator_value as number))) {
              return false;
            }
            if (operator === "$in" && Array.isArray(operator_value) && !operator_value.includes(meta_value)) {
              return false;
            }
            if (operator === "$nin" && Array.isArray(operator_value) && operator_value.includes(meta_value)) {
              return false;
            }
          }
        } else if (metadata[key] !== value) {
          return false;
        }
      }
    }

    if (where_document) {
      const document = item.document ?? "";
      for (const [operator, value] of Object.entries(where_document)) {
        if (operator === "$contains" && !document.includes(value)) {
          return false;
        }
        if (operator === "$not_contains" && document.includes(value)) {
          return false;
        }
      }
    }

    return true;
  }
}
