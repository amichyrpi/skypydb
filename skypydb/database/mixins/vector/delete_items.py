"""Delete operations for vector collection records."""

from typing import Any, Dict, List, Optional

from skypydb.security.validation import InputValidator


class DeleteItemsMixin:
    """Provide record deletion for vector collections."""

    def delete(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
    ) -> int:
        """Delete records by explicit IDs and/or filters."""

        collection_name = InputValidator.validate_table_name(collection_name)
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' not found")

        cursor = self.conn.cursor()

        if ids is not None:
            placeholders = ", ".join(["?" for _ in ids])
            cursor.execute(
                f"DELETE FROM [vec_{collection_name}] WHERE id IN ({placeholders})",
                list(ids),
            )
        else:
            ids_to_delete = []
            for item in self._get_all_items(collection_name):
                if self._matches_filters(item, where, where_document):
                    ids_to_delete.append(item["id"])

            if ids_to_delete:
                placeholders = ", ".join(["?" for _ in ids_to_delete])
                cursor.execute(
                    f"DELETE FROM [vec_{collection_name}] WHERE id IN ({placeholders})",
                    ids_to_delete,
                )

        deleted_count = cursor.rowcount
        self.conn.commit()
        return deleted_count
