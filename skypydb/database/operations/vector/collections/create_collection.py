"""Collection creation mixin for vector storage."""

import json
from datetime import datetime
from typing import Any, Dict, Optional

from skypydb.security.validation import InputValidator


class CreateCollectionMixin:
    """Provide collection table creation behavior."""

    def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Create a new collection table and register it in metadata."""

        name = InputValidator.validate_table_name(name)
        if self.collection_exists(name):
            raise ValueError(f"Collection '{name}' already exists")

        table_name = f"vec_{name}"
        cursor = self.conn.cursor()

        cursor.execute(
            f"""
            CREATE TABLE [{table_name}] (
                id TEXT PRIMARY KEY,
                document TEXT,
                embedding TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            "INSERT INTO _vector_collections (name, metadata, created_at) VALUES (?, ?, ?)",
            (name, json.dumps(metadata or {}), datetime.now().isoformat()),
        )
        self.conn.commit()
