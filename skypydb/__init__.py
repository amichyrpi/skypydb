"""Skypydb - Open Source Vector Embedding Database for Python."""

from skypydb.asyncapi.async_collection import AsyncCollection
from skypydb.asyncapi.async_vector_client import AsyncVectorClient, AsyncvecClient
from skypydb.api.collection import Collection
from skypydb.api.vector_client import VectorClient, vecClient
from skypydb.embeddings import (
    EmbeddingCallable,
    EmbeddingCallableMixin,
    OllamaEmbedding,
    OpenAIEmbedding,
    SentenceTransformerEmbedding,
    get_embedding_function,
)
from skypydb.errors import SkypydbError
from skypydb.relational import (
    AsyncRelationalClient,
    ReactiveClient,
    RelationalClient,
)
from skypydb.security import (
    InputValidator,
    sanitize_input,
    validate_column_name,
    validate_table_name,
)

__version__ = "1.0.3"

__all__ = [
    "AsyncCollection",
    "AsyncRelationalClient",
    "AsyncVectorClient",
    "AsyncvecClient",
    "VectorClient",
    "vecClient",
    "RelationalClient",
    "ReactiveClient",
    "Collection",
    "SkypydbError",
    "EmbeddingCallable",
    "EmbeddingCallableMixin",
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "get_embedding_function",
    "InputValidator",
    "sanitize_input",
    "validate_column_name",
    "validate_table_name",
]
