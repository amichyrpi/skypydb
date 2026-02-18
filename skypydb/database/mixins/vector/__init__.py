"""Vector database operations and mixin exports."""

from skypydb.utils.distance_metrics import (
    cosine_similarity,
    euclidean_distance,
)
from skypydb.database.mixins.vector.embedding_function import EmbeddingFunctionMixin
from skypydb.database.mixins.vector.add_items import AddItemsMixin
from skypydb.database.mixins.vector.update_items import UpdateItemsMixin
from skypydb.database.mixins.vector.query_items import QueryItemsMixin
from skypydb.database.mixins.vector.get_items import GetItemsMixin
from skypydb.database.mixins.vector.delete_items import DeleteItemsMixin
from skypydb.database.mixins.vector.collections import (
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
