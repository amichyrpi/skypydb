"""Callable helper for embedding providers."""

from typing import List


class EmbeddingCallable:
    """Protocol-like helper that makes embedding providers callable."""

    def __call__(self, texts: List[str]) -> List[List[float]]:
        """Make embedding providers callable for compatibility with integrations."""

        return self.embed(texts)
