"""Sentence Transformers embedding functions for vector operations."""

from typing import Any, List, Optional
from skypydb.embeddings.core import EmbeddingCallable, EmbeddingsFunction


class SentenceTransformerEmbedding(EmbeddingsFunction, EmbeddingCallable):
    """Sentence Transformers embedding function."""

    def __init__(
        self,
        model: str = "all-MiniLM-L6-v2",
        device: Optional[str] = None,
        normalize_embeddings: bool = False,
        dimension: Optional[int] = None,
    ):
        """
        Initialize Sentence Transformers embedding function.

        Args:
            model: Sentence Transformers model name.
            device: Optional device override (e.g. cpu, cuda).
            normalize_embeddings: Whether to return normalized embeddings.
        """

        super().__init__(dimension=dimension)
        self.model = model
        self.device = device
        self.normalize_embeddings = normalize_embeddings

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ImportError(
                "Sentence Transformers embedding provider requires the "
                "`sentence-transformers` package. Install it with "
                "`pip install sentence-transformers[onnx]`."
            ) from exc

        try:
            self._model = SentenceTransformer(
                model_name_or_path=self.model,
                device=self.device,
                backend="onnx"
            )
        except Exception as exc:
            error_text = str(exc).lower()
            if "onnx" in error_text and "optimum" in error_text and "runtime" in error_text:
                raise ImportError(
                    "ONNX runtime backend is required for sentence-transformers. "
                    "Install with `pip install sentence-transformers[onnx]`."
                ) from exc
            raise

    @staticmethod
    def _to_list(vector: Any) -> List[float]:
        """Convert a vector to a list of floats."""

        if hasattr(vector, "tolist"):
            return list(vector.tolist())
        return list(vector)

    def embed(
        self,
        texts: List[str],
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts using Sentence Transformers."""

        if not texts:
            return []

        vectors = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=self.normalize_embeddings
        )
        embeddings = [self._to_list(vector) for vector in vectors]
        if self._dimension is None and embeddings:
            self._dimension = len(embeddings[0])
        return embeddings
