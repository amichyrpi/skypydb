"""Update operations for vector collection records."""

import json
from typing import Any, Dict, List, Optional

from skypydb.security.validation import InputValidator


class UpdateItemsMixin:
    """Provide record updates for vector collections."""

    def update(
        self,
        collection_name: str,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Update records by ID in a collection."""

        collection_name = InputValidator.validate_table_name(collection_name)
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' not found")

        if embeddings is None and documents is not None:
            if self.embedding_function is None:
                raise ValueError("Documents provided but no embedding function set.")
            embeddings = self.embedding_function(documents)

        cursor = self.conn.cursor()

        for idx, item_id in enumerate(ids):
            updates = []
            params = []

            if embeddings is not None:
                updates.append("embedding = ?")
                params.append(json.dumps(embeddings[idx]))
            if documents is not None:
                updates.append("document = ?")
                params.append(documents[idx])
            if metadatas is not None:
                updates.append("metadata = ?")
                params.append(json.dumps(metadatas[idx]) if metadatas[idx] else None)

            if updates:
                params.append(item_id)
                cursor.execute(
                    f"UPDATE [vec_{collection_name}] SET {', '.join(updates)} WHERE id = ?",
                    params,
                )
        self.conn.commit()
