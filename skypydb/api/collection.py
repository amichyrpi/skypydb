"""Collection wrapper for vector operations."""

from typing import Any, Dict, Optional, TYPE_CHECKING

from skypydb.api.mixins.vector.collection import (
    AddItemsMixin,
    CollectionInfoMixin,
    DeleteItemsMixin,
    GetItemsMixin,
    QueryItemsMixin,
    UpdateItemsMixin,
)

if TYPE_CHECKING:
    from skypydb.database.vector_db import VectorDatabase


class Collection(
    AddItemsMixin,
    GetItemsMixin,
    QueryItemsMixin,
    UpdateItemsMixin,
    DeleteItemsMixin,
    CollectionInfoMixin,
):
    """Represents a vector collection in the database."""

    def __init__(
        self,
        db: "VectorDatabase",
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Create a collection wrapper bound to a single `VectorDatabase` instance."""

        self._db = db
        self._name = name
        self._metadata = metadata or {}
