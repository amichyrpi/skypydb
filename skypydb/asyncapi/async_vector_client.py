"""Async wrapper for the synchronous Skypydb vector client."""

import asyncio
from functools import partial
from typing import Any, Callable, Dict, List, Optional, TypeVar

from skypydb.asyncapi.async_collection import AsyncCollection
from skypydb.api.vector_client import VectorClient

T = TypeVar("T")


class AsyncVectorClient:
    """Expose the `VectorClient` API as awaitable methods."""

    def __init__(
        self,
        embedding_provider: str = "ollama",
        embedding_model_config: Optional[Dict[str, Any]] = None,
    ):
        self._client = VectorClient(
            embedding_provider=embedding_provider,
            embedding_model_config=embedding_model_config,
        )
        self.path = self._client.path
        self._collections: Dict[str, AsyncCollection] = {}
        self._operation_lock = asyncio.Lock()

    async def _run_sync(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Run blocking client/database operations in a worker thread."""

        call = partial(func, *args, **kwargs)
        async with self._operation_lock:
            return await asyncio.to_thread(call)

    def _wrap_collection(self, collection: Any) -> AsyncCollection:
        """Return a cached async wrapper for the provided sync collection."""

        name = collection.name
        cached = self._collections.get(name)
        if cached is not None:
            return cached

        wrapped = AsyncCollection(client=self, collection=collection)
        self._collections[name] = wrapped
        return wrapped

    async def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        get_or_create: bool = False,
    ) -> AsyncCollection:
        """Create a collection and return an async collection wrapper."""

        collection = await self._run_sync(
            self._client.create_collection,
            name=name,
            metadata=metadata,
            get_or_create=get_or_create,
        )
        return self._wrap_collection(collection)

    async def get_collection(self, name: str) -> AsyncCollection:
        """Return an existing collection as an async wrapper."""

        collection = await self._run_sync(self._client.get_collection, name=name)
        return self._wrap_collection(collection)

    async def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncCollection:
        """Return a collection, creating it if it does not exist."""

        collection = await self._run_sync(
            self._client.get_or_create_collection,
            name=name,
            metadata=metadata,
        )
        return self._wrap_collection(collection)

    async def list_collections(self) -> List[AsyncCollection]:
        """List all collections as async wrappers."""

        collections = await self._run_sync(self._client.list_collections)
        return [self._wrap_collection(collection) for collection in collections]

    async def delete_collection(self, name: str) -> None:
        """Delete a collection and remove it from the async cache."""

        await self._run_sync(self._client.delete_collection, name=name)
        self._collections.pop(name, None)

    async def reset(self) -> bool:
        """Delete all collections and clear the async collection cache."""

        result = await self._run_sync(self._client.reset)
        self._collections.clear()
        return result

    async def heartbeat(self) -> int:
        """Return a liveness timestamp in nanoseconds."""

        return await self._run_sync(self._client.heartbeat)

    async def close(self) -> None:
        """Close the database connection and clear cached wrappers."""

        await self._run_sync(self._client.close)
        self._collections.clear()

    async def __aenter__(self) -> "AsyncVectorClient":
        """Support async context manager usage."""

        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        """Close resources when exiting async context manager scope."""

        await self.close()


# Deprecated compatibility alias. Prefer `AsyncVectorClient`.
AsyncvecClient = AsyncVectorClient
