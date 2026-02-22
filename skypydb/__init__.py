"""Skypydb HTTP SDK."""

from skypydb.embeddings import (
    EmbeddingCallable,
    OllamaEmbedding,
    OpenAIEmbedding,
    SentenceTransformerEmbedding,
    get_embedding_function,
)
from skypydb.errors import SkypydbError
from skypydb.httpclient import (
    AsyncHttpClient,
    HttpRelationalClient,
    HttpClient,
    HttpTransportError,
)

__version__ = "1.0.3"

__all__ = [
    "AsyncHttpClient",
    "HttpClient",
    "HttpRelationalClient",
    "HttpTransportError",
    "SkypydbError",
    "EmbeddingCallable",
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "get_embedding_function",
]
