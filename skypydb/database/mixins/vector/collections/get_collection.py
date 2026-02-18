"""Collection retrieval mixin for vector storage."""

import json
from typing import Any, Dict, List, Optional

from skypydb.security.validation import InputValidator


class GetCollectionMixin:
    """Provide collection metadata retrieval behavior."""

    def get_collection(self, name: str) -> Optional[Dict[str, Any]]:
        """Return collection metadata if the collection exists."""

        name = InputValidator.validate_table_name(name)
        if not self.collection_exists(name):
            return None

        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM _vector_collections WHERE name = ?", (name,))
        row = cursor.fetchone()
        if row is None:
            return None

        return {
            "name": row["name"],
            "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
            "created_at": row["created_at"],
        }

    def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Return existing metadata or create and return a new collection."""

        name = InputValidator.validate_table_name(name)
        if not self.collection_exists(name):
            self.create_collection(name, metadata)

        result = self.get_collection(name)
        assert result is not None
        return result

    def list_collections(self) -> List[Dict[str, Any]]:
        """Return metadata for all registered collections."""

        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM _vector_collections")

        collections = []
        for row in cursor.fetchall():
            collections.append(
                {
                    "name": row["name"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "created_at": row["created_at"],
                }
            )
        return collections
