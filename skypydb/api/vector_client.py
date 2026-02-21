"""Vector client API for Skypydb."""

import os
from typing import Any, Dict, Optional

from skypydb.api.collection import Collection
from skypydb.api.operations.vector import (
    ClientUtilitiesMixin,
    CreateCollectionMixin,
    DeleteCollectionMixin,
    GetCollectionMixin,
    ListCollectionsMixin,
)
from skypydb.database.vector_database import VectorDatabase
from skypydb.embeddings import get_embedding_function


class VectorClient(
    CreateCollectionMixin,
    GetCollectionMixin,
    ListCollectionsMixin,
    DeleteCollectionMixin,
    ClientUtilitiesMixin,
):
    """High-level vector client for managing collections and vector records."""

    def __init__(
        self,
        embedding_provider: str = "ollama",
        embedding_model_config: Optional[Dict[str, Any]] = None,
    ):
        """Create a vector client backed by an on-disk SQLite database."""

        db_path = "skypydb/vector.db"
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        if embedding_model_config is not None and not isinstance(embedding_model_config, dict):
            raise TypeError("embedding_model_config must be a dictionary when provided.")

        provider = embedding_provider.lower().strip().replace("_", "-")
        model_config: Dict[str, Any] = dict(embedding_model_config or {})

        self.path = db_path
        self._embedding_function = get_embedding_function(provider=provider, **model_config)
        self._db = VectorDatabase(path=db_path, embedding_function=self._embedding_function)
        self._collections: Dict[str, Collection] = {}

    def close(self) -> None:
        """Close the database connection and clear cached collection wrappers."""

        self._db.close()
        self._collections.clear()


# Deprecated compatibility alias. Prefer `VectorClient`.
vecClient = VectorClient
