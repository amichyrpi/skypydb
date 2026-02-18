"""Embeddings module."""

from skypydb.embeddings.ollama import OllamaEmbedding
from skypydb.embeddings.openai import OpenAIEmbedding
from skypydb.embeddings.sentence_transformers import SentenceTransformerEmbedding
from skypydb.embeddings.mixins import (
    EmbeddingCallableMixin,
    EmbeddingsFunction,
    get_embedding_function,
)

__all__ = [
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "EmbeddingCallableMixin",
    "EmbeddingsFunction",
    "get_embedding_function"
]
