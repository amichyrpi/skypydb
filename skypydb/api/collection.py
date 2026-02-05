"""
Collection class for managing vector collections.
"""

from typing import (
    Any,
    Dict,
    Optional,
    TYPE_CHECKING
)
from skypydb.api.mixins.vector.collection import (
    SysAdd,
    SysGet,
    SysQuery,
    SysUpdate,
    SysDelete,
    Utils
)

if TYPE_CHECKING:
    from skypydb.database.vector_db import VectorDatabase

class Collection(
    SysAdd,
    SysGet,
    SysQuery,
    SysUpdate,
    SysDelete,
    Utils
):
    """
    Represents a vector collection in the database.
    """

    def __init__(
        self,
        db: "VectorDatabase",
        name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize collection.

        Args:
            db: VectorDatabase instance
            name: Name of the collection
            metadata: Optional collection metadata
        """

        self._db = db
        self._name = name
        self._metadata = metadata or {}