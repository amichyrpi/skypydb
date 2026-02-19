import { InputValidator } from "../../../../security/validation";
import { CollectionAlreadyExistsError } from "../../../../errors";
import { CollectionAuditMixin } from "./collection_audit";

export abstract class CreateCollectionMixin extends CollectionAuditMixin {
  create_collection(name: string, metadata?: Record<string, unknown>): void {
    const validated = InputValidator.validate_table_name(name);
    if (this.collection_exists(validated)) {
      throw new CollectionAlreadyExistsError(
        `Collection '${validated}' already exists`,
      );
    }

    const table_name = `vec_${validated}`;
    this.conn
      .prepare(
        `
        CREATE TABLE [${table_name}] (
          id TEXT PRIMARY KEY,
          document TEXT,
          embedding TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL
        )
        `,
      )
      .run();

    this.conn
      .prepare(
        "INSERT INTO _vector_collections (name, metadata, created_at) VALUES (?, ?, ?)",
      )
      .run(validated, JSON.stringify(metadata ?? {}), new Date().toISOString());
  }
}
