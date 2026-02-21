"""Mixin that adds records to a vector collection."""

from typing import Any, Dict, List, Optional


class AddItemsMixin:
    """Expose add behavior on a `Collection` wrapper."""

    def add(
        self,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
        data: Optional[List[str]] = None,
    ) -> None:
        """Insert new items into the current collection."""

        if data is not None:
            if documents is not None and documents != data:
                raise ValueError("Use either 'documents' or legacy 'data', not conflicting values for both.")
            documents = data

        self._db.add(
            collection_name=self._name,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
