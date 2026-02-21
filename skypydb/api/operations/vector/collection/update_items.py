"""Mixin that updates records in a vector collection."""

from typing import Any, Dict, List, Optional


class UpdateItemsMixin:
    """Expose update behavior on a `Collection` wrapper."""

    def update(
        self,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Update existing items by ID."""

        self._db.update(
            collection_name=self._name,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
