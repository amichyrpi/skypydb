"""Collection deletion mixin for vector storage."""

from skypydb.security.validation import InputValidator


class DeleteCollectionMixin:
    """Provide collection table deletion behavior."""

    def delete_collection(self, name: str) -> None:
        """Drop a collection table and remove its metadata entry."""

        name = InputValidator.validate_table_name(name)
        if not self.collection_exists(name):
            raise ValueError(f"Collection '{name}' not found")

        cursor = self.conn.cursor()
        cursor.execute(f"DROP TABLE [vec_{name}]")
        cursor.execute("DELETE FROM _vector_collections WHERE name = ?", (name,))
        self.conn.commit()
