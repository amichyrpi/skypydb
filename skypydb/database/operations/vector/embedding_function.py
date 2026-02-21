"""Embedding function management for vector storage operations."""

from typing import Callable, List


class EmbeddingFunctionMixin:
    """Attach and replace the embedding function used by the vector backend."""

    def set_embedding_function(
        self,
        embedding_function: Callable[[List[str]], List[List[float]]],
    ) -> None:
        """Set the callable used to convert text into embedding vectors."""

        self.embedding_function = embedding_function
