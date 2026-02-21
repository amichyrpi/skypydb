"""Mixin that lists vector collections for `VectorClient`."""

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from skypydb.api.collection import Collection


class ListCollectionsMixin:
    """Expose collection listing behavior on `VectorClient`."""

    def list_collections(self) -> List["Collection"]:
        """Return all available collections as cached wrappers."""

        collections = []
        for collection_info in self._db.list_collections():
            name = collection_info["name"]
            if name in self._collections:
                collections.append(self._collections[name])
                continue

            from skypydb.api.collection import Collection

            collection = Collection(
                db=self._db,
                name=name,
                metadata=collection_info.get("metadata"),
            )
            self._collections[name] = collection
            collections.append(collection)
        return collections
