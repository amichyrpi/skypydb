"""Read operations for vector collection records."""

import json
from typing import Any, Dict, List, Optional

from skypydb.security.validation import InputValidator


class GetItemsMixin:
    """Provide record retrieval for vector collections."""

    def get(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, List[Any]]:
        """Read records from a collection by IDs and/or filters."""

        collection_name = InputValidator.validate_table_name(collection_name)
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' not found")

        include = include or ["embeddings", "documents", "metadatas"]
        cursor = self.conn.cursor()

        if ids is not None:
            placeholders = ", ".join(["?" for _ in ids])
            cursor.execute(
                f"SELECT * FROM [vec_{collection_name}] WHERE id IN ({placeholders})",
                list(ids),
            )
        else:
            cursor.execute(f"SELECT * FROM [vec_{collection_name}]")

        results = {
            "ids": [],
            "embeddings": [] if "embeddings" in include else None,
            "documents": [] if "documents" in include else None,
            "metadatas": [] if "metadatas" in include else None,
        }

        for row in cursor.fetchall():
            item = {
                "id": row["id"],
                "document": row["document"],
                "embedding": json.loads(row["embedding"]),
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
            }
            if not self._matches_filters(item, where, where_document):
                continue

            results["ids"].append(item["id"])
            if results["embeddings"] is not None:
                results["embeddings"].append(item["embedding"])
            if results["documents"] is not None:
                results["documents"].append(item["document"])
            if results["metadatas"] is not None:
                results["metadatas"].append(item["metadata"])

        return results

    def _get_all_items(self, collection_name: str) -> List[Dict[str, Any]]:
        """Load all rows from a collection table for in-memory filtering/ranking."""

        cursor = self.conn.cursor()
        cursor.execute(f"SELECT * FROM [vec_{collection_name}]")

        items = []
        for row in cursor.fetchall():
            items.append(
                {
                    "id": row["id"],
                    "document": row["document"],
                    "embedding": json.loads(row["embedding"]),
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
                    "created_at": row["created_at"],
                }
            )
        return items
