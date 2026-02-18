"""Mixin that deletes vector collections for `VectorClient`."""


class DeleteCollectionMixin:
    """Expose collection deletion behavior on `VectorClient`."""

    def delete_collection(self, name: str) -> None:
        """Delete a collection and remove any cached wrapper."""

        self._db.delete_collection(name)
        if name in self._collections:
            del self._collections[name]
