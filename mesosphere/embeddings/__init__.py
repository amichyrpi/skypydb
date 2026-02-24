"""Embeddings module."""

from mesosphere.embeddings.ollama import OllamaEmbedding
from mesosphere.embeddings.openai import OpenAIEmbedding
from mesosphere.embeddings.sentence_transformers import SentenceTransformerEmbedding
from mesosphere.embeddings.core import (
    EmbeddingCallable,
    EmbeddingsFunction,
    get_embedding_function,
)

__all__ = [
    "OllamaEmbedding",
    "OpenAIEmbedding",
    "SentenceTransformerEmbedding",
    "EmbeddingCallable",
    "EmbeddingsFunction",
    "get_embedding_function"
]
