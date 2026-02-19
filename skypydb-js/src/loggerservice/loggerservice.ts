import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type LogEventArgs = {
  operation: string;
  status: "success" | "error";
  details: Record<string, unknown>;
  collection?: string;
  duration_ms?: number;
  error?: string;
};

type SnapshotArgs = {
  last_operation?: string;
  last_status?: string;
  last_collection?: string;
  last_operation_at?: string;
};

export class LoggerService {
  readonly db_path: string;
  readonly logger_dir: string;
  readonly log_file: string;
  readonly stats_db: string;

  private stats_connection: Database.Database;

  constructor(db_path: string) {
    this.db_path = db_path;
    this.logger_dir = path.join(process.cwd(), "skypydb", "logger");
    this.log_file = path.join(this.logger_dir, "log.txt");
    this.stats_db = path.join(this.logger_dir, "dbstat.sqlite3");

    this.ensure_logger_paths();
    this.stats_connection = new Database(this.stats_db);
    this.initialize_stats_db();
  }

  private now_iso(): string {
    return new Date().toISOString();
  }

  private ensure_logger_paths(): void {
    fs.mkdirSync(this.logger_dir, { recursive: true });
    if (!fs.existsSync(this.log_file)) {
      fs.writeFileSync(this.log_file, "", "utf8");
    }
  }

  private initialize_stats_db(): void {
    try {
      this.stats_connection.exec(`
        CREATE TABLE IF NOT EXISTS db_stats (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          total_collections INTEGER NOT NULL DEFAULT 0,
          total_documents INTEGER NOT NULL DEFAULT 0,
          last_operation TEXT,
          last_status TEXT,
          last_collection TEXT,
          last_operation_at TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collection_stats (
          collection_name TEXT PRIMARY KEY,
          document_count INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);

      this.stats_connection
        .prepare(
          `
          INSERT INTO db_stats (
            id,
            total_collections,
            total_documents,
            last_operation,
            last_status,
            last_collection,
            last_operation_at,
            updated_at
          )
          VALUES (1, 0, 0, NULL, NULL, NULL, NULL, ?)
          ON CONFLICT(id) DO NOTHING
          `,
        )
        .run(this.now_iso());
    } catch (error) {
      console.warn(`LoggerService initialization failed: ${String(error)}`);
    }
  }

  log_event(args: LogEventArgs): void {
    const payload: Record<string, unknown> = {
      timestamp: this.now_iso(),
      operation: args.operation,
      status: args.status,
      details: args.details,
    };
    if (args.collection !== undefined) {
      payload.collection = args.collection;
    }
    if (args.duration_ms !== undefined) {
      payload.duration_ms = args.duration_ms;
    }
    if (args.error !== undefined) {
      payload.error = args.error;
    }

    try {
      fs.appendFileSync(this.log_file, `${JSON.stringify(payload)}\n`, "utf8");
    } catch (error) {
      console.warn(`LoggerService log write failed: ${String(error)}`);
    }
  }

  refresh_full_snapshot(
    vector_conn: Database.Database,
    args: SnapshotArgs = {},
  ): void {
    const snapshot_time = this.now_iso();
    const operation_time = args.last_operation_at ?? snapshot_time;

    try {
      const rows = vector_conn
        .prepare("SELECT name FROM _vector_collections")
        .all() as Array<{ name: string }>;
      const collection_names = rows.map((row) => String(row.name));

      const counts = new Map<string, number>();
      let total_documents = 0;

      for (const collection_name of collection_names) {
        const count_row = vector_conn
          .prepare(`SELECT COUNT(*) AS count FROM [vec_${collection_name}]`)
          .get() as { count?: number } | undefined;
        const count = Number(count_row?.count ?? 0);
        counts.set(collection_name, count);
        total_documents += count;
      }

      const upsert_collection = this.stats_connection.prepare(`
        INSERT INTO collection_stats (collection_name, document_count, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(collection_name) DO UPDATE SET
          document_count = excluded.document_count,
          updated_at = excluded.updated_at
      `);

      for (const [collection_name, document_count] of counts.entries()) {
        upsert_collection.run(collection_name, document_count, snapshot_time);
      }

      if (counts.size > 0) {
        const placeholders = Array.from({ length: counts.size })
          .fill("?")
          .join(", ");
        this.stats_connection
          .prepare(
            `DELETE FROM collection_stats WHERE collection_name NOT IN (${placeholders})`,
          )
          .run(...Array.from(counts.keys()));
      } else {
        this.stats_connection.prepare("DELETE FROM collection_stats").run();
      }

      this.stats_connection
        .prepare(
          `
          UPDATE db_stats
          SET
            total_collections = ?,
            total_documents = ?,
            last_operation = ?,
            last_status = ?,
            last_collection = ?,
            last_operation_at = ?,
            updated_at = ?
          WHERE id = 1
          `,
        )
        .run(
          collection_names.length,
          total_documents,
          args.last_operation ?? null,
          args.last_status ?? null,
          args.last_collection ?? null,
          operation_time,
          snapshot_time,
        );
    } catch (error) {
      console.warn(`LoggerService snapshot refresh failed: ${String(error)}`);
    }
  }

  update_last_operation_only(
    operation: string,
    status: "success" | "error",
    collection?: string,
    operation_at?: string,
  ): void {
    const snapshot_time = this.now_iso();
    const operation_time = operation_at ?? snapshot_time;

    try {
      this.stats_connection
        .prepare(
          `
          UPDATE db_stats
          SET
            last_operation = ?,
            last_status = ?,
            last_collection = ?,
            last_operation_at = ?,
            updated_at = ?
          WHERE id = 1
          `,
        )
        .run(
          operation,
          status,
          collection ?? null,
          operation_time,
          snapshot_time,
        );
    } catch (error) {
      console.warn(`LoggerService operation update failed: ${String(error)}`);
    }
  }

  close(): void {
    try {
      this.stats_connection.close();
    } catch (error) {
      console.warn(`LoggerService close failed: ${String(error)}`);
    }
  }
}
