"""Skypydb - Open Source Vector Embedding Database for Python."""

from skypydb.api.collection import Collection
from skypydb.api.vector_client import vecClient
from skypydb.embeddings import (
    OllamaEmbedding,
    OpenAIEmbedding,
    SentenceTransformerEmbedding,
    get_embedding_function,
)
from skypydb.errors import SkypydbError
from skypydb.security import (
    InputValidator,
    sanitize_input,
    validate_column_name,
    validate_table_name,
)

__version__ = "1.0.3"

__all__ = [
    "VectorClient",
    "vecClient",
    "Collection",
    "SkypydbError",
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "get_embedding_function",
    "InputValidator",
    "sanitize_input",
    "validate_column_name",
    "validate_table_name",
]
