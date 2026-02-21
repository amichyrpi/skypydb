import { InputValidator } from "../../../../security/validation";
import type { CollectionInfo, Metadata } from "../../../../types";
import { CreateCollectionMixin } from "./create_collection";

export abstract class GetCollectionMixin extends CreateCollectionMixin {
  get_collection(name: string): CollectionInfo | null {
    const validated = InputValidator.validate_table_name(name);
    if (!this.collection_exists(validated)) {
      return null;
    }

    const row = this.conn
      .prepare("SELECT * FROM _vector_collections WHERE name = ?")
      .get(validated) as
      | {
          name: string;
          metadata: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      name: row.name,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Metadata) : {},
      created_at: row.created_at,
    };
  }

  get_or_create_collection(
    name: string,
    metadata?: Record<string, unknown>,
  ): CollectionInfo {
    const validated = InputValidator.validate_table_name(name);
    if (!this.collection_exists(validated)) {
      this.create_collection(validated, metadata);
    }
    const result = this.get_collection(validated);
    if (!result) {
      throw new Error(`Collection '${validated}' not found after create`);
    }
    return result;
  }

  list_collections(): CollectionInfo[] {
    const rows = this.conn
      .prepare("SELECT * FROM _vector_collections")
      .all() as Array<{
      name: string;
      metadata: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      name: row.name,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Metadata) : {},
      created_at: row.created_at,
    }));
  }
}
