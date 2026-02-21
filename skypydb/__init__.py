"""Skypydb HTTP SDK."""

from skypydb.embeddings import (
    EmbeddingCallable,
    EmbeddingCallableMixin,
    OllamaEmbedding,
    OpenAIEmbedding,
    SentenceTransformerEmbedding,
    get_embedding_function,
)
from skypydb.errors import SkypydbError
from skypydb.http_client import (
    AsyncHttpClient,
    AsynchttpClient,
    HttpClient,
    HttpTransportError,
    httpClient,
)
from skypydb.security import (
    InputValidator,
    sanitize_input,
    validate_column_name,
    validate_table_name,
)

__version__ = "1.0.3"

__all__ = [
    "AsyncHttpClient",
    "AsynchttpClient",
    "HttpClient",
    "HttpTransportError",
    "httpClient",
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
