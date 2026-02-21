"""Mixin that creates vector collections for `VectorClient`."""

from typing import Any, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from skypydb.api.collection import Collection


class CreateCollectionMixin:
    """Expose collection creation behavior on `VectorClient`."""

    def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        get_or_create: bool = False,
    ) -> "Collection":
        """Create a new collection and return a cached `Collection` wrapper."""

        if get_or_create:
            self.get_or_create_collection(name, metadata)
        else:
            self._db.create_collection(name, metadata)

        collection = self._collections.get(name)
        if collection is None:
            from skypydb.api.collection import Collection

            collection = Collection(db=self._db, name=name, metadata=metadata)
            self._collections[name] = collection
        return collection
