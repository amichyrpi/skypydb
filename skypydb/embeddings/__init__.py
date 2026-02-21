"""Embeddings module."""

from skypydb.embeddings.ollama import OllamaEmbedding
from skypydb.embeddings.openai import OpenAIEmbedding
from skypydb.embeddings.sentence_transformers import SentenceTransformerEmbedding
from skypydb.embeddings.core import (
    EmbeddingCallable,
    EmbeddingCallableMixin,
    EmbeddingsFunction,
    get_embedding_function,
)

__all__ = [
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "EmbeddingCallable",
    "EmbeddingCallableMixin",
    "EmbeddingsFunction",
    "get_embedding_function"
]
