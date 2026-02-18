"""Collection counting mixin for vector storage."""

from skypydb.security.validation import InputValidator


class CountItemsMixin:
    """Provide item count behavior per vector collection."""

    def count(self, collection_name: str) -> int:
        """Return the number of rows in a collection."""

        collection_name = InputValidator.validate_table_name(collection_name)
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' not found")

        cursor = self.conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM [vec_{collection_name}]")
        return cursor.fetchone()[0]
