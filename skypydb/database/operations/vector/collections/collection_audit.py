"""Shared collection metadata helpers for vector storage."""

from typing import Any, Dict, Optional

from skypydb.security.validation import InputValidator


class CollectionAuditMixin:
    """Provide common collection integrity and filter helpers."""

    def collection_exists(self, name: str) -> bool:
        """Return whether the collection table exists."""

        name = InputValidator.validate_table_name(name)
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (f"vec_{name}",),
        )
        return cursor.fetchone() is not None

    def _ensure_collections_table(self) -> None:
        """Ensure the metadata registry table for collections exists."""

        cursor = self.conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS _vector_collections (
                name TEXT PRIMARY KEY,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def _matches_filters(
        self,
        item: Dict[str, Any],
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Evaluate metadata and document predicates against an item."""

        if where is not None:
            metadata = item.get("metadata") or {}

            # Metadata operators are evaluated recursively to support nested `$and`/`$or` groups.
            for key, value in where.items():
                if key.startswith("$"):
                    if key == "$and":
                        if not all(self._matches_filters(item, cond, None) for cond in value):
                            return False
                    elif key == "$or":
                        if not any(self._matches_filters(item, cond, None) for cond in value):
                            return False
                    continue

                if isinstance(value, dict):
                    meta_value = metadata.get(key)
                    for operator, op_value in value.items():
                        if operator == "$eq" and meta_value != op_value:
                            return False
                        elif operator == "$ne" and meta_value == op_value:
                            return False
                        elif operator == "$gt" and not (
                            meta_value is not None and meta_value > op_value
                        ):
                            return False
                        elif operator == "$gte" and not (
                            meta_value is not None and meta_value >= op_value
                        ):
                            return False
                        elif operator == "$lt" and not (
                            meta_value is not None and meta_value < op_value
                        ):
                            return False
                        elif operator == "$lte" and not (
                            meta_value is not None and meta_value <= op_value
                        ):
                            return False
                        elif operator == "$in" and meta_value not in op_value:
                            return False
                        elif operator == "$nin" and meta_value in op_value:
                            return False
                elif metadata.get(key) != value:
                    return False

        if where_document is not None:
            document = item.get("document") or ""
            for operator, value in where_document.items():
                if operator == "$contains" and value not in document:
                    return False
                if operator == "$not_contains" and value in document:
                    return False

        return True
