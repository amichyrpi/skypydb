"""Insert operations for vector collection records."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from skypydb.security.validation import InputValidator


class AddItemsMixin:
    """Provide record insertion for vector collections."""

    def add(
        self,
        collection_name: str,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """Insert records into a collection by IDs and vectors/documents."""

        collection_name = InputValidator.validate_table_name(collection_name)
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' not found")
        if embeddings is None and documents is None:
            raise ValueError("Either embeddings or documents must be provided")

        if embeddings is None:
            if self.embedding_function is None:
                raise ValueError(
                    "Documents provided but no embedding function set. "
                    "Either provide embeddings directly or set an embedding_function."
                )
            embeddings = self.embedding_function(documents or [])

        n_items = len(ids)
        if len(embeddings) != n_items:
            raise ValueError(
                f"Number of embeddings ({len(embeddings)}) doesn't match number of IDs ({n_items})"
            )
        if documents is not None and len(documents) != n_items:
            raise ValueError(
                f"Number of documents ({len(documents)}) doesn't match number of IDs ({n_items})"
            )
        if metadatas is not None and len(metadatas) != n_items:
            raise ValueError(
                f"Number of metadatas ({len(metadatas)}) doesn't match number of IDs ({n_items})"
            )

        cursor = self.conn.cursor()
        now = datetime.now().isoformat()

        for idx, item_id in enumerate(ids):
            cursor.execute(
                f"""
                INSERT OR REPLACE INTO [vec_{collection_name}]
                (id, document, embedding, metadata, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    documents[idx] if documents else None,
                    json.dumps(embeddings[idx]),
                    json.dumps(metadatas[idx]) if metadatas else None,
                    now,
                ),
            )
        self.conn.commit()
        return ids
