"""Public API surface for synchronous vector client types."""

from skypydb.api.collection import Collection
from skypydb.api.vector_client import vecClient

__all__ = [
    "Collection",
    "vecClient",
]
