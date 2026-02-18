"""Mixin that gets records from a vector collection."""

from typing import Any, Dict, List, Optional


class GetItemsMixin:
    """Expose get behavior on a `Collection` wrapper."""

    def get(
        self,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, List[Any]]:
        """Get collection items by IDs or filters with optional pagination."""

        results = self._db.get(
            collection_name=self._name,
            ids=ids,
            where=where,
            where_document=where_document,
            include=include,
        )

        if offset is not None or limit is not None:
            start = offset or 0
            end = (start + limit) if limit else None

            results["ids"] = results["ids"][start:end]
            if results.get("embeddings") is not None:
                results["embeddings"] = results["embeddings"][start:end]
            if results.get("documents") is not None:
                results["documents"] = results["documents"][start:end]
            if results.get("metadatas") is not None:
                results["metadatas"] = results["metadatas"][start:end]
        return results
