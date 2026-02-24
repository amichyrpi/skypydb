"""Mesosphere HTTP SDK."""

from mesosphere.embeddings import (
    EmbeddingCallable,
    OllamaEmbedding,
    OpenAIEmbedding,
    SentenceTransformerEmbedding,
    get_embedding_function,
)
from mesosphere.errors import MesosphereError
from mesosphere.functions import api
from mesosphere.httpclient import (
    AsyncHttpClient,
    HttpRelationalClient,
    HttpClient,
    HttpTransportError,
)

__version__ = "2.0.0"

__all__ = [
    "AsyncHttpClient",
    "HttpClient",
    "HttpRelationalClient",
    "HttpTransportError",
    "MesosphereError",
    "EmbeddingCallable",
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "get_embedding_function",
    "api",
]
