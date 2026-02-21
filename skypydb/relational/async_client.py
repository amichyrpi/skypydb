"""Async Python client for TypeScript relational functions."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict, Optional, Sequence, Union

from skypydb.relational.client import RelationalClient


class AsyncRelationalClient:
    """Async wrapper around the synchronous `RelationalClient`."""

    def __init__(
        self,
        project_root: Optional[Union[str, Path]] = None,
        worker_path: Optional[Union[str, Path]] = None,
        worker_command: Optional[Sequence[str]] = None,
    ):
        self._client = RelationalClient(
            project_root=project_root,
            worker_path=worker_path,
            worker_command=worker_command,
        )
        self._lock = asyncio.Lock()

    async def _run(self, fn: Any, *args: Any, **kwargs: Any) -> Any:
        async with self._lock:
            return await asyncio.to_thread(fn, *args, **kwargs)

    async def callquery(
        self,
        endpoint: str,
        args: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Call a TypeScript `query` endpoint by `module.function` name."""

        return await self._run(self._client.callquery, endpoint, args)

    async def callmutation(
        self,
        endpoint: str,
        args: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Call a TypeScript `mutation` endpoint by `module.function` name."""

        return await self._run(self._client.callmutation, endpoint, args)

    async def callschemas(self, options: Optional[Dict[str, Any]] = None) -> None:
        """Apply or configure schema runtime options on the TypeScript side."""

        await self._run(self._client.callschemas, options)

    async def close(self) -> None:
        """Close the underlying worker process."""

        await self._run(self._client.close)

    async def __aenter__(self) -> "AsyncRelationalClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        await self.close()
