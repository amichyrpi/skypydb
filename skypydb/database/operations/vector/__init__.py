"""Vector database operations and mixin exports."""

from skypydb.utils.distance_metrics import (
    cosine_similarity,
    euclidean_distance,
)
from skypydb.database.operations.vector.embedding_function import EmbeddingFunctionMixin
from skypydb.database.operations.vector.add_items import AddItemsMixin
from skypydb.database.operations.vector.update_items import UpdateItemsMixin
from skypydb.database.operations.vector.query_items import QueryItemsMixin
from skypydb.database.operations.vector.get_items import GetItemsMixin
from skypydb.database.operations.vector.delete_items import DeleteItemsMixin
from skypydb.database.operations.vector.collections import (
    CollectionAuditMixin,
    CreateCollectionMixin,
    GetCollectionMixin,
    CountItemsMixin,
    DeleteCollectionMixin,
)

__all__ = [
    "cosine_similarity",
    "euclidean_distance",
    "EmbeddingFunctionMixin",
    "AddItemsMixin",
    "UpdateItemsMixin",
    "QueryItemsMixin",
    "GetItemsMixin",
    "DeleteItemsMixin",
    "CollectionAuditMixin",
    "CreateCollectionMixin",
    "GetCollectionMixin",
    "CountItemsMixin",
    "DeleteCollectionMixin",
]
