"""Mixin that retrieves vector collections for `VectorClient`."""

from typing import Any, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from skypydb.api.collection import Collection


class GetCollectionMixin:
    """Expose collection retrieval behavior on `VectorClient`."""

    def get_collection(self, name: str) -> "Collection":
        """Return an existing collection by name."""

        collection_info = self._db.get_collection(name)
        if collection_info is None:
            raise ValueError(f"Collection '{name}' not found")

        if name in self._collections:
            return self._collections[name]

        from skypydb.api.collection import Collection

        collection = Collection(
            db=self._db,
            name=name,
            metadata=collection_info.get("metadata"),
        )
        self._collections[name] = collection
        return collection

    def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "Collection":
        """Return a collection, creating it when it does not exist."""

        collection_info = self._db.get_or_create_collection(name, metadata)

        if name in self._collections:
            return self._collections[name]

        from skypydb.api.collection import Collection

        collection = Collection(
            db=self._db,
            name=name,
            metadata=collection_info.get("metadata"),
        )
        self._collections[name] = collection
        return collection
