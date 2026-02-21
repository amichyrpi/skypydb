"""Mixin that performs vector similarity queries on a collection."""

from typing import Any, Dict, List, Optional


class QueryItemsMixin:
    """Expose query behavior on a `Collection` wrapper."""

    def query(
        self,
        query_embeddings: Optional[List[List[float]]] = None,
        query_texts: Optional[List[str]] = None,
        n_results: int = 10,
        number_of_results: Optional[int] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, List[List[Any]]]:
        """Return nearest-neighbor results for each query vector or text."""

        if number_of_results is not None:
            n_results = number_of_results

        return self._db.query(
            collection_name=self._name,
            query_embeddings=query_embeddings,
            query_texts=query_texts,
            n_results=n_results,
            where=where,
            where_document=where_document,
            include=include,
        )
