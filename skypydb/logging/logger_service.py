"""Internal logger service for operation logs and database state snapshots."""

import json
import sqlite3
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


class LoggerService:
    """Persist operation logs and current DB snapshot metadata."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.logger_dir = Path.cwd() / "skypydb" / "logger"
        self.log_file = self.logger_dir / "log.txt"
        self.stats_db = self.logger_dir / "dbstat.sqlite3"

        self._ensure_logger_paths()
        self._initialize_stats_db()

    @staticmethod
    def _now_iso() -> str:
        """Return a UTC ISO timestamp for stable log and stat writes."""
        return datetime.now(timezone.utc).isoformat()

    def _ensure_logger_paths(self) -> None:
        """Create logger directory and log file if missing."""

        self.logger_dir.mkdir(parents=True, exist_ok=True)
        if not self.log_file.exists():
            self.log_file.touch()

    def _initialize_stats_db(self) -> None:
        """Create and initialize snapshot tables."""

        try:
            with sqlite3.connect(self.stats_db) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS db_stats (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        total_collections INTEGER NOT NULL DEFAULT 0,
                        total_documents INTEGER NOT NULL DEFAULT 0,
                        last_operation TEXT,
                        last_status TEXT,
                        last_collection TEXT,
                        last_operation_at TEXT,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS collection_stats (
                        collection_name TEXT PRIMARY KEY,
                        document_count INTEGER NOT NULL DEFAULT 0,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
                cursor.execute(
                    """
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
                    """,
                    (self._now_iso(),),
                )
                conn.commit()
        except Exception as exc:
            warnings.warn(f"LoggerService initialization failed: {exc}", RuntimeWarning, stacklevel=2)

    def log_event(
        self,
        operation: str,
        status: str,
        details: Dict[str, Any],
        collection: Optional[str] = None,
        duration_ms: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        """Append one JSON line entry to log.txt."""

        payload: Dict[str, Any] = {
            "timestamp": self._now_iso(),
            "operation": operation,
            "status": status,
            "details": details,
        }
        if collection is not None:
            payload["collection"] = collection
        if duration_ms is not None:
            payload["duration_ms"] = duration_ms
        if error is not None:
            payload["error"] = error

        try:
            with self.log_file.open("a", encoding="utf-8") as file:
                file.write(json.dumps(payload, ensure_ascii=True, default=str) + "\n")
        except Exception as exc:
            warnings.warn(f"LoggerService log write failed: {exc}", RuntimeWarning, stacklevel=2)

    def refresh_full_snapshot(
        self,
        vector_conn: sqlite3.Connection,
        last_operation: Optional[str] = None,
        last_status: Optional[str] = None,
        last_collection: Optional[str] = None,
        last_operation_at: Optional[str] = None,
    ) -> None:
        """Update db_stats and collection_stats with current database state."""

        snapshot_time = self._now_iso()
        operation_time = last_operation_at or snapshot_time

        try:
            vcursor = vector_conn.cursor()
            vcursor.execute("SELECT name FROM _vector_collections")
            collection_names = [row[0] for row in vcursor.fetchall()]

            counts: Dict[str, int] = {}
            total_documents = 0

            for collection_name in collection_names:
                vcursor.execute(f"SELECT COUNT(*) FROM [vec_{collection_name}]")
                document_count = int(vcursor.fetchone()[0])
                counts[collection_name] = document_count
                total_documents += document_count

            with sqlite3.connect(self.stats_db) as sconn:
                scursor = sconn.cursor()
                for collection_name, document_count in counts.items():
                    scursor.execute(
                        """
                        INSERT INTO collection_stats (collection_name, document_count, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(collection_name) DO UPDATE SET
                            document_count = excluded.document_count,
                            updated_at = excluded.updated_at
                        """,
                        (collection_name, document_count, snapshot_time),
                    )
                if counts:
                    placeholders = ", ".join(["?"] * len(counts))
                    scursor.execute(
                        f"DELETE FROM collection_stats WHERE collection_name NOT IN ({placeholders})",
                        list(counts.keys()),
                    )
                else:
                    scursor.execute("DELETE FROM collection_stats")

                scursor.execute(
                    """
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
                    """,
                    (
                        len(collection_names),
                        total_documents,
                        last_operation,
                        last_status,
                        last_collection,
                        operation_time,
                        snapshot_time,
                    ),
                )
                sconn.commit()
        except Exception as exc:
            warnings.warn(f"LoggerService snapshot refresh failed: {exc}", RuntimeWarning, stacklevel=2)

    def update_last_operation_only(
        self,
        operation: str,
        status: str,
        collection: Optional[str] = None,
        operation_at: Optional[str] = None,
    ) -> None:
        """Update last operation fields without recomputing totals."""

        snapshot_time = self._now_iso()
        operation_time = operation_at or snapshot_time

        try:
            with sqlite3.connect(self.stats_db) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE db_stats
                    SET
                        last_operation = ?,
                        last_status = ?,
                        last_collection = ?,
                        last_operation_at = ?,
                        updated_at = ?
                    WHERE id = 1
                    """,
                    (operation, status, collection, operation_time, snapshot_time),
                )
                conn.commit()
        except Exception as exc:
            warnings.warn(f"LoggerService operation update failed: {exc}", RuntimeWarning, stacklevel=2)
