"""Async wrapper for collection-level vector operations."""

from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from skypydb.asyncapi.async_vector_client import AsyncVectorClient
    from skypydb.api.collection import Collection as SyncCollection


class AsyncCollection:
    """Expose the `Collection` API as awaitable methods."""

    def __init__(self, client: "AsyncVectorClient", collection: "SyncCollection"):
        self._client = client
        self._collection = collection

    @property
    def name(self) -> str:
        """Return the collection name."""

        return self._collection.name

    @property
    def metadata(self) -> Dict[str, Any]:
        """Return collection metadata."""

        return self._collection.metadata

    async def add(
        self,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
        data: Optional[List[str]] = None,
    ) -> None:
        """Insert new items into the collection."""

        await self._client._run_sync(
            self._collection.add,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            data=data,
        )

    async def get(
        self,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, List[Any]]:
        """Get collection items by IDs or filters with optional pagination."""

        return await self._client._run_sync(
            self._collection.get,
            ids=ids,
            where=where,
            where_document=where_document,
            include=include,
            limit=limit,
            offset=offset,
        )

    async def query(
        self,
        query_embeddings: Optional[List[List[float]]] = None,
        query_texts: Optional[List[str]] = None,
        n_results: int = 10,
        number_of_results: Optional[int] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, List[List[Any]]]:
        """Run nearest-neighbor queries against the collection."""

        return await self._client._run_sync(
            self._collection.query,
            query_embeddings=query_embeddings,
            query_texts=query_texts,
            n_results=n_results,
            number_of_results=number_of_results,
            where=where,
            where_document=where_document,
            include=include,
        )

    async def update(
        self,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Update existing items by ID."""

        await self._client._run_sync(
            self._collection.update,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

    async def delete(
        self,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        by_ids: Optional[List[str]] = None,
        by_metadatas: Optional[Any] = None,
        by_data: Optional[Any] = None,
    ) -> None:
        """Delete items by IDs and/or metadata/document filters."""

        await self._client._run_sync(
            self._collection.delete,
            ids=ids,
            where=where,
            where_document=where_document,
            by_ids=by_ids,
            by_metadatas=by_metadatas,
            by_data=by_data,
        )

    async def count(self) -> int:
        """Return the number of items stored in this collection."""

        return await self._client._run_sync(self._collection.count)

    async def peek(self, limit: int = 10) -> Dict[str, List[Any]]:
        """Return up to `limit` items from this collection."""

        return await self._client._run_sync(self._collection.peek, limit=limit)
