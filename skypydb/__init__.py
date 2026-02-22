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
]
