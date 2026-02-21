"""Get embedding provider factory helpers."""

from typing import List


def get_embedding(
    self,
    text: str,
) -> List[float]:
    """Get embedding for a single text."""

    embedding_impl = getattr(self, "_get_embedding", None)
    if not callable(embedding_impl):
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement `_get_embedding`."
        )
    return embedding_impl(text)