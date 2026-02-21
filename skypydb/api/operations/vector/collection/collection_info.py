"""Mixin that exposes collection metadata and helper accessors."""

from typing import Any, Dict, List


class CollectionInfoMixin:
    """Expose read-only collection metadata and helper methods."""

    @property
    def name(self) -> str:
        """Return the collection name."""

        return self._name

    @property
    def metadata(self) -> Dict[str, Any]:
        """Return collection metadata."""

        return self._metadata

    def count(self) -> int:
        """Return the number of items stored in the collection."""

        return self._db.count(self._name)

    def peek(self, limit: int = 10) -> Dict[str, List[Any]]:
        """Return a small sample of items from the collection."""

        return self.get(limit=limit)
