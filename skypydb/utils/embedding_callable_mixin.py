"""Mixin that allows embedding providers to be used as callables."""

from typing import List


class EmbeddingCallableMixin:
    def __call__(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """Make embedding providers callable for compatibility with integrations."""

        return self.embed(texts)
